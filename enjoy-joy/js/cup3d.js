/* =========================================================
   cup3d.js — "photo-3D" açaí cup. Plain WebGL, no libraries.

   The idea: a takeaway cup is (almost) a solid of revolution, so a
   single front-on product photo carries nearly all the information
   needed to wrap it around real geometry.

   1. BODY   A lathe mesh built from the photo's measured silhouette
             (radius per pixel row). Each fragment projects back into
             the photo: u = cx + r·sin(θ·k). The back half re-uses the
             front (like a cup printed on both sides) and the two
             samples cross-fade at the sides to hide the seam.
   2. TOP    A heaped dome textured with an overhead photo of the
             toppings. The image's brightness doubles as a height map,
             so kiwi, banana and granola physically stand off the
             açaí and catch the light as the cup turns.
   3. LIGHT  The photos are already lit, so the shader adds only what
             a photo can't: view-dependent plastic glare, a soft
             Fresnel edge and a yellow brand back-light.
   Bonus:    the açaí can be re-tinted live (cupuaçu / banana bases)
             without touching the printed label.

   API
     const cup = Cup3D.create(canvas, { scale, base, startAngle, zoom })
     cup.set({ scale: 0.85, base: 'acai' | 'banana' | 'cupuacu' })
     cup.spin(velocity)
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------- photo calibration (measured from assets/cup-front.webp) ---------- */
  const PHOTO = {
    w: 788, h: 1200, cx: 395.5,
    rimY: 250,             // pixel row of the rim
    labelY: [505, 885],    // printed band: never re-tinted
    // [pixel row, radius px] down the silhouette (smoothed in buildBody)
    profile: [[250, 362], [275, 352], [305, 343], [335, 341], [365, 331], [395, 328], [425, 318], [455, 314], [485, 311],
      [515, 310], [545, 306], [575, 303], [605, 300], [635, 297], [665, 294], [695, 291], [725, 288], [755, 284], [785, 281],
      [815, 279], [845, 276], [875, 272], [905, 268], [935, 266], [965, 263], [995, 260], [1025, 254], [1055, 250],
      [1085, 244], [1115, 239], [1135, 234], [1150, 224], [1160, 205]]
  };
  const PX = 1 / 400;                         // world units per photo pixel
  const yWorld = py => (1160 - py) * PX;      // bottom of the cup sits on y = 0

  const TINTS = {                             // açaí re-colouring per base
    acai: { c: [0, 0, 0], a: 0 },
    banana: { c: [0.62, 0.38, 0.62], a: 0.45 },
    cupuacu: { c: [0.93, 0.82, 0.62], a: 0.9 }
  };

  /* ---------- math ---------- */
  const M = {
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      return o;
    },
    persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]); },
    lookAt(e, c, u) {
      const z = norm(sub(e, c)), x = norm(cross(u, z)), y = cross(z, x);
      return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]);
    },
    // model = T(0,bob,0) · Rx(tilt) · Ry(spin) · S(scale)
    model(spin, tilt, s, bob) {
      const cy = Math.cos(spin), sy = Math.sin(spin), cx = Math.cos(tilt), sx = Math.sin(tilt);
      const Ry = [cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1];
      const Rx = [1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1];
      const m = M.mul(Rx, Ry);
      for (let i = 0; i < 12; i++) m[i] *= s;
      m[13] = bob; return m;
    }
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  /* ---------- shaders ---------- */
  const VS = `
    attribute vec3 aP; attribute vec3 aN; attribute vec2 aD;   // aD = (radius px, photo row) or (u,v)
    uniform mat4 uVP, uM;
    varying vec3 vL, vW, vN; varying vec2 vD;
    void main(){
      vL = aP; vD = aD;
      vec4 w = uM * vec4(aP, 1.0); vW = w.xyz;
      vN = mat3(uM) * aN;                                       // uniform scale only → fine
      gl_Position = uVP * w;
    }`;

  // shared lighting + tint helpers
  const FS_COMMON = `
    precision highp float;
    uniform vec3 uCam, uTint; uniform float uTintAmt;
    varying vec3 vL, vW, vN; varying vec2 vD;
    float lum(vec3 c){ return dot(c, vec3(.299,.587,.114)); }
    // açaí-purple mask: blue & red above green, and fairly dark
    float purple(vec3 c){ return clamp((min(c.r, c.b) - c.g) * 5.0, 0., 1.) * (1. - smoothstep(.32, .55, lum(c))); }
    vec3 retint(vec3 c, float allow){
      float m = purple(c) * uTintAmt * allow;
      return mix(c, uTint * (.45 + lum(c) * 1.9), m);
    }
    vec3 light(vec3 base, vec3 N, float gloss, float glare){
      vec3 V = normalize(uCam - vW);
      vec3 L = normalize(vec3(-.45, .55, .7));                 // key (soft-box front-left)
      vec3 B = normalize(vec3(.8, .25, -.6));                  // yellow back-light
      float wrap = .86 + .22 * max(dot(N, L), 0.);             // photo is pre-lit: only nudge
      vec3 col = base * wrap;
      float sp = pow(max(dot(N, normalize(L + V)), 0.), gloss) * glare;
      float fr = pow(1. - max(dot(N, V), 0.), 2.5);
      col += sp * vec3(1.);
      col += fr * .35 * vec3(1., .78, .17) * max(dot(N, B) + .4, 0.);
      col *= 1. - fr * .25;                                    // gentle edge falloff
      return col;
    }`;

  const FS_BODY = FS_COMMON + `
    uniform sampler2D uTex; uniform vec3 uPhoto;               // (cx, w, h)
    uniform vec2 uLabel;                                       // label rows in px
    const float K = .86;                                       // keep away from silhouette pixels
    vec3 sampleAt(float ang){
      float u = (uPhoto.x + vD.x * sin(ang * K)) / uPhoto.y;
      return texture2D(uTex, vec2(u, vD.y / uPhoto.z)).rgb;
    }
    void main(){
      float ang = atan(vL.x, vL.z);                            // 0 = facing the camera
      float back = ang > 0. ? ang - 3.14159265 : ang + 3.14159265;
      float w = smoothstep(-.24, .24, cos(ang));               // cross-fade at the sides
      vec3 c = mix(sampleAt(back), sampleAt(ang), w);
      float onLabel = step(uLabel.x, vD.y) * step(vD.y, uLabel.y);
      c = retint(c, 1. - onLabel);
      vec3 N = normalize(vN);
      // a long vertical glare stripe sells the clear plastic
      vec3 col = light(c, N, 70., .55);
      gl_FragColor = vec4(col, 1.);
    }`;

  const FS_TOP = FS_COMMON + `
    uniform sampler2D uTex;
    void main(){
      vec3 c = retint(texture2D(uTex, vD).rgb, 1.);
      vec3 N = normalize(vN);
      gl_FragColor = vec4(light(c, N, 40., .35), 1.);
    }`;

  const FS_FLAT = FS_COMMON + `
    uniform vec4 uColor;
    void main(){
      vec3 N = normalize(vN);
      vec3 col = light(uColor.rgb, N, 90., .9);
      gl_FragColor = vec4(col * uColor.a, uColor.a);           // premultiplied
    }`;

  /* ---------- geometry ---------- */
  // smooth the measured silhouette, then revolve it
  function buildBody(seg = 128) {
    const raw = PHOTO.profile, prof = raw.map((p, i) => {
      if (i < 2 || i > raw.length - 4) return p;               // keep rim + rounded base exact
      return [p[0], (raw[i - 1][1] + p[1] * 2 + raw[i + 1][1]) / 4];
    });
    const P = [], N = [], D = [], I = [], n = prof.length;
    for (let i = 0; i < n; i++) {
      const [py, rpx] = prof[i], a = prof[Math.max(i - 1, 0)], b = prof[Math.min(i + 1, n - 1)];
      const dr = (b[1] - a[1]) * PX, dy = yWorld(b[0]) - yWorld(a[0]);
      let nr = -dy, ny = dr; const l = Math.hypot(nr, ny) || 1; nr /= l; ny /= l;   // outward
      for (let j = 0; j <= seg; j++) {
        const t = j / seg * Math.PI * 2, s = Math.sin(t), c = Math.cos(t), r = rpx * PX;
        P.push(r * s, yWorld(py), r * c); N.push(nr * s, ny, nr * c); D.push(rpx, py);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j, b = a + seg + 1; I.push(a, b, a + 1, b, b + 1, a + 1);
    }
    return { P, N, D, I };
  }

  // heaped topping dome; height = mound + brightness of the overhead photo
  function buildTop(heightMap, rings = 56, seg = 140) {
    const R = (PHOTO.profile[0][1] - 14) * PX, y0 = yWorld(PHOTO.rimY) - .03, H = .3, BUMP = .075;
    const h = (x, z) => {
      const d2 = Math.min(1, (x * x + z * z) / (R * R));
      const u = .5 + x / (2 * R) * .96, v = .5 + z / (2 * R) * .96;
      return y0 + H * Math.pow(1 - d2, .6) + BUMP * heightMap(u, v) * (1 - d2 * d2);
    };
    const P = [], N = [], D = [], I = [], e = .006;
    for (let k = 0; k <= rings; k++) {
      const d = R * k / rings;
      for (let j = 0; j <= seg; j++) {
        const t = j / seg * Math.PI * 2, x = d * Math.sin(t), z = d * Math.cos(t);
        const nx = -(h(x + e, z) - h(x - e, z)) / (2 * e), nz = -(h(x, z + e) - h(x, z - e)) / (2 * e);
        const nn = norm([nx, 1, nz]);
        P.push(x, h(x, z), z); N.push(nn[0], nn[1], nn[2]);
        D.push(.5 + x / (2 * R) * .96, .5 + z / (2 * R) * .96);
      }
    }
    for (let k = 0; k < rings; k++) for (let j = 0; j < seg; j++) {
      const a = k * (seg + 1) + j, b = a + seg + 1; I.push(a, a + 1, b, b, a + 1, b + 1);
    }
    return { P, N, D, I };
  }

  function buildTorus(R, r, y, seg = 128, tube = 12) {
    const P = [], N = [], D = [], I = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg * Math.PI * 2;
      for (let j = 0; j <= tube; j++) {
        const v = j / tube * Math.PI * 2, cv = Math.cos(v);
        P.push((R + r * cv) * Math.sin(u), y + r * Math.sin(v), (R + r * cv) * Math.cos(u));
        N.push(cv * Math.sin(u), Math.sin(v), cv * Math.cos(u)); D.push(0, 0);
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < tube; j++) {
      const a = i * (tube + 1) + j, b = a + tube + 1; I.push(a, b, a + 1, b, b + 1, a + 1);
    }
    return { P, N, D, I };
  }

  /* ---------- image loading (shared by every cup on the page) ---------- */
  let assets = null;
  function loadAssets() {
    if (assets) return assets;
    const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const T = global.CUP_TEXTURES || {};
    assets = Promise.all([load(T.front), load(T.top)]).then(([front, top]) => {
      // read the overhead photo once on the CPU as a height map
      const c = document.createElement('canvas'), S = 256; c.width = c.height = S;
      const x = c.getContext('2d'); x.drawImage(top, 0, 0, S, S);
      const px = x.getImageData(0, 0, S, S).data;
      const heightMap = (u, v) => {
        const i = (Math.min(S - 1, Math.max(0, v * S | 0)) * S + Math.min(S - 1, Math.max(0, u * S | 0))) * 4;
        const l = (px[i] * .299 + px[i + 1] * .587 + px[i + 2] * .114) / 255;
        return Math.max(0, l - .22) / .78;                     // dark açaí = valleys, fruit = peaks
      };
      return { front, top, body: buildBody(), dome: buildTop(heightMap), rim: buildTorus((PHOTO.profile[0][1] - 4) * PX, .022, yWorld(PHOTO.rimY)) };
    });
    return assets;
  }

  /* ---------- renderer ---------- */
  function create(canvas, opts = {}) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl || !global.CUP_TEXTURES) return null;

    const progs = { body: link(gl, VS, FS_BODY), top: link(gl, VS, FS_TOP), flat: link(gl, VS, FS_FLAT) };
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    let state = { scale: opts.scale || 1, base: opts.base || 'acai' };
    let shown = state.scale, tint = { c: [0, 0, 0], a: 0 }, ready = false, meshes = {}, tex = {};
    let fade = 0;                                              // fade-in once textures load

    loadAssets().then(A => {
      const up = g => ({
        p: buf(gl, new Float32Array(g.P)), n: buf(gl, new Float32Array(g.N)), d: buf(gl, new Float32Array(g.D)),
        i: buf(gl, new Uint16Array(g.I), gl.ELEMENT_ARRAY_BUFFER), count: g.I.length
      });
      meshes = { body: up(A.body), dome: up(A.dome), rim: up(A.rim) };
      tex.front = texture(gl, A.front); tex.top = texture(gl, A.top);
      ready = true; canvas.classList.add('is-ready');
    }).catch(err => console.warn('cup textures failed', err));

    /* interaction: drag to spin (with inertia), slight tilt */
    let spin = opts.startAngle || 0, vel = 0, dragging = false, lx = 0, ly = 0, tiltT = 0, tilt = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const auto = opts.autoRotate === false || reduced ? 0 : .42;
    canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      vel = (e.clientX - lx) * .011; spin += vel;
      tiltT = Math.max(-.22, Math.min(.22, tiltT + (e.clientY - ly) * .003));
      lx = e.clientX; ly = e.clientY;
    });
    const end = () => { dragging = false; tiltT = 0; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

    let visible = true, last = performance.now(), t0 = last;
    if ('IntersectionObserver' in global) new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting)).observe(canvas);

    function draw(prog, mesh, uniforms) {
      gl.useProgram(prog);
      const L = prog.loc;
      for (const k in uniforms) {
        const v = uniforms[k], l = L(k); if (l === null) continue;
        if (k === 'uTex') { gl.uniform1i(l, v); continue; }        // samplers take ints
        if (v instanceof Float32Array && v.length === 16) gl.uniformMatrix4fv(l, false, v);
        else if (typeof v === 'number') gl.uniform1f(l, v);
        else if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v);
      }
      [['aP', mesh.p, 3], ['aN', mesh.n, 3], ['aD', mesh.d, 2]].forEach(([n, b, s]) => {
        const a = gl.getAttribLocation(prog, n); if (a < 0) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, s, gl.FLOAT, false, 0, 0);
      });
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.i);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    }

    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (!ready) return;

      if (!dragging) { vel *= .94; spin += vel + auto * dt; }
      tilt += (tiltT - tilt) * .1;
      shown += (state.scale - shown) * Math.min(1, dt * 7);          // springy size change
      const T = TINTS[state.base];
      tint.a += (T.a - tint.a) * Math.min(1, dt * 4);
      tint.c = tint.c.map((v, i) => v + ((T.a ? T.c[i] : tint.c[i]) - v) * Math.min(1, dt * 4));
      fade = Math.min(1, fade + dt * 2.5);

      // camera: slightly above, framing the full cup + heaped top
      const asp = W / Math.max(H, 1), top = 2.7, fov = 30 * Math.PI / 180;
      const fit = Math.max(top / (2 * Math.tan(fov / 2)), 2.0 / (2 * Math.tan(fov / 2) * asp)) * 1.12 * (opts.zoom || 1);
      const pitch = .3, tgt = [0, top * .47, 0];
      const eye = [0, tgt[1] + Math.sin(pitch) * fit, Math.cos(pitch) * fit];
      const VP = M.mul(M.persp(fov, asp, .1, 40), M.lookAt(eye, tgt, [0, 1, 0]));
      const bob = Math.sin((now - t0) / 1100) * .035;
      const s = shown * (.85 + .15 * easeOut(fade));
      const Mm = M.model(spin, .06 + tilt, s, bob);
      const common = { uVP: VP, uM: Mm, uCam: eye, uTint: tint.c, uTintAmt: tint.a };

      gl.depthMask(true);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex.front);
      draw(progs.body, meshes.body, Object.assign({ uTex: 0, uPhoto: [PHOTO.cx, PHOTO.w, PHOTO.h], uLabel: PHOTO.labelY }, common));
      gl.bindTexture(gl.TEXTURE_2D, tex.top);
      draw(progs.top, meshes.dome, Object.assign({ uTex: 0 }, common));
      gl.depthMask(false);                                             // translucent rolled rim
      draw(progs.flat, meshes.rim, Object.assign({ uColor: [1, 1, 1, .55] }, common));
      gl.depthMask(true);
    }
    requestAnimationFrame(frame);

    return {
      set(next) { Object.assign(state, next); },
      spin(v) { vel += v; }
    };
  }
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function buf(gl, data, type = gl.ARRAY_BUFFER) { const b = gl.createBuffer(); gl.bindBuffer(type, b); gl.bufferData(type, data, gl.STATIC_DRAW); return b; }
  function texture(gl, img) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    // NPOT-safe sampling (WebGL1): clamp + no mipmaps
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function link(gl, vs, fs) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const cache = {}; p.loc = n => (n in cache ? cache[n] : (cache[n] = gl.getUniformLocation(p, n)));
    return p;
  }

  global.Cup3D = { create };
})(window);

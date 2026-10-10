/* =========================================================
   can3d.js: a tiny WebGL renderer for one 500 ml can.
   No libraries. What it does:
     • builds a lathe mesh from a measured can profile (foot, body, neck, rim, lid)
     • wraps the label canvas from flavours.js around the body
     • shades the aluminium with a fake "studio" environment (two strip
       lights and a softbox), plus a rim light in the flavour's accent colour
   Public API:
     const can = new Can3D(canvas, { interactive: true })
     can.setFlavour(labelCanvas, '#95D600')
     can.charge = 0..1   → shakes and spins faster while charging
     can.pop()           → a quick squash and stretch when the can is cracked
     Can3D.snapshot(labelCanvas, accent, w, h) → dataURL (used by the lineup)
   ========================================================= */
(function () {
  'use strict';

  // ---- can profile: [radius, height] from the bottom centre round to the lid centre.
  // Proportions of a 500 ml tall can (66 mm wide, 168 mm tall) at 1 unit = 100 mm.
  const PROFILE = [
    [0.000, 0.045], [0.150, 0.030], [0.240, 0.008], [0.265, 0.000],   // domed base + foot
    [0.292, 0.006], [0.316, 0.034], [0.330, 0.080],                   // shoulder into the body
    [0.330, 0.600], [0.330, 1.000], [0.330, 1.470],                   // body (extra rows for smooth light)
    [0.325, 1.500], [0.300, 1.565], [0.276, 1.615], [0.270, 1.640],   // neck
    [0.276, 1.655], [0.273, 1.670], [0.262, 1.673], [0.257, 1.656],   // rolled rim
    [0.254, 1.646], [0.120, 1.648], [0.000, 1.648]                    // lid
  ];
  const LABEL_Y0 = 0.10, LABEL_Y1 = 1.46;     // printed area
  const MID = 0.836;                           // half height, used to centre the can
  const SEG = 128;                             // segments around the can

  const VERT = `
    attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUV;
    uniform mat4 uModel, uView, uProj;
    varying vec3 vN; varying vec3 vP; varying vec2 vUV; varying vec3 vL;
    void main(){
      vL = aPos;
      vec4 wp = uView * uModel * vec4(aPos, 1.0);
      vP = wp.xyz;
      vN = mat3(uView * uModel) * aNor;
      vUV = aUV;
      gl_Position = uProj * wp;
    }`;

  const FRAG = `
    precision highp float;
    varying vec3 vN; varying vec3 vP; varying vec2 vUV; varying vec3 vL;
    uniform sampler2D uTex; uniform vec3 uAccent; uniform float uGlow;
    uniform float uPhoto;     // 1 = texture is a front-on product photo, 0 = a wrap-around label
    uniform vec4 uBox;        // photo: can's left, top, width, height inside the image (0–1)
    // Fake studio: two tall strip lights left/right and a softbox above.
    float env(vec3 r){
      float right = smoothstep(.16, .0, abs(r.x - .55)) * smoothstep(-.6, .2, r.y);
      float left  = smoothstep(.10, .0, abs(r.x + .78)) * .55;
      float top   = smoothstep(.35, .95, r.y) * .7;
      return .04 + right * 1.6 + left + top;
    }
    void main(){
      vec3 N = normalize(vN); vec3 V = normalize(-vP);
      vec3 R = reflect(-V, N);
      vec3 L = normalize(vec3(.45, .55, .85));
      float diff = max(dot(N, L), 0.0);
      float spec = pow(max(dot(N, normalize(L + V)), 0.0), 70.0);
      float e = env(R);
      vec3 col;
      // PHOTO MODE: project the product photo straight onto the can from the front.
      // The back gets the same photo mirrored, so it reads correctly from behind;
      // the two halves meet at the sides (the idle sway keeps that seam out of view).
      vec4 ph = vec4(0.0);
      if (uPhoto > .5) {
        float sx = vL.z >= 0.0 ? vL.x : -vL.x;
        vec2 puv = vec2(uBox.x + (.5 + .93 * sx / ${(2 * 0.33).toFixed(2)}) * uBox.z,   // .93 keeps samples off the soft transparent edge
                        uBox.y + (1.0 - (vL.y + ${MID.toFixed(3)}) / 1.673) * uBox.w);
        ph = texture2D(uTex, puv);
      }
      if (uPhoto > .5 && ph.a > .5) {
        // the photo already carries its own studio lighting: keep it, add only a moving glint
        vec3 c = pow(ph.rgb, vec3(2.2));
        col = c * (.92 + .18 * diff) + spec * .3 + e * .04;
      } else if (uPhoto < .5 && vUV.y > ${LABEL_Y0.toFixed(3)} && vUV.y < ${LABEL_Y1.toFixed(3)}) {
        // printed label: ink over metal, with a clear-coat sheen
        vec3 ink = texture2D(uTex, vec2(vUV.x, 1.0 - (vUV.y - ${LABEL_Y0.toFixed(3)}) / ${(LABEL_Y1 - LABEL_Y0).toFixed(3)})).rgb;
        ink = pow(ink, vec3(2.2));
        col = ink * (.22 + .9 * diff) + e * .16 * mix(vec3(1.0), ink, .35) + spec * .55;
      } else {
        // bare aluminium: almost all reflection
        vec3 al = vec3(.62, .64, .67);
        col = al * (.06 + 1.15 * e) + spec * 1.1;
      }
      // accent rim light, stronger while the can is charging
      float rim = pow(1.0 - max(dot(N, V), 0.0), 5.0);
      col += pow(uAccent, vec3(2.2)) * rim * (.45 + uGlow * 2.2);
      col = col / (1.0 + col * .25);             // soft tone map
      gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
    }`;

  // ---------- tiny mat4 helpers (column-major, like WebGL expects) ----------
  const M = {
    persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f);
      return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]; },
    mul(a, b) { const o = new Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
      return o; },
    ry(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
    rx(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
    rz(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
    tr(x, y, z) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]; },
    sc(x, y, z) { return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]; }
  };

  // ---------- lathe mesh ----------
  function buildMesh() {
    const pos = [], nor = [], uv = [], idx = [];
    const n = PROFILE.length;
    // smooth 2D normals from the neighbours' tangent: outward = (ty, -tr)
    const pn = PROFILE.map((p, i) => {
      const a = PROFILE[Math.max(0, i - 1)], b = PROFILE[Math.min(n - 1, i + 1)];
      const tr = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tr, ty) || 1;
      return [ty / l, -tr / l];
    });
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= SEG; j++) {
        const u = j / SEG, th = (u - .5) * Math.PI * 2;   // u = .5 faces the camera
        const s = Math.sin(th), c = Math.cos(th);
        const [r, y] = PROFILE[i], [nr, ny] = pn[i];
        pos.push(r * s, y - MID, r * c);
        nor.push(nr * s, ny, nr * c);
        uv.push(u, y);
      }
    }
    const row = SEG + 1;
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < SEG; j++) {
      const a = i * row + j, b = a + row;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv), idx: new Uint16Array(idx) };
  }
  const MESH = buildMesh();

  const hexToRgb = h => { const v = parseInt(h.slice(1), 16); return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255]; };

  class Can3D {
    constructor(canvas, opts = {}) {
      this.cv = canvas;
      this.opts = opts;
      const gl = this.gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: !!opts.preserve });
      if (!gl) { this.failed = true; return; }

      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
      const p = this.prog = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(p); gl.useProgram(p);

      const buf = (data, name, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); const loc = gl.getAttribLocation(p, name);
        gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
      buf(MESH.pos, 'aPos', 3); buf(MESH.nor, 'aNor', 3); buf(MESH.uv, 'aUV', 2);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, MESH.idx, gl.STATIC_DRAW);

      this.u = {}; ['uModel', 'uView', 'uProj', 'uTex', 'uAccent', 'uGlow', 'uPhoto', 'uBox'].forEach(k => this.u[k] = gl.getUniformLocation(p, k));
      this.tex = gl.createTexture();
      gl.enable(gl.DEPTH_TEST);

      // motion state
      this.angle = 0; this.vel = 0; this.charge = 0; this.popT = 1; this.accent = [.58, .84, 0];
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (opts.interactive) this.bindDrag();
    }

    // tex: a label canvas, or an <img> of a front-on can photo (pass box = where the can sits in it)
    setFlavour(labelCanvas, accentHex, spin = true, box = null) {
      this.photo = !!box; this.box = box || [0, 0, 1, 1];
      if (this.failed) return;
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, labelCanvas);
      // texture is 2048×1408 (not power of two) → clamp + linear, no mipmaps
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.accent = hexToRgb(accentHex);
      if (spin && !this.reduced) this.vel += 7;   // a quick extra turn so a flavour change reads as "new can"
    }

    pop() { this.popT = 0; }

    bindDrag() {
      let down = false, lastX = 0, lastT = 0;
      const c = this.cv;
      c.addEventListener('pointerdown', e => { down = true; lastX = e.clientX; lastT = performance.now(); c.setPointerCapture(e.pointerId); this.dragging = true; });
      c.addEventListener('pointermove', e => {
        if (!down) return;
        const now = performance.now(), dx = e.clientX - lastX;
        this.angle += dx * .012;
        this.vel = dx * .012 / Math.max(.008, (now - lastT) / 1000);
        lastX = e.clientX; lastT = now;
      });
      const up = () => { down = false; this.dragging = false; };
      c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    }

    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(this.cv.clientWidth * dpr), h = Math.round(this.cv.clientHeight * dpr);
      if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    }

    // advance motion by dt seconds, then draw
    step(dt) {
      this.t = (this.t || 0) + dt;
      if (!this.dragging) {
        if (this.charge > .05 || Math.abs(this.vel) > 2.5) {
          // charging (or just flicked): spin, faster the more it's charged
          const idle = this.reduced ? 0 : this.charge * 9;
          this.vel += (idle - this.vel) * Math.min(1, dt * 1.6);
        } else {
          // at rest: drift back to face the viewer and sway gently either side of the front
          const TAU = Math.PI * 2;
          const target = Math.round(this.angle / TAU) * TAU + (this.reduced ? 0 : Math.sin(this.t * .7) * .3);
          this.vel += ((target - this.angle) * 3 - this.vel) * Math.min(1, dt * 3);
        }
        this.angle += this.vel * dt;
      }
      this.popT = Math.min(1, this.popT + dt * 2.2);
      this.draw();
    }

    draw(fixedAngle) {
      if (this.failed) return;
      const gl = this.gl, w = this.cv.width, h = this.cv.height;
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const asp = w / h;
      // fit the can's height (≈1.7 units) into view whatever the aspect ratio
      const dist = asp < .55 ? 3.4 / (asp / .55) : 3.4;
      const proj = M.persp(.62, asp, .1, 30);
      const view = M.mul(M.tr(0, 0, -dist), M.rx(.12));

      // shake while charging, squash & stretch on pop
      const k = this.reduced ? 0 : this.charge * this.charge * .035;
      const sx = (Math.random() - .5) * k, sy = (Math.random() - .5) * k;
      const p = this.popT, squash = this.reduced ? 1 : 1 + Math.sin(p * Math.PI) * .12 * (1 - p);
      const ang = fixedAngle ?? this.angle;
      let model = M.mul(M.tr(sx, sy, 0), M.rz(-.06));
      model = M.mul(model, M.sc(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash)));
      model = M.mul(model, M.ry(ang));

      gl.uniformMatrix4fv(this.u.uModel, false, model);
      gl.uniformMatrix4fv(this.u.uView, false, view);
      gl.uniformMatrix4fv(this.u.uProj, false, proj);
      gl.uniform3fv(this.u.uAccent, this.accent);
      gl.uniform1f(this.u.uGlow, this.charge);
      gl.uniform1f(this.u.uPhoto, this.photo ? 1 : 0);
      gl.uniform4fv(this.u.uBox, this.box || [0, 0, 1, 1]);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.uniform1i(this.u.uTex, 0);
      gl.drawElements(gl.TRIANGLES, MESH.idx.length, gl.UNSIGNED_SHORT, 0);
    }
  }

  // Render a still of any flavour (for the lineup cards), reusing one offscreen context.
  let shot;
  Can3D.snapshot = function (labelCanvas, accent, w, h, angle = -.35) {
    if (!shot) { const c = document.createElement('canvas'); shot = new Can3D(c, { preserve: true }); }
    if (shot.failed) return null;
    shot.cv.width = w; shot.cv.height = h;
    shot.setFlavour(labelCanvas, accent, false);
    shot.charge = 0; shot.popT = 1;
    shot.draw(angle);
    return shot.cv.toDataURL('image/png');
  };

  window.Can3D = Can3D;
})();

/* =========================================================
   liquid.js — glossy, slow-moving açaí "liquid" background.
   A full-screen fragment shader: domain-warped fractal noise gives
   the swirl, its gradient gives a fake surface normal, and two lights
   turn that into wet, sorbet-like highlights. Rendered at reduced
   resolution (it's soft anyway) and paused when off-screen.

   Usage: Liquid.mount(canvas, { pointer: true })
   ========================================================= */
(function (global) {
  'use strict';
  const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const FS = `
    precision highp float;
    uniform vec2 uRes, uMouse; uniform float uTime;
    // value noise + fbm
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
    }
    float fbm(vec2 p){ float v = 0., a = .5; mat2 r = mat2(.8,.6,-.6,.8); for (int i = 0; i < 4; i++){ v += a * noise(p); p = r * p * 2.02; a *= .5; } return v; }
    // the liquid surface height: two levels of domain warping
    float surf(vec2 p){
      float t = uTime * .06;
      vec2 q = vec2(fbm(p + vec2(0., t)), fbm(p + vec2(5.2, 1.3) - t));
      vec2 m = (uMouse - .5) * .6;
      vec2 r = vec2(fbm(p + 3.5 * q + vec2(1.7, 9.2) + m + t * .7), fbm(p + 3.5 * q + vec2(8.3, 2.8) - t * .5));
      return smoothstep(.15, .9, fbm(p + 2.6 * r));
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y * 1.05;      // low frequency = big, slow swirls
      float e = 6.0 / uRes.y;
      float h = surf(p), hx = surf(p + vec2(e, 0.)), hy = surf(p + vec2(0., e));
      vec3 N = normalize(vec3((h - hx) * 9., (h - hy) * 9., 1.));
      // brand ramp: plum → violet → orchid
      vec3 plum = vec3(.12, .03, .21), violet = vec3(.40, .12, .66), orchid = vec3(.66, .36, .92);
      vec3 col = mix(plum, violet, smoothstep(.25, .62, h));
      col = mix(col, orchid, smoothstep(.62, .85, h) * .7);
      vec3 V = vec3(0., 0., 1.);
      vec3 L1 = normalize(vec3(-.5, .6, .8)), L2 = normalize(vec3(.7, -.3, .6));
      float spec = pow(max(dot(N, normalize(L1 + V)), 0.), 28.);
      float spec2 = pow(max(dot(N, normalize(L2 + V)), 0.), 30.);
      col += spec * vec3(1., .95, 1.) * .42 + spec2 * vec3(1., .78, .17) * .16;  // white gloss + yellow kiss
      col *= .78 + .22 * max(dot(N, L1), 0.);
      // soft orchid glow behind the cup so the product pops
      col += orchid * .22 * exp(-dot(uv - vec2(.7, .5), uv - vec2(.7, .5)) * 7.);
      // vignette keeps edges deep so type stays readable
      col *= mix(.55, 1.05, smoothstep(1.25, .25, length(uv - vec2(.62, .5))));
      gl_FragColor = vec4(col, 1.);
    }`;

  function mount(canvas, opts = {}) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) { canvas.classList.add('is-fallback'); return null; }
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(pr, 'uRes'), uTime = gl.getUniformLocation(pr, 'uTime'), uMouse = gl.getUniformLocation(pr, 'uMouse');

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let mouse = [.5, .5], target = [.5, .5], visible = true, t0 = performance.now();
    if (opts.pointer) addEventListener('pointermove', e => { target = [e.clientX / innerWidth, 1 - e.clientY / innerHeight]; }, { passive: true });
    if ('IntersectionObserver' in global) new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting)).observe(canvas);

    const SCALE = .5;                                          // half-res: it's soft anyway
    function frame(now) {
      if (!reduced) requestAnimationFrame(frame);
      if (!visible && !reduced) return;
      const W = Math.max(1, Math.round(canvas.clientWidth * SCALE)), H = Math.max(1, Math.round(canvas.clientHeight * SCALE));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      mouse = mouse.map((v, i) => v + (target[i] - v) * .03);
      gl.viewport(0, 0, W, H);
      gl.uniform2f(uRes, W, H); gl.uniform2f(uMouse, mouse[0], mouse[1]);
      gl.uniform1f(uTime, (now - t0) / 1000 + 40.);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
    if (reduced) addEventListener('resize', () => requestAnimationFrame(frame));
    return true;
  }
  global.Liquid = { mount };
})(window);

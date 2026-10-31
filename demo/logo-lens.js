// ------------- LOGO LENS ------------- //

import * as THREE from 'three';

(function () {
  var D = document.documentElement;
  if (D.classList.contains('w-editor')) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var P = window.logoLens = { radius: 0.17, amount: 0.32, follow: 7, ease: 6, pad: 0.3 };

  var hero = document.querySelector('.page-wrap > .hero') || document.querySelector('.hero');
  var title = hero && hero.querySelector('.hero-title');
  var svgs = title ? [].slice.call(title.querySelectorAll('.hero-letter .title-letter')) : [];
  if (!hero || !title || !svgs.length) return;

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;pointer-events:none;z-index:3;opacity:0;display:block';
  var renderer, scene, cam, quad, mat, maskTex;
  var ready = false, building = false, active = false, rafId = 0, lastT = 0;
  var box = { x: 0, y: 0, w: 0, h: 0, left: 0, top: 0 };
  var mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 }, amt = 0, target = 0;

  var VERT = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  var FRAG = 'varying vec2 vUv;uniform sampler2D uMask;uniform vec2 uMouse;uniform vec2 uSize;uniform float uRad;uniform float uAmt;' +
    'void main(){vec2 d=(vUv-uMouse)*uSize;float c=smoothstep(uRad,0.,length(d));c=c*c*(3.-2.*c);vec2 uv=mix(vUv,uMouse,c*uAmt);float a=texture2D(uMask,uv).a;gl_FragColor=vec4(vec3(a),a);}';

  function measure() {
    var hr = hero.getBoundingClientRect(), tr = title.getBoundingClientRect();
    var pad = tr.height * P.pad;
    box.x = tr.left - hr.left - pad; box.y = tr.top - hr.top - pad;
    box.w = tr.width + pad * 2; box.h = tr.height + pad * 2;
    box.left = tr.left - pad; box.top = tr.top - pad;
  }

  function place() {
    measure();
    canvas.style.left = box.x + 'px'; canvas.style.top = box.y + 'px'; canvas.style.width = box.w + 'px'; canvas.style.height = box.h + 'px';
  }

  function drawMask() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var c = document.createElement('canvas');
    c.width = Math.round(box.w * dpr); c.height = Math.round(box.h * dpr);
    var ctx = c.getContext('2d');
    var jobs = svgs.map(function (s) {
      var r = s.getBoundingClientRect();
      var clone = s.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', r.width); clone.setAttribute('height', r.height);
      clone.setAttribute('fill', '#fff'); clone.removeAttribute('style');
      var url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
      return new Promise(function (res) {
        var im = new Image();
        im.onload = function () { ctx.drawImage(im, (r.left - box.left) * dpr, (r.top - box.top) * dpr, r.width * dpr, r.height * dpr); URL.revokeObjectURL(url); res(); };
        im.onerror = function () { URL.revokeObjectURL(url); res(); };
        im.src = url;
      });
    });
    return Promise.all(jobs).then(function () {
      if (maskTex) maskTex.dispose();
      maskTex = new THREE.CanvasTexture(c);
      maskTex.colorSpace = THREE.NoColorSpace; maskTex.minFilter = THREE.LinearFilter; maskTex.generateMipmaps = false; maskTex.needsUpdate = true;
    });
  }

  function build() {
    if (building) return;
    building = true;
    place();
    drawMask().then(function () {
      if (!renderer) {
        try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' }); }
        catch (e) { building = false; return; }
        renderer.setClearColor(0x000000, 0);
        scene = new THREE.Scene(); cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        mat = new THREE.ShaderMaterial({
          vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
          uniforms: { uMask: { value: null }, uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uSize: { value: new THREE.Vector2(1, 1) }, uRad: { value: 100 }, uAmt: { value: 0 } }
        });
        quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); scene.add(quad);
      }
      mat.uniforms.uMask.value = maskTex;
      mat.uniforms.uSize.value.set(box.w, box.h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(box.w, box.h, false);
      if (!canvas.parentNode) hero.appendChild(canvas);
      ready = true; building = false;
    });
  }

  function frame(now) {
    rafId = 0;
    if (!active) return;
    var dt = Math.min((now - (lastT || now)) / 1000, 1 / 30) || 1 / 60; lastT = now;
    var k = 1 - Math.exp(-P.follow * dt), ka = 1 - Math.exp(-P.ease * dt);
    mouse.x += (mouse.tx - mouse.x) * k; mouse.y += (mouse.ty - mouse.y) * k;
    amt += (target - amt) * ka;
    var u = mat.uniforms;
    u.uMouse.value.set(mouse.x, mouse.y); u.uAmt.value = amt; u.uRad.value = P.radius * innerHeight;
    renderer.render(scene, cam);
    if (target === 0 && amt < 0.003) { deactivate(); return; }
    rafId = requestAnimationFrame(frame);
  }

  function activate() {
    if (active) return;
    place();
    mouse.x = mouse.tx; mouse.y = mouse.ty; amt = 0;
    active = true; lastT = 0;
    canvas.style.opacity = 1;
    svgs.forEach(function (s) { s.style.visibility = 'hidden'; });
    rafId = requestAnimationFrame(frame);
  }

  function deactivate() {
    active = false;
    if (rafId) cancelAnimationFrame(rafId); rafId = 0;
    canvas.style.opacity = 0;
    svgs.forEach(function (s) { s.style.visibility = ''; });
    amt = 0;
  }

  addEventListener('pointermove', function (e) {
    if (!ready || e.pointerType !== 'mouse') return;
    if (document.querySelector('.pm.is-open')) { target = 0; return; }
    var tr = title.getBoundingClientRect();
    var inside = e.clientX >= tr.left && e.clientX <= tr.right && e.clientY >= tr.top && e.clientY <= tr.bottom;
    if (!inside) { target = 0; return; }
    if (!active) { measure(); }
    mouse.tx = (e.clientX - box.left) / box.w; mouse.ty = 1 - (e.clientY - box.top) / box.h;
    target = P.amount;
    if (!active) activate();
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', function () { target = 0; });
  document.addEventListener('visibilitychange', function () { if (document.hidden && active) deactivate(); });

  var rz;
  addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () { if (!ready) return; if (active) deactivate(); ready = false; build(); }, 200);
  });

  var tries = 0;
  (function wait() {
    var g = window.gsap, mt = hero.querySelector('.main-top');
    var settled = !D.classList.contains('osply-boot') && g && mt && Math.abs(g.getProperty(mt, 'y')) < 0.5 && svgs.every(function (s) { return g.getProperty(s, 'yPercent') === 0 && g.getProperty(s, 'rotationX') === 0; });
    if (settled) { setTimeout(build, 600); return; }
    if (tries++ < 300) setTimeout(wait, 100);
  })();
})();

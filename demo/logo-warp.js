// ------------- LOGO WARP ------------- //

import * as THREE from 'three';

(function () {
  var D = document.documentElement;
  if (D.classList.contains('w-editor')) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var P = window.logoWarp = {
    simHeight: 96, pad: 0.3, splatRadius: 0.4, force: 3500, curl: 3, refraction: 0.3,
    velocityFade: 2.5, pressure: 0.8, iterations: 20, idle: 2.2
  };

  var hero = document.querySelector('.page-wrap > .hero') || document.querySelector('.hero');
  var title = hero && hero.querySelector('.hero-title');
  var svgs = title ? [].slice.call(title.querySelectorAll('.hero-letter .title-letter')) : [];
  if (!hero || !title || !svgs.length) return;

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;pointer-events:none;z-index:3;opacity:0;display:block';
  var renderer, ready = false, building = false, active = false, rafId = 0, idleAt = 0;
  var box = { x: 0, y: 0, w: 0, h: 0 }, simW = 0, simH = 0;
  var maskTex, velocity, pressure, divergence, curlRT;
  var quad, scene, cam, mats = {};
  var last = null, lastT = 0;

  var VERT = 'varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform vec2 uTexel;' +
    'void main(){vUv=uv;vL=uv-vec2(uTexel.x,0.);vR=uv+vec2(uTexel.x,0.);vT=uv+vec2(0.,uTexel.y);vB=uv-vec2(0.,uTexel.y);gl_Position=vec4(position.xy,0.,1.);}';

  var FRAG = {
    splat: 'varying vec2 vUv;uniform sampler2D uTarget;uniform float uAspect;uniform vec2 uColor;uniform vec2 uPoint;uniform float uRadius;' +
      'void main(){vec2 p=vUv-uPoint;p.x*=uAspect;vec2 s=exp(-dot(p,p)/uRadius)*uColor;gl_FragColor=vec4(texture2D(uTarget,vUv).xy+s,0.,1.);}',
    advect: 'varying vec2 vUv;uniform sampler2D uVelocity;uniform vec2 uTexel;uniform float uDt;uniform float uFade;' +
      'void main(){vec2 c=vUv-uDt*texture2D(uVelocity,vUv).xy*uTexel;gl_FragColor=vec4(texture2D(uVelocity,c).xy/(1.+uFade*uDt),0.,1.);}',
    curl: 'varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uVelocity;' +
      'void main(){float L=texture2D(uVelocity,vL).y;float R=texture2D(uVelocity,vR).y;float T=texture2D(uVelocity,vT).x;float B=texture2D(uVelocity,vB).x;gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);}',
    vort: 'varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uVelocity;uniform sampler2D uCurl;uniform float uDt;uniform float uCurlAmt;' +
      'void main(){float L=texture2D(uCurl,vL).x;float R=texture2D(uCurl,vR).x;float T=texture2D(uCurl,vT).x;float B=texture2D(uCurl,vB).x;float C=texture2D(uCurl,vUv).x;' +
      'vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+.0001;f*=uCurlAmt*C;f.y*=-1.;vec2 v=texture2D(uVelocity,vUv).xy+f*uDt;gl_FragColor=vec4(clamp(v,-1000.,1000.),0.,1.);}',
    div: 'varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uVelocity;' +
      'void main(){float L=texture2D(uVelocity,vL).x;float R=texture2D(uVelocity,vR).x;float T=texture2D(uVelocity,vT).y;float B=texture2D(uVelocity,vB).y;vec2 C=texture2D(uVelocity,vUv).xy;' +
      'if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);}',
    clear: 'varying vec2 vUv;uniform sampler2D uTexture;uniform float uValue;void main(){gl_FragColor=uValue*texture2D(uTexture,vUv);}',
    press: 'varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uPressure;uniform sampler2D uDivergence;' +
      'void main(){float L=texture2D(uPressure,vL).x;float R=texture2D(uPressure,vR).x;float T=texture2D(uPressure,vT).x;float B=texture2D(uPressure,vB).x;float d=texture2D(uDivergence,vUv).x;gl_FragColor=vec4((L+R+B+T-d)*.25,0.,0.,1.);}',
    grad: 'varying vec2 vUv;varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;uniform sampler2D uPressure;uniform sampler2D uVelocity;' +
      'void main(){float L=texture2D(uPressure,vL).x;float R=texture2D(uPressure,vR).x;float T=texture2D(uPressure,vT).x;float B=texture2D(uPressure,vB).x;gl_FragColor=vec4(texture2D(uVelocity,vUv).xy-vec2(R-L,T-B),0.,1.);}',
    show: 'varying vec2 vUv;uniform sampler2D uMask;uniform sampler2D uVelocity;uniform vec2 uOff;uniform vec2 uTexel;' +
      'void main(){vec2 o=uTexel*1.5;vec2 v=texture2D(uVelocity,vUv).xy*.4+(texture2D(uVelocity,vUv+vec2(o.x,0.)).xy+texture2D(uVelocity,vUv-vec2(o.x,0.)).xy+texture2D(uVelocity,vUv+vec2(0.,o.y)).xy+texture2D(uVelocity,vUv-vec2(0.,o.y)).xy)*.15;v=clamp(v,-400.,400.);vec2 uv=vUv-v*uOff;float a=texture2D(uMask,uv).a;gl_FragColor=vec4(vec3(a),a);}'
  };

  function material(frag, uniforms) {
    return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: Object.assign({ uTexel: { value: new THREE.Vector2() } }, uniforms), depthTest: false, depthWrite: false, transparent: false });
  }

  function target(w, h) {
    return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  }

  function double(w, h) {
    var d = { read: target(w, h), write: target(w, h) };
    d.swap = function () { var t = d.read; d.read = d.write; d.write = t; };
    return d;
  }

  function pass(mat, out) {
    quad.material = mat;
    renderer.setRenderTarget(out || null);
    renderer.render(scene, cam);
  }

  function measure() {
    var hr = hero.getBoundingClientRect(), tr = title.getBoundingClientRect();
    var padY = tr.height * P.pad, padX = tr.height * P.pad;
    box.x = tr.left - hr.left - padX; box.y = tr.top - hr.top - padY;
    box.w = tr.width + padX * 2; box.h = tr.height + padY * 2;
    box.left = tr.left - padX; box.top = tr.top - padY;
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
    measure();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var aspect = box.w / box.h;
    simH = P.simHeight; simW = Math.min(512, Math.round(simH * aspect));
    drawMask().then(function () {
      if (!renderer) {
        try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' }); }
        catch (e) { building = false; return; }
        if (!renderer.capabilities.isWebGL2) { building = false; return; }
        renderer.setClearColor(0x000000, 0);
        scene = new THREE.Scene(); cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); scene.add(quad);
        mats.splat = material(FRAG.splat, { uTarget: { value: null }, uAspect: { value: 1 }, uColor: { value: new THREE.Vector2() }, uPoint: { value: new THREE.Vector2() }, uRadius: { value: 0.01 } });
        mats.advect = material(FRAG.advect, { uVelocity: { value: null }, uDt: { value: .016 }, uFade: { value: P.velocityFade } });
        mats.curl = material(FRAG.curl, { uVelocity: { value: null } });
        mats.vort = material(FRAG.vort, { uVelocity: { value: null }, uCurl: { value: null }, uDt: { value: .016 }, uCurlAmt: { value: P.curl } });
        mats.div = material(FRAG.div, { uVelocity: { value: null } });
        mats.clear = material(FRAG.clear, { uTexture: { value: null }, uValue: { value: P.pressure } });
        mats.press = material(FRAG.press, { uPressure: { value: null }, uDivergence: { value: null } });
        mats.grad = material(FRAG.grad, { uPressure: { value: null }, uVelocity: { value: null } });
        mats.show = material(FRAG.show, { uMask: { value: null }, uVelocity: { value: null }, uOff: { value: new THREE.Vector2() } });
        mats.show.transparent = true; mats.show.blending = THREE.CustomBlending;
        mats.show.blendSrc = THREE.OneFactor; mats.show.blendDst = THREE.OneMinusSrcAlphaFactor; mats.show.blendEquation = THREE.AddEquation;
      }
      [velocity, pressure].forEach(function (d) { if (d) { d.read.dispose(); d.write.dispose(); } });
      if (divergence) divergence.dispose(); if (curlRT) curlRT.dispose();
      velocity = double(simW, simH); pressure = double(simW, simH); divergence = target(simW, simH); curlRT = target(simW, simH);
      for (var k in mats) if (mats[k].uniforms.uTexel) mats[k].uniforms.uTexel.value.set(1 / simW, 1 / simH);
      mats.splat.uniforms.uAspect.value = box.w / box.h;
      renderer.setPixelRatio(dpr); renderer.setSize(box.w, box.h, false);
      canvas.style.left = box.x + 'px'; canvas.style.top = box.y + 'px'; canvas.style.width = box.w + 'px'; canvas.style.height = box.h + 'px';
      if (!canvas.parentNode) hero.appendChild(canvas);
      clearSim();
      ready = true; building = false;
    });
  }

  function clearSim() {
    renderer.setRenderTarget(velocity.read); renderer.clear();
    renderer.setRenderTarget(velocity.write); renderer.clear();
    renderer.setRenderTarget(pressure.read); renderer.clear();
    renderer.setRenderTarget(pressure.write); renderer.clear();
    renderer.setRenderTarget(null);
  }

  function splat(x, y, dx, dy) {
    var u = mats.splat.uniforms;
    u.uTarget.value = velocity.read.texture; u.uPoint.value.set(x, y); u.uColor.value.set(dx * P.force, dy * P.force);
    u.uRadius.value = (P.splatRadius / 100) * Math.max(1, innerWidth / innerHeight) * Math.pow(innerHeight / box.h, 2);
    pass(mats.splat, velocity.write); velocity.swap();
  }

  function step(dt) {
    mats.curl.uniforms.uVelocity.value = velocity.read.texture; pass(mats.curl, curlRT);
    mats.vort.uniforms.uVelocity.value = velocity.read.texture; mats.vort.uniforms.uCurl.value = curlRT.texture; mats.vort.uniforms.uDt.value = dt; mats.vort.uniforms.uCurlAmt.value = P.curl;
    pass(mats.vort, velocity.write); velocity.swap();
    mats.div.uniforms.uVelocity.value = velocity.read.texture; pass(mats.div, divergence);
    mats.clear.uniforms.uTexture.value = pressure.read.texture; mats.clear.uniforms.uValue.value = P.pressure;
    pass(mats.clear, pressure.write); pressure.swap();
    mats.press.uniforms.uDivergence.value = divergence.texture;
    for (var i = 0; i < P.iterations; i++) {
      mats.press.uniforms.uPressure.value = pressure.read.texture; pass(mats.press, pressure.write); pressure.swap();
    }
    mats.grad.uniforms.uPressure.value = pressure.read.texture; mats.grad.uniforms.uVelocity.value = velocity.read.texture;
    pass(mats.grad, velocity.write); velocity.swap();
    mats.advect.uniforms.uVelocity.value = velocity.read.texture; mats.advect.uniforms.uDt.value = dt; mats.advect.uniforms.uFade.value = P.velocityFade;
    pass(mats.advect, velocity.write); velocity.swap();
  }

  function frame(now) {
    rafId = 0;
    if (!active) return;
    var dt = Math.min((now - (lastT || now)) / 1000, 1 / 30) || 1 / 60; lastT = now;
    step(dt);
    mats.show.uniforms.uMask.value = maskTex; mats.show.uniforms.uVelocity.value = velocity.read.texture; mats.show.uniforms.uOff.value.set(0.00018 * P.refraction * innerWidth / box.w, 0.00018 * P.refraction * innerHeight / box.h);
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(null); renderer.clear();
    pass(mats.show, null);
    if (now > idleAt) { deactivate(); return; }
    rafId = requestAnimationFrame(frame);
  }

  function place() {
    measure();
    canvas.style.left = box.x + 'px'; canvas.style.top = box.y + 'px'; canvas.style.width = box.w + 'px'; canvas.style.height = box.h + 'px';
  }

  function activate() {
    if (active) return;
    place();
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
    clearSim();
    last = null;
  }

  function overLogo(x, y) { return x >= box.left && x <= box.left + box.w && y >= box.top && y <= box.top + box.h; }

  addEventListener('pointermove', function (e) {
    if (!ready || e.pointerType !== 'mouse') return;
    if (document.querySelector('.pm.is-open')) return;
    measure();
    var inside = overLogo(e.clientX, e.clientY);
    if (!inside) { last = null; return; }
    var now = performance.now();
    if (!active) activate();
    idleAt = now + P.idle * 1000;
    if (last) {
      var dx = (e.clientX - last.x) / innerHeight, dy = -(e.clientY - last.y) / innerHeight;
      var dist = Math.hypot(e.clientX - last.x, e.clientY - last.y), n = Math.max(1, Math.min(16, Math.ceil(dist / 10)));
      if (dx || dy) for (var k = 1; k <= n; k++) {
        var f = k / n;
        splat((last.x + (e.clientX - last.x) * f - box.left) / box.w, 1 - (last.y + (e.clientY - last.y) * f - box.top) / box.h, dx / n, dy / n);
      }
    }
    last = { x: e.clientX, y: e.clientY };
  }, { passive: true });

  var rz;
  addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () { if (!ready) return; if (active) deactivate(); ready = false; build(); }, 200);
  });

  document.addEventListener('visibilitychange', function () { if (document.hidden && active) deactivate(); });

  var tries = 0;
  (function wait() {
    var g = window.gsap, mt = hero.querySelector('.main-top');
    var settled = !D.classList.contains('osply-boot') && g && mt && Math.abs(g.getProperty(mt, 'y')) < 0.5 && svgs.every(function (s) { return g.getProperty(s, 'yPercent') === 0 && g.getProperty(s, 'rotationX') === 0; });
    if (settled) { setTimeout(build, 600); return; }
    if (tries++ < 300) setTimeout(wait, 100);
  })();
})();

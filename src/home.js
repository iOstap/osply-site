// ------------- WORK MODAL ------------- //

import * as THREE from 'three';

(function () {
  var D = document.documentElement;
  if (D.classList.contains('w-editor')) return;

  var CFG = {
    base: '/work/', blur: 10, dim: .6, bgIn: 1.2, bgOut: 1.2, fly: 1.9, flyBack: 1.9,
    ease: [.65, .05, 0, 1],
    flyEase: [[0, 0, .094, .026, .124, .127, .157, .29], [.157, .29, .197, .486, .254, .8, .348, .884], [.348, .884, .42, .949, .374, 1, 1, 1]],
    stretch: .225, lift: .16, leadLift: .5, revealAt: .25,
    slideFrom: .6, slideDur: 1.6, slideStagger: .1, textStep: .08, textDur: 1.1, fadeOut: .5,
    wheel: 1, lerp: .085, cursorLerp: .18, wave: .06
  };
  var desk = matchMedia('(min-width: 992px) and (orientation: landscape) and (hover: hover) and (pointer: fine)');

  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function sx(t) { return ((ax * t + bx) * t + cx) * t; }
    function sy(t) { return ((ay * t + by) * t + cy) * t; }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 40; i++) { var v = sx(t); if (Math.abs(v - x) < 1e-6) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      return sy(t);
    };
  }
  var EASE = bezier.apply(null, CFG.ease);
  function seg(t, a, b, c, d) { var s = 1 - t; return s * s * s * a + 3 * s * s * t * b + 3 * s * t * t * c + t * t * t * d; }
  function curve(segs) {
    return function (n) {
      if (n <= 0) return 0; if (n >= 1) return 1;
      for (var k = 0; k < segs.length; k++) {
        var g = segs[k];
        if (n > g[6]) continue;
        var lo = 0, hi = 1;
        for (var i = 0; i < 24; i++) { var h = (lo + hi) / 2; if (seg(h, g[0], g[2], g[4], g[6]) < n) lo = h; else hi = h; }
        return seg((lo + hi) / 2, g[1], g[3], g[5], g[7]);
      }
      return n;
    };
  }
  var FLY = curve(CFG.flyEase);

  function slugify(t) { return (t || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function urlOf(root) {
    if (!root) return null;
    var s = root.querySelector('[data-work-slug]'), slug = s && s.getAttribute('data-work-slug');
    if (!slug) { var a = root.querySelector('a[href]'); if (a) return a.href; var n = root.querySelector('[data-work-name]'); slug = n && slugify(n.textContent); }
    return slug ? new URL(CFG.base + slug, location.origin).href : null;
  }
  var docs = {};
  function getDoc(url) {
    if (!docs[url]) docs[url] = fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (t) { return new DOMParser().parseFromString(t, 'text/html'); })
      .catch(function (e) { delete docs[url]; throw e; });
    return docs[url];
  }
  var warmed = {};
  function preloadImgs(doc) {
    var src = doc.querySelector('[data-pm="list"]') || doc.querySelector('.covers-list');
    if (!src) return;
    [].slice.call(src.querySelectorAll('img')).forEach(function (im) {
      var k = im.getAttribute('src') || ''; if (!k || warmed[k]) return; warmed[k] = 1;
      var i = new Image(); i.decoding = 'async';
      if (im.getAttribute('sizes')) i.sizes = im.getAttribute('sizes');
      if (im.getAttribute('srcset')) i.srcset = im.getAttribute('srcset');
      i.src = k;
    });
  }
  function imgsReady(el, max) {
    var ims = [].slice.call(el.querySelectorAll('img'));
    return Promise.race([
      Promise.all(ims.map(function (im) {
        if (im.complete && im.naturalWidth) return 0;
        return new Promise(function (r) { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); });
      })),
      new Promise(function (r) { setTimeout(r, max * 1000); })
    ]);
  }
  setTimeout(function () {
    (window.requestIdleCallback || function (f) { f(); })(function () {
      if (!desk.matches) return;
      [].slice.call(document.querySelectorAll('[data-work-list] [data-work-item]')).forEach(function (el) {
        var u = urlOf(el.closest('.w-dyn-item') || el.parentElement); if (u) getDoc(u).then(preloadImgs).catch(function () {});
      });
    });
  }, 2500);

  var pm = document.createElement('div');
  pm.className = 'pm'; pm.setAttribute('data-lenis-prevent', '');
  pm.innerHTML = '<div class="pm-bg"></div><div class="pm-body" role="dialog" aria-modal="true"></div><div class="pm-cursor text-xxs caps" aria-hidden="true">Close</div><canvas class="pm-gl" aria-hidden="true"></canvas>';
  document.body.appendChild(pm);
  var bgEl = pm.querySelector('.pm-bg'), body = pm.querySelector('.pm-body'), cursor = pm.querySelector('.pm-cursor'), cvs = pm.querySelector('.pm-gl');
  var bgS = { v: 0 };
  function bgDraw() {
    var f = 'blur(' + (bgS.v * CFG.blur).toFixed(1) + 'px)';
    bgEl.style.webkitBackdropFilter = f; bgEl.style.backdropFilter = f;
    bgEl.style.backgroundColor = 'rgba(0,0,0,' + (bgS.v * CFG.dim).toFixed(3) + ')';
  }
  function bgTo(v, d) { gsap.killTweensOf(bgS); return gsap.to(bgS, { v: v, duration: d, ease: EASE, onUpdate: bgDraw }); }

  var renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas: cvs, alpha: true, antialias: true, premultipliedAlpha: true }); }
  catch (e) { renderer = null; }
  var scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 1, 1, 10000);
  var COVER = 'vec2 cover(vec2 s,vec2 i,vec2 uv){float sr=s.x/s.y,ir=i.x/i.y;vec2 n=sr<ir?vec2(i.x*(s.y/i.y),s.y):vec2(s.x,i.y*(s.x/i.x));vec2 o=(sr<ir?vec2((n.x-s.x)/2.,0.):vec2(0.,(n.y-s.y)/2.))/n;return uv*s/n+o;}';
  var mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null }, uImg: { value: new THREE.Vector2(1, 1) }, uProgress: { value: 0 }, uFrom: { value: new THREE.Vector4() }, uTo: { value: new THREE.Vector4() }, uView: { value: new THREE.Vector2(1, 1) }, uLift: { value: 1 }, uStretch: { value: CFG.stretch }, uLead: { value: CFG.leadLift } },
    vertexShader: [
      'uniform float uProgress,uLift,uStretch,uLead;uniform vec4 uFrom,uTo;uniform vec2 uView;',
      'varying vec2 vUv;varying vec2 vRes;varying float vShape;varying float vParab;',
      'const float PI=3.14159265;',
      'void main(){',
      ' vUv=uv;',
      ' vec2 dir=vec2((uTo.x+uTo.z*.5)-(uFrom.x+uFrom.z*.5),-((uTo.y+uTo.w*.5)-(uFrom.y+uFrom.w*.5)));',
      ' float ax=mix(1.-uv.x,uv.x,step(0.,dir.x)),ay=mix(1.-uv.y,uv.y,step(0.,dir.y));',
      ' float lead=sqrt(ax*ax*.6+ay*ay*.4);',
      ' vec2 uvS=vec2(uv.x,1.-uv.y);',
      ' vec2 fromP=uFrom.xy+uvS*uFrom.zw,toP=uTo.xy+uvS*uTo.zw;',
      ' float vp=clamp(uProgress/max(1.-lead*uStretch,.001),0.,1.);',
      ' vp=1.-(1.-vp)*(1.-vp);',
      ' vec2 px=mix(fromP,toP,vp);',
      ' float parab=uProgress*(1.-uProgress)*4.;',
      ' float dome=sin(uv.x*PI)*sin(uv.y*PI);',
      ' float shape=dome*(1.-uLead)+lead*uLead;',
      ' vShape=shape;vParab=parab;',
      ' gl_Position=projectionMatrix*viewMatrix*vec4(px.x-uView.x*.5,uView.y*.5-px.y,parab*shape*uLift,1.);',
      ' vRes=mix(uFrom.zw,uTo.zw,vp);',
      '}'].join('\n'),
    fragmentShader: [
      'uniform sampler2D uTex;uniform vec2 uImg;varying vec2 vUv;varying vec2 vRes;varying float vShape;varying float vParab;',
      COVER,
      'void main(){',
      ' vec4 c=texture2D(uTex,cover(vRes,uImg,vUv));',
      ' c.rgb*=1.+vParab*(vShape-.5)*2.*.22;',
      ' gl_FragColor=vec4(c.rgb,1.);',
      '}'].join('\n'),
    side: THREE.DoubleSide, depthTest: false, depthWrite: false
  });
  var geo = new THREE.PlaneGeometry(1, 1, 48, 48);
  var plane = new THREE.Mesh(geo, mat);
  plane.frustumCulled = false;
  scene.add(plane);
  if (renderer) { renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; }
  var W = innerWidth, H = innerHeight, REM = 16;
  function size() {
    W = innerWidth; H = innerHeight; REM = parseFloat(getComputedStyle(D).fontSize) || 16;
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
    cam.aspect = W / H; cam.position.z = (H / 2) / Math.tan(THREE.MathUtils.degToRad(22.5)); cam.far = cam.position.z * 4; cam.updateProjectionMatrix();
    mat.uniforms.uView.value.set(W, H); mat.uniforms.uLift.value = cam.position.z * CFG.lift;
    wave.meshes.forEach(function (me) { me.material.uniforms.uView.value.set(W, H); });
  }
  var texs = {};
  function getTex(src) {
    if (!texs[src]) texs[src] = new Promise(function (ok) {
      var im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
      im.onload = function () { var t = new THREE.Texture(im); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; t.userData.w = im.naturalWidth || 3; t.userData.h = im.naturalHeight || 2; ok(t); };
      im.onerror = function () { ok(null); };
      im.src = src;
    });
    return texs[src];
  }
  var extras = [];
  function addSheet(tex, a, b) {
    var mt = mat.clone(), u = mt.uniforms;
    u.uTex.value = tex; u.uImg.value.set(tex.userData.w, tex.userData.h);
    u.uFrom.value.set(a.x, a.y, a.w, a.h); u.uTo.value.set(b.x, b.y, b.w, b.h); u.uProgress.value = 0;
    var me = new THREE.Mesh(geo, mt); me.frustumCulled = false; scene.add(me); extras.push(me);
  }
  function clearSheets() { extras.forEach(function (me) { scene.remove(me); me.material.dispose(); }); extras = []; }
  function draw(a, b, p) {
    if (!renderer) return;
    if (p == null) { renderer.clear(); return; }
    var u = mat.uniforms;
    u.uFrom.value.set(a.x, a.y, a.w, a.h); u.uTo.value.set(b.x, b.y, b.w, b.h); u.uProgress.value = p;
    for (var i = 0; i < extras.length; i++) extras[i].material.uniforms.uProgress.value = p;
    renderer.render(scene, cam);
  }
  function fly(a, b, dur, done) {
    var o = { t: 0 };
    return gsap.to(o, { t: 1, duration: dur, ease: 'none', onUpdate: function () { draw(a, b, FLY(o.t)); }, onComplete: done });
  }
  function rectOf(el) { var r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }

  var waveScene = new THREE.Scene();
  var waveMat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null }, uImg: { value: new THREE.Vector2(1, 1) }, uRect: { value: new THREE.Vector4() }, uView: { value: new THREE.Vector2(1, 1) }, uWarp: { value: 0 }, uK: { value: CFG.wave } },
    vertexShader: [
      'uniform vec4 uRect;uniform vec2 uView;uniform float uWarp,uK;varying vec2 vUv;',
      'void main(){',
      ' vUv=uv;',
      ' vec2 px=uRect.xy+vec2(uv.x,1.-uv.y)*uRect.zw;',
      ' float d=(px.y-uView.y*.5)/(uView.y*.5);',
      ' float g=max(0.,1.-d*d);',
      ' float cx=uRect.x+uRect.z*.5;',
      ' px.x=cx+(px.x-cx)*(1.+uWarp*uK*g);',
      ' gl_Position=projectionMatrix*viewMatrix*vec4(px.x-uView.x*.5,uView.y*.5-px.y,0.,1.);',
      '}'].join('\n'),
    fragmentShader: [
      'uniform sampler2D uTex;uniform vec2 uImg;uniform vec4 uRect;varying vec2 vUv;',
      COVER,
      'void main(){ gl_FragColor=vec4(texture2D(uTex,cover(uRect.zw,uImg,vUv)).rgb,1.); }'].join('\n'),
    side: THREE.DoubleSide, depthTest: false, depthWrite: false
  });
  var waveGeo = new THREE.PlaneGeometry(1, 1, 1, 40);
  var wave = { on: false, w: 0, vel: 0, lastC: null, meshes: [] };
  function waveSetup() {
    waveOff(); waveClear();
    if (!renderer || !loop) return;
    loop.kids.forEach(function (n) {
      var me = new THREE.Mesh(waveGeo, waveMat.clone()); me.frustumCulled = false; me.visible = false; me._ok = false;
      var u = me.material.uniforms; u.uView.value.set(W, H);
      var im = n.tagName === 'IMG' ? n : n.querySelector('img');
      if (im) getTex(im.currentSrc || im.src).then(function (t) { if (!t) return; u.uTex.value = t; u.uImg.value.set(t.userData.w, t.userData.h); me._ok = true; });
      me._n = n; waveScene.add(me); wave.meshes.push(me);
    });
    wave.w = wave.vel = 0; wave.lastC = loop.c;
  }
  function waveClear() { wave.meshes.forEach(function (me) { waveScene.remove(me); me.material.dispose(); }); wave.meshes = []; wave.on = false; }
  function waveOff(keepCanvas) {
    if (!wave.on) return;
    wave.on = false;
    wave.meshes.forEach(function (me) { me._n.style.visibility = ''; });
    if (ctx && ctx.cover && st.closing) ctx.cover.style.visibility = 'hidden';
    if (!keepCanvas && renderer) renderer.clear();
  }
  function waveFrame() {
    if (!renderer || !loop || !wave.meshes.length || !loop.revealed || st.closing || st.flying) { waveOff(st.closing); return; }
    var v = loop.c - (wave.lastC == null ? loop.c : wave.lastC); wave.lastC = loop.c;
    wave.vel += (v - wave.vel) * .16;
    var ai = Math.max(-1.5, Math.min(1.5, wave.vel / 28));
    var wt = Math.abs(ai) > .001 ? Math.sign(ai) * Math.pow(Math.abs(ai), 1.85) * .46 : 0;
    wave.w += (wt - wave.w) * .07;
    if (Math.abs(wave.w) < .002 && Math.abs(v) < .05) { wave.w = 0; waveOff(); return; }
    var vis = [];
    for (var i = 0; i < wave.meshes.length; i++) {
      var me = wave.meshes[i], r = me._n.getBoundingClientRect();
      me.visible = r.bottom > -40 && r.top < H + 40;
      if (me.visible) { if (!me._ok) { waveOff(); return; } vis.push([me, r]); }
    }
    vis.forEach(function (o) { var u = o[0].material.uniforms; u.uRect.value.set(o[1].left, o[1].top, o[1].width, o[1].height); u.uWarp.value = wave.w; });
    if (!wave.on) { wave.on = true; wave.meshes.forEach(function (me) { me._n.style.visibility = 'hidden'; }); }
    renderer.render(waveScene, cam);
  }

  function hero() { return document.querySelector('.page-wrap > .hero') || document.querySelector('.hero'); }
  function cardRect() {
    var h = hero(), top = h && h.querySelector('.main-top');
    if (!h || !top) return null;
    var r = h.getBoundingClientRect(), rem = parseFloat(getComputedStyle(D).fontSize) || 16;
    var wa = ((r.width - 13 * rem) / 12) * 4 + 3 * rem, ha = wa * 2 / 3, cy = (top.offsetTop + top.offsetHeight + r.height) / 2;
    return { x: r.left + (r.width - wa) / 2, y: r.top + cy - ha / 2, w: wa, h: ha };
  }
  var mask = null;
  function maskCard(r) {
    var h = hero(); if (!h || !r) return;
    var hr = h.getBoundingClientRect(), bg = getComputedStyle(h).backgroundColor, pad = 6;
    if (!bg || bg === 'transparent' || /,\s*0\)$/.test(bg)) bg = getComputedStyle(document.body).backgroundColor;
    if (!bg || bg === 'transparent' || /,\s*0\)$/.test(bg)) bg = '#000';
    mask = document.createElement('div'); mask.className = 'pm-mask';
    mask.style.cssText = 'left:' + (r.x - hr.left - pad) + 'px;top:' + (r.y - hr.top - pad) + 'px;width:' + (r.w + 2 * pad) + 'px;height:' + (r.h + 2 * pad) + 'px;background:' + bg;
    var stage = h.querySelector('.work-stage');
    if (stage && stage.nextSibling) h.insertBefore(mask, stage.nextSibling); else h.appendChild(mask);
  }

  function commas(root) {
    [].slice.call(root.querySelectorAll('.w-dyn-items')).forEach(function (l) {
      var its = [].slice.call(l.children).filter(function (n) { return n.querySelector('[data-pm-text]') || n.hasAttribute('data-pm-text'); });
      its.forEach(function (it, i) {
        if (i === its.length - 1) return;
        var t = it.hasAttribute('data-pm-text') ? it : it.querySelector('[data-pm-text]');
        if (t && !t._comma) { t._comma = true; t.appendChild(document.createTextNode(',')); it.style.marginRight = '.3em'; }
      });
    });
  }
  function mount(doc) {
    var src = doc.querySelector('[data-pm="content"]') || doc.querySelector('.page-w');
    if (!src) throw new Error('no [data-pm="content"]');
    var wrap = document.createElement('div'); wrap.className = 'page-wrap';
    var c = document.importNode(src, true); c.setAttribute('data-pm', 'content'); wrap.appendChild(c);
    body.innerHTML = ''; body.style.visibility = 'hidden'; body.appendChild(wrap);
    [].slice.call(c.querySelectorAll('.w-condition-invisible')).forEach(function (n) { n.remove(); });
    var list = c.querySelector('[data-pm="list"]') || c.querySelector('.covers-list');
    list.setAttribute('data-pm', 'list');
    var info = c.querySelector('[data-pm="info"]') || c.querySelector('.overview-side');
    if (info) info.setAttribute('data-pm', 'info');
    var cover = c.querySelector('[data-pm="cover"]') || c.querySelector('.main-cover') || list.firstElementChild;
    [].slice.call(c.querySelectorAll('img')).forEach(function (im) {
      im.loading = 'eager';
      var s = im.getAttribute('src') || '';
      if (!s || /placeholder/i.test(s) || im.classList.contains('w-dyn-bind-empty')) {
        var slide = im.parentElement === list ? im : im.closest('[data-pm="list"] > *');
        if (slide && slide !== cover) slide.remove(); else if (!slide) im.remove();
      }
    });
    commas(c);
    var ref = c.querySelector('.text-xxs.caps');
    if (ref) { var cs = getComputedStyle(ref); ['fontFamily', 'fontSize', 'lineHeight', 'fontWeight', 'letterSpacing', 'textTransform'].forEach(function (k) { cursor.style[k] = cs[k]; }); }
    if (doc.title) document.title = doc.title;
    return { c: c, list: list, cover: cover, info: info };
  }
  function prep(m) {
    m.groups = {};
    function g(k) { return m.groups[k] || (m.groups[k] = { lines: [], fades: [] }); }
    [].slice.call(m.c.querySelectorAll('[data-pm-text]')).forEach(function (el) {
      var lines;
      try { lines = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'pm-line', aria: 'none' }).lines; } catch (e) { lines = [el]; }
      [].push.apply(g(parseFloat(el.getAttribute('data-pm-text')) || 0).lines, lines);
    });
    [].slice.call(m.c.querySelectorAll('[data-pm-fade]')).forEach(function (el) { g(parseFloat(el.getAttribute('data-pm-fade')) || 0).fades.push(el); });
    m.keys = Object.keys(m.groups).map(Number).sort(function (a, b) { return a - b; });
    m.lines = []; m.fades = [];
    m.keys.forEach(function (k) { [].push.apply(m.lines, m.groups[k].lines); [].push.apply(m.fades, m.groups[k].fades); });
    gsap.set(m.lines, { yPercent: 110 });
    gsap.set(m.fades, { opacity: 0 });
    gsap.set([].slice.call(m.list.children).filter(function (n) { return n !== m.cover; }), { opacity: 0 });
    gsap.set(m.cover, { visibility: 'hidden' });
    [].slice.call(m.list.children).forEach(function (n) { n.style.setProperty('--ly', REM + 'px'); });
  }

  var loop = null;
  function loopInit(list) {
    loop = { list: list, kids: [], top: [], h: [], len: 0, t: -REM, c: -REM, sets: 1, revealed: false };
    [].slice.call(list.querySelectorAll('img')).forEach(function (im) { if (!im.complete) im.addEventListener('load', loopMeasure, { once: true }); });
    loopMeasure();
  }
  function loopMeasure() {
    if (!loop) return;
    var list = loop.list, k = [].slice.call(list.children);
    var gap = parseFloat(getComputedStyle(list).rowGap) || 0;
    loop.top = k.map(function (n) { return n.offsetTop; }); loop.h = k.map(function (n) { return n.offsetHeight; });
    var last = k.length - 1;
    loop.len = last < 0 ? 0 : loop.top[last] + loop.h[last] + gap - loop.top[0];
    loop.kids = k;
    var maxH = Math.max.apply(0, loop.h.concat([0]));
    if (loop.len && loop.len < H + maxH + gap && loop.sets < 6 && loop.h.every(function (x) { return x > 0; })) {
      k.slice(0, Math.round(k.length / loop.sets)).forEach(function (n) {
        var cl = n.cloneNode(true); cl.setAttribute('data-pm-clone', ''); cl.setAttribute('aria-hidden', 'true'); cl.removeAttribute('data-pm');
        cl.style.visibility = ''; cl.style.opacity = loop.revealed ? 1 : 0; if (loop.revealed) cl.style.setProperty('--iy', '0px');
        list.appendChild(cl);
      });
      loop.sets++;
      return loopMeasure();
    }
    loopFrame(true);
    waveSetup();
  }
  function mod(a, n) { return ((a % n) + n) % n; }
  function visY(i, c) { var rel = loop.top[i] - loop.top[0]; return mod(rel - c + loop.h[i], loop.len) - loop.h[i]; }
  function loopFrame(force) {
    if (!loop || !loop.len) return;
    var prev = loop.c;
    loop.c += (loop.t - loop.c) * CFG.lerp;
    if (Math.abs(loop.t - loop.c) < .05) loop.c = loop.t;
    if (force !== true && loop.c === prev) return;
    for (var i = 0; i < loop.kids.length; i++) loop.kids[i].style.setProperty('--ly', (visY(i, loop.c) - (loop.top[i] - loop.top[0])).toFixed(2) + 'px');
  }

  var cur = { x: 0, y: 0, tx: 0, ty: 0, o: 0, on: false, seen: false };
  function cursorFrame() {
    var k = CFG.cursorLerp;
    cur.x += (cur.tx - cur.x) * k; cur.y += (cur.ty - cur.y) * k;
    cur.o += ((cur.on ? 1 : 0) - cur.o) * .2;
    cursor.style.transform = 'translate3d(' + (cur.x - cursor.offsetWidth / 2).toFixed(1) + 'px,' + (cur.y - cursor.offsetHeight / 2).toFixed(1) + 'px,0)';
    cursor.style.opacity = cur.o.toFixed(3);
  }
  function overInfo(el) { return ctx && ctx.info && ctx.info.contains(el) && !el.closest('a'); }
  var lock = false, passing = false;
  function homePointer(x, y, type) {
    passing = true;
    try { window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, pointerType: type, isPrimary: true })); } catch (e) {}
    passing = false;
  }
  addEventListener('pointermove', function (e) {
    if (passing) return;
    cur.tx = e.clientX; cur.ty = e.clientY; cur.seen = true;
    if (lock) e.stopImmediatePropagation();
  }, { capture: true, passive: true });
  ['wheel', 'pointerdown', 'pointerup', 'click', 'mousedown', 'touchstart'].forEach(function (t) {
    addEventListener(t, function (e) { if (st.closing) { if (e.cancelable) e.preventDefault(); e.stopImmediatePropagation(); } }, { capture: true, passive: false });
  });
  document.addEventListener('pointerleave', function () { cur.seen = false; });
  pm.addEventListener('click', function (e) { if (st.open && !st.closing && overInfo(e.target)) closeP(false); });

  function tick() {
    loopFrame();
    waveFrame();
    cur.on = cur.seen && st.open && !st.closing && overInfo(document.elementFromPoint(cur.tx, cur.ty) || pm);
    cursorFrame();
  }

  var st = { open: false, busy: false, closing: false, flying: false, pushed: false, title: '', wantClose: false, ignorePop: false }, ctx = null, from = null;
  function lenisSet(on) { if (typeof lenis !== 'undefined' && lenis) on ? lenis.start() : lenis.stop(); }

  function openP(url, d) {
    if (st.open || st.busy) return;
    st.open = st.busy = true; st.wantClose = false; st.title = document.title;
    var im = d.item && (d.item.querySelector('[data-work-img]') || d.item.querySelector('img'));
    var src = im && (im.currentSrc || im.src);
    from = cardRect();
    lock = true; homePointer(cur.tx, cur.ty, 'pen');
    try { history.pushState({ pm: url }, '', url); st.pushed = true; } catch (e) { st.pushed = false; }
    lenisSet(false);
    osply.gsap().then(function () {
      size(); pm.classList.add('is-open'); D.classList.add('pm-open');
      bgTo(1, CFG.bgIn);
      var texP = src ? getTex(src) : Promise.resolve(null);
      texP.then(function (tex) {
        if (tex && from && st.open) {
          mat.uniforms.uTex.value = tex; mat.uniforms.uImg.value.set(tex.userData.w, tex.userData.h);
          draw(from, from, 0); maskCard(from);
        }
      });
      return Promise.all([texP, getDoc(url)]);
    }).then(function (r) {
      var tex = r[0];
      var m = ctx = mount(r[1]);
      prep(m);
      osply.linkFx(m.c); m.arrows = osply.arrowFx(m.c);
      body.style.visibility = '';
      cur.x = cur.tx; cur.y = cur.ty; gsap.ticker.add(tick);
      var ready = imgsReady(m.list, CFG.fly * .35).then(function () { if (ctx === m) loopInit(m.list); });
      if (!tex || !from || !renderer) {
        gsap.set(m.cover, { visibility: 'visible', opacity: 0 }); gsap.to(m.cover, { opacity: 1, duration: .8 });
        st.busy = false;
        ready.then(function () { if (ctx === m && !st.closing) m.tl = reveal(m, 0, false); if (ctx === m && st.wantClose) closeP(st.wantClose === 'pop'); }); return;
      }
      st.busy = false;
      st.flying = true;
      ready.then(function () {
        if (ctx !== m || !loop) return [];
        var on = loop.kids.filter(function (n, i) { var y = visY(i, loop.c); return n !== m.cover && y >= 0 && y < H; });
        return Promise.all(on.map(function (n) {
          var im = n.tagName === 'IMG' ? n : n.querySelector('img');
          return (im ? getTex(im.currentSrc || im.src) : Promise.resolve(null)).then(function (t) { return { n: n, t: t }; });
        }));
      }).then(function (fl) {
        if (ctx !== m || st.closing) return;
        var to = rectOf(m.cover), flown = [];
        loop.kids.forEach(function (n) { if (n !== m.cover) n.style.opacity = 1; });
        fl.forEach(function (o) {
          if (!o.t) return;
          var b = rectOf(o.n);
          o.n.style.visibility = 'hidden'; addSheet(o.t, { x: b.x, y: H + REM, w: b.w, h: b.h }, b); flown.push(o.n);
        });
        fly(from, to, CFG.fly, function () {
          st.flying = false;
          gsap.set(m.cover, { visibility: 'visible' });
          flown.forEach(function (n) { n.style.visibility = ''; });
          loop.revealed = true;
          clearSheets();
          requestAnimationFrame(function () { if (!st.closing && !wave.on) draw(null); });
          if (st.wantClose) closeP(st.wantClose === 'pop');
        });
        m.tl = reveal(m, CFG.fly * CFG.revealAt, true);
      });
    }).catch(function () { location.href = url; });
  }

  function reveal(m, delay, flown) {
    var tl = gsap.timeline({ delay: delay });
    if (!flown) {
      loop.revealed = true;
      var below = [], above = [];
      loop.kids.forEach(function (n, i) { if (n === m.cover) return; (visY(i, loop.c) < 0 ? above : below).push(n); });
      gsap.set(above, { opacity: 1 });
      gsap.set(below, { '--iy': (H * CFG.slideFrom) + 'px' });
      tl.to(below, { opacity: 1, '--iy': '0px', duration: CFG.slideDur, ease: 'expo.out', stagger: CFG.slideStagger }, 0);
    }
    m.keys.forEach(function (k, i) {
      var g = m.groups[k], at = i * CFG.textStep;
      if (g.lines.length) tl.to(g.lines, { yPercent: 0, duration: CFG.textDur, ease: 'power4.out', stagger: .06 }, at);
      if (g.fades.length) tl.to(g.fades, { opacity: 1, duration: .8, ease: 'power2.out' }, at + .2);
    });
    return tl;
  }

  function closeP(fromPop) {
    if (!st.open || st.closing) return;
    if (st.busy || st.flying || !loop) { st.wantClose = (fromPop || st.wantClose === 'pop') ? 'pop' : 'ui'; return; }
    st.wantClose = false; st.busy = st.closing = true; cur.on = false;
    pm.classList.add('is-closing');
    if (!fromPop && st.pushed) { st.ignorePop = true; history.back(); }
    st.pushed = false;
    var m = ctx;
    if (m.tl) m.tl.kill();
    waveOff(true);
    loop.revealed = false; loop.t = loop.c; loopFrame(true);
    gsap.to(m.lines.slice().reverse(), { yPercent: 110, duration: .5, ease: 'power3.in', stagger: .012 });
    gsap.to(m.fades, { opacity: 0, duration: .35 });
    gsap.to(loop.kids.filter(function (n) { return n !== m.cover; }), { opacity: 0, duration: CFG.fadeOut, ease: 'power2.out' });
    var back = cardRect() || from, cr = rectOf(m.cover);
    if (cr.y + cr.h <= 0 || cr.y >= H) cr = { x: cr.x, y: -cr.h - REM, w: cr.w, h: cr.h };
    if (renderer && mat.uniforms.uTex.value && back) {
      gsap.set(m.cover, { visibility: 'hidden' }); draw(cr, back, 0);
      fly(cr, back, CFG.flyBack, done);
    } else gsap.to(m.cover, { opacity: 0, duration: .5, onComplete: done });
    bgTo(0, CFG.bgOut);
    function done() {
      draw(null);
      if (mask) { mask.remove(); mask = null; }
      lock = false;
      if (cur.seen) homePointer(cur.tx, cur.ty, 'mouse');
      gsap.ticker.remove(tick);
      cursor.style.opacity = 0; cur.o = 0;
      waveClear();
      if (m.arrows) m.arrows.forEach(function (t) { t.kill(); });
      body.innerHTML = ''; loop = null; ctx = null;
      pm.classList.remove('is-open', 'is-closing'); D.classList.remove('pm-open');
      document.title = st.title;
      lenisSet(true);
      st.open = st.busy = st.closing = false;
    }
  }

  document.addEventListener('osply:work-open', function (e) {
    var d = e.detail || {}, url = urlOf(d.item);
    if (!url) return;
    if (!desk.matches || !renderer) { location.href = url; return; }
    openP(url, d);
  });
  pm.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (!loop || !loop.revealed || st.closing) return;
    loop.t += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1) * CFG.wheel;
  }, { passive: false });
  addEventListener('keydown', function (e) {
    if (!st.open) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { closeP(false); return; }
    if (!loop || !loop.revealed || st.closing) return;
    var k = { ArrowDown: .35, PageDown: .8, ' ': .8, ArrowUp: -.35, PageUp: -.8 }[e.key];
    if (k) { e.preventDefault(); loop.t += k * H; }
  }, true);
  addEventListener('popstate', function () {
    if (st.ignorePop) { st.ignorePop = false; return; }
    if (st.open) closeP(true);
    else if (location.pathname.indexOf(CFG.base) === 0) location.reload();
  });
  var rz;
  addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      if (!st.open) return;
      if (!desk.matches) { location.reload(); return; }
      size(); loopMeasure();
    }, 150);
  });
})();



// ------------- HOME: LOADER + WEBGL WORK CAROUSEL ------------- //

(function () {
  var D = document.documentElement;
  if (D.classList.contains('w-editor')) return;
  var hero = document.querySelector('.page-wrap > .hero') || document.querySelector('.hero');
  var top = hero && hero.querySelector('.main-top');
  if (!hero || !top || !window.gsap) { D.classList.remove('osply-boot'); return; }
  window.__osplyHome = true;
  var gsap = window.gsap;

  var CFG = {
    gap: .5, small: .64, mobActive: .75,
    stops: [36, 72], steps: [1.45, 1.45, 1.45], maxLoad: 5,
    spin: 3.6, turn2From: 1, turn2Cut: .8, loops: 2,
    lettersLead: 0, topDur: 1.6, topAt: .7, listDelay: .4, infoEarly: 1.5, infoDelay: .4,
    dim: .7, wheel: 1.6,
    bendDesk: .12, bendMob: .14, bendMobEdge: .1,
    lens: .32, lensR: .17,
    volume: .3, sound: true
  };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SOFT = !!window.__osplySoft;
  var mqMob = matchMedia('(orientation: portrait) and (max-width: 1024px)');

  var list = document.querySelector('[data-work-list]');
  var items = [].slice.call((list || document).querySelectorAll('[data-work-item]')).map(function (el) {
    var root = el.closest('.w-dyn-item') || el.parentElement;
    var q = function (s) { var n = root.querySelector(s); return n ? n.textContent.trim() : ''; };
    var img = root.querySelector('[data-work-img]') || el.querySelector('img');
    var svc = [].slice.call(root.querySelectorAll('[data-work-service]')).map(function (n) { return n.textContent.trim(); }).filter(Boolean);
    return {
      el: el.closest('a') || el.querySelector('a') || el, root: root,
      src: img ? (img.currentSrc || img.getAttribute('src') || '') : '',
      num: q('[data-work-num]'), name: q('[data-work-name]'), ind: q('[data-work-industry]'), svc: svc.join(', '),
      img: null, tex: null, aspect: 1.5
    };
  }).filter(function (it) { return it.src; });
  var N = items.length;

  var letters = [].slice.call(hero.querySelectorAll('.hero-title .hero-letter .title-letter'));
  var navW = hero.querySelector('.nav-w');
  var navTexts = navW ? [].slice.call(navW.querySelectorAll('.text-xs, .nav-link')).filter(function (n) { return !n.querySelector('.text-xs, .nav-link'); }) : [];
  var bottom = hero.querySelector('.main-bottom');

  var stage = document.createElement('div'); stage.className = 'work-stage';
  var line = document.createElement('div'); line.className = 'work-line';
  var info = document.createElement('div'); info.className = 'work-info';
  var TR = '<div class="wi-track"><span></span><span></span></div>';
  info.innerHTML = '<div class="wi-num wi-field text-xs">' + TR + '</div><div class="wi-svc wi-field text-xs">' + TR + '</div><div class="wi-names text-xs"></div><div class="wi-ind wi-field text-xs">' + TR + '</div>';
  hero.insertBefore(line, hero.firstChild);
  hero.insertBefore(stage, line.nextSibling);
  hero.appendChild(info);
  var fNum = info.querySelector('.wi-num'), fSvc = info.querySelector('.wi-svc'), fInd = info.querySelector('.wi-ind'), fNames = info.querySelector('.wi-names');
  fNum._key = 'num'; fSvc._key = 'svc'; fInd._key = 'ind';
  var fieldEls = [fNum, fSvc, fInd];
  var pct = null;
  if (navW) { pct = document.createElement('div'); pct.className = 'work-pct text-xs'; pct.innerHTML = '<span>0%</span>'; navW.appendChild(pct); }

  var actx = null, lastTick = 0;
  function unlockAudio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} }
  ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'].forEach(function (ev) { addEventListener(ev, unlockAudio, { passive: true, capture: true }); });
  function tick(i) {
    if (!CFG.sound || !actx || actx.state !== 'running') return;
    var now = performance.now(); if (now - lastTick < 45) return; lastTick = now;
    var t = actx.currentTime, v = CFG.volume;
    var f0 = 110 * Math.pow(1.07, (i || 0) % 6);
    var out = actx.createBiquadFilter(); out.type = 'lowpass'; out.frequency.value = 900; out.Q.value = .5;
    out.connect(actx.destination);
    var o = actx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0 * 1.7, t); o.frequency.exponentialRampToValueAtTime(f0, t + .03);
    var og = actx.createGain();
    og.gain.setValueAtTime(.0001, t); og.gain.exponentialRampToValueAtTime(v, t + .004);
    og.gain.exponentialRampToValueAtTime(.001, t + .09);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + .1);
    var len = Math.floor(actx.sampleRate * .02);
    var buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    for (var k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 4);
    var n = actx.createBufferSource(); n.buffer = buf;
    var bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500 * Math.pow(1.07, (i || 0) % 6); bp.Q.value = .8;
    var ng = actx.createGain(); ng.gain.setValueAtTime(v * .25, t); ng.gain.exponentialRampToValueAtTime(.001, t + .025);
    n.connect(bp); bp.connect(ng); ng.connect(out);
    n.start(t);
  }

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }); }
  catch (e) { renderer = null; }
  if (renderer) {
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    stage.appendChild(renderer.domElement);
  }
  var scene = new THREE.Scene();
  var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  var rt = new THREE.WebGLRenderTarget(2, 2, { samples: 4 });
  var geo = new THREE.PlaneGeometry(1, 1, 24, 24);
  var blank = new THREE.DataTexture(new Uint8Array([34, 34, 34, 255]), 1, 1); blank.needsUpdate = true;

  var VERT = [
    'uniform float uWarp;uniform float uCy;uniform float uVW;uniform float uMob;uniform float uA;uniform float uB;varying vec2 vUv;',
    'void main(){',
    ' vUv=uv;',
    ' vec4 wp=modelMatrix*vec4(position,1.);',
    ' float s=clamp((wp.y-uCy)/(uVW*.5),-1.,1.);',
    ' float wa=abs(uWarp),z;',
    ' if(uMob>.5){ z=exp(-s*s*4.)*wa*uA-s*s*wa*uB; }',
    ' else { z=exp(-s*s*5.)*uWarp*uA; }',
    ' float k=1./(1.-clamp(z,-.5,.5));',
    ' wp.x*=k; wp.y=uCy+(wp.y-uCy)*k;',
    ' gl_Position=projectionMatrix*viewMatrix*wp;',
    '}'].join('\n');
  var FRAG = [
    'uniform sampler2D uTex;uniform vec2 uSize;uniform float uImgA;uniform float uGray;uniform float uOp;varying vec2 vUv;',
    'void main(){',
    ' float a=uSize.x/uSize.y;',
    ' vec2 s=a>uImgA?vec2(1.,uImgA/a):vec2(a/uImgA,1.);',
    ' vec4 c=texture2D(uTex,(vUv-.5)*s+.5);',
    ' float l=dot(c.rgb,vec3(.299,.587,.114));',
    ' c.rgb=mix(c.rgb,vec3(l),uGray);',
    ' c.rgb=mix(c.rgb,.5+(c.rgb-.5)*.88,uGray);',
    ' gl_FragColor=vec4(c.rgb*uOp,uOp);',
    '}'].join('\n');
  var post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tMap: { value: rt.texture }, uMouse: { value: new THREE.Vector2(.5, .5) }, uAspect: { value: 1 }, uAmt: { value: 0 }, uRad: { value: CFG.lensR } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: [
      'uniform sampler2D tMap;uniform vec2 uMouse;uniform float uAspect;uniform float uAmt;uniform float uRad;varying vec2 vUv;',
      'void main(){',
      ' vec2 d=vUv-uMouse;d.x*=uAspect;',
      ' float c=smoothstep(uRad,0.,length(d));',
      ' c=c*c*(3.-2.*c);',
      ' vec2 uv=mix(vUv,uMouse,c*uAmt);',
      ' vec4 col=texture2D(tMap,uv);',
      ' col.rgb+=col.rgb*c*uAmt*.3;',
      ' gl_FragColor=col;',
      '}'].join('\n'),
    depthTest: false, depthWrite: false, transparent: true
  }));
  var postScene = new THREE.Scene(); postScene.add(post);
  var postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  var pool = [];
  function mesh() {
    var m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { uTex: { value: blank }, uSize: { value: new THREE.Vector2(1, 1) }, uImgA: { value: 1 }, uGray: { value: 1 }, uOp: { value: .5 }, uWarp: { value: 0 }, uCy: { value: 0 }, uVW: { value: 1000 }, uMob: { value: 0 }, uA: { value: CFG.bendDesk }, uB: { value: CFG.bendMobEdge } },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor
    }));
    m.frustumCulled = false;
    scene.add(m); pool.push(m); return m;
  }

  var loaded = 0;
  items.forEach(function (it) {
    var im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
    im.onload = function () {
      it.aspect = im.naturalWidth / im.naturalHeight || 1.5;
      var t = new THREE.Texture(im); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.anisotropy = 4; t.needsUpdate = true;
      it.tex = t; loaded++;
    };
    im.onerror = function () { loaded++; };
    im.src = it.src; it.img = im;
  });

  var W = 1, H = 1, DPR = 1, REM = 16, mob = false, cy = 0, Wa = 1, Ha = 1, Ws = 1, Hs = 1, GAP = 8, STEP = 1, R = 4;
  function layout() {
    var r = hero.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    REM = parseFloat(getComputedStyle(D).fontSize) || 16;
    mob = mqMob.matches;
    hero.classList.toggle('is-mobile', mob);
    GAP = CFG.gap * REM;
    if (mob) { Wa = W * CFG.mobActive; Ha = Wa * 2 / 3; Ws = Hs = Wa * CFG.small; }
    else {
      var col = (W - 2 * REM - 11 * REM) / 12;
      Wa = col * 4 + REM * 3; Ha = Wa * 2 / 3; Ws = Hs = Wa * CFG.small;
    }
    cy = (top.offsetTop + top.offsetHeight + H) / 2;
    STEP = Ha / 2 + Hs / 2 + GAP;
    R = Math.ceil(H / (Hs + GAP)) + 2;
    while (pool.length < R * 2 + 1) mesh();
    line.style.top = info.style.top = cy + 'px';
    var lh = parseFloat(getComputedStyle(fNum).fontSize) || 14;
    ROWS = Math.min(N, 4); fNames.style.height = (ROWS + .25) * lh + 'px'; ROWH = lh;
    FH = fNum.offsetHeight || lh * 1.25;
    if (renderer) {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(DPR); renderer.setSize(W, H, false);
      rt.setSize(Math.round(W * DPR), Math.round(H * DPR));
      cam.left = -W / 2; cam.right = W / 2; cam.top = H / 2; cam.bottom = -H / 2; cam.updateProjectionMatrix();
      post.material.uniforms.uAspect.value = W / H;
    }
    meshKey = drawnKey = ''; drawnTp = null;
  }

  var ENTER = 0, headV = null, pos = 0, vel = 0, target = 0, smooth = .45, mode = 'intro', enterY = 0, warp = 0, wvel = 0, lastPos = 0;
  var rects = [], ROWS = 4, ROWH = 14, FH = 18, rows = [];
  function wrap(i) { return ((i % N) + N) % N; }
  function act(d) { var x = Math.min(1, Math.abs(d)); return 1 - x * x * (3 - 2 * x); }
  function smoothDamp(cur, tgt, dt) {
    var om = 2 / smooth, x = om * dt, e = 1 / (1 + x + .48 * x * x + .235 * x * x * x);
    var ch = cur - tgt, tmp = (vel + om * ch) * dt;
    vel = (vel - om * tmp) * e;
    return tgt + (ch + tmp) * e;
  }

  function place() {
    var base = Math.round(pos), list = [];
    for (var v = base - R; v <= base + R; v++) {
      var d = v - pos, a = act(d);
      list.push({ v: v, d: d, a: a, w: Ws + (Wa - Ws) * a, h: Hs + (Ha - Hs) * a, y: 0 });
    }
    var j = R, bj = list[j], nb = bj.d > 0 ? list[j - 1] : list[j + 1];
    bj.y = bj.d * ((bj.h + nb.h) / 2 + GAP);
    for (var k = j + 1; k < list.length; k++) list[k].y = list[k - 1].y + (list[k - 1].h + list[k].h) / 2 + GAP;
    for (k = j - 1; k >= 0; k--) list[k].y = list[k + 1].y - (list[k + 1].h + list[k].h) / 2 - GAP;
    return list;
  }

  var shown = -1;
  function drawFields(p) {
    var b = Math.floor(p);
    for (var i = 0; i < fieldEls.length; i++) {
      var f = fieldEls[i], sp = f._sp || (f._sp = [].slice.call(f.querySelectorAll('.wi-track > span')));
      for (var k = 0; k < sp.length; k++) {
        var v = b + k, d = v - p, s = sp[k];
        if (s._v !== v) { s._v = v; s.textContent = items[wrap(v)][f._key]; }
        s.style.transform = 'translate3d(0,' + (d * FH).toFixed(2) + 'px,0)';
        s.style.opacity = Math.max(0, 1 - Math.abs(d)).toFixed(3);
      }
    }
  }
  function buildRows() {
    fNames.innerHTML = ''; rows = []; drawnTp = null;
    for (var k = 0; k < ROWS + 2; k++) {
      var r = document.createElement('div'); r.className = 'wi-row';
      r.innerHTML = '<span></span>'; fNames.appendChild(r); rows.push(r);
      r.addEventListener('click', function () { if (mode !== 'intro' && this._v != null) goTo(this._v); });
    }
  }
  function drawRows(p) {
    var b = Math.floor(p);
    for (var k = 0; k < rows.length; k++) {
      var v = b - 1 + k, d = v - p, r = rows[k];
      if (r._v !== v) { r._v = v; r.firstChild.textContent = items[wrap(v)].name; }
      r.style.transform = 'translate3d(0,' + (d * ROWH).toFixed(2) + 'px,0)';
      r.firstChild.style.opacity = (.22 + .78 * Math.max(0, 1 - Math.abs(d))).toFixed(3);
    }
  }

  var mouse = { x: .5, y: .5, tx: .5, ty: .5, px: .5, py: .5, speed: 0, in: false }, lens = 0, meshKey = '', drawnKey = '', drawnTp = null;
  function frame() {
    var dt = Math.min(gsap.ticker.deltaRatio(60) / 60, .05);
    if (mode === 'free') pos = smoothDamp(pos, target, dt);
    var idx = Math.round(pos);
    if (idx !== shown) {
      if ((shown !== -1 || mode !== 'intro') && N) tick(wrap(idx));
      shown = idx;
    }
    var dpos = (pos - lastPos) / Math.max(dt * 60, .001); lastPos = pos;
    wvel += (dpos - wvel) * .16;
    var ai = Math.max(-1.5, Math.min(1.5, wvel * 30));
    var wt = Math.abs(ai) > .001 ? Math.sign(ai) * Math.pow(Math.abs(ai), 1.85) * .46 : 0;
    warp += (wt - warp) * .07;
    var tp = mode === 'free' ? pos : 0;
    if (!mob && N && (drawnTp === null || Math.abs(tp - drawnTp) > 1e-5)) { drawRows(tp); drawFields(tp); drawnTp = tp; }
    if (!renderer) return;
    var mk = [pos.toFixed(4), warp.toFixed(4), enterY.toFixed(2), headV, loaded, W, H, cy, mob].join('|');
    if (mk !== meshKey) {
      meshKey = mk;
      var list = N ? place() : []; rects = [];
      var BA = mob ? CFG.bendMob : CFG.bendDesk;
      pool.forEach(function (m, k) {
        var c = list[k];
        if (!c || N === 0) { m.visible = false; return; }
        var it = items[wrap(c.v)], u = m.material.uniforms, sy = cy + c.y + enterY;
        m.visible = sy + c.h / 2 > -40 && sy - c.h / 2 < H + 40 && (headV === null || c.v >= headV);
        m.position.set(0, H / 2 - sy, 0); m.scale.set(c.w, c.h, 1);
        u.uTex.value = it.tex || blank; u.uImgA.value = it.aspect;
        u.uSize.value.set(c.w, c.h); u.uGray.value = 1 - c.a; u.uOp.value = CFG.dim + (1 - CFG.dim) * c.a;
        u.uWarp.value = warp; u.uCy.value = H / 2 - cy - enterY; u.uVW.value = W; u.uMob.value = mob ? 1 : 0; u.uA.value = BA; u.uB.value = CFG.bendMobEdge;
        rects.push({ v: c.v, x: (W - c.w) / 2, y: sy - c.h / 2, w: c.w, h: c.h });
      });
    }
    mouse.x += (mouse.tx - mouse.x) * .1; mouse.y += (mouse.ty - mouse.y) * .1;
    var sp = Math.hypot(mouse.px - mouse.tx, mouse.py - mouse.ty); mouse.px = mouse.tx; mouse.py = mouse.ty;
    mouse.speed += (sp - mouse.speed) * .1;
    var on = mouse.in && !mob && mode === 'free' && hit(mouse.tx * W, (1 - mouse.ty) * H) != null;
    lens += ((on ? CFG.lens : 0) - lens) * .08;
    var velo = Math.min(mouse.speed, .05), pu = post.material.uniforms;
    pu.uMouse.value.set(mouse.x, mouse.y); pu.uAmt.value = Math.min(.6, lens + (on ? velo * 4 : 0)); pu.uRad.value = CFG.lensR + velo * 1.5;
    var rk = mk + '|' + pu.uMouse.value.x.toFixed(4) + '|' + pu.uMouse.value.y.toFixed(4) + '|' + pu.uAmt.value.toFixed(4) + '|' + pu.uRad.value.toFixed(4);
    if (rk === drawnKey) return;
    drawnKey = rk;
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(postScene, postCam);
  }
  function hit(x, y) {
    for (var k = 0; k < rects.length; k++) { var r = rects[k]; if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.v; }
    return null;
  }

  function goTo(v) {
    if (mode === 'intro') return;
    target = v; smooth = Math.min(.8, .34 + .08 * Math.abs(v - pos));
  }
  var wheelAcc = 0, wheelT = 0, anchor = 0;
  hero.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (mode === 'intro') return;
    var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1);
    if (!wheelT) anchor = Math.round(target);
    wheelAcc += dy;
    smooth = .42;
    target = anchor + wheelAcc / ((Ha + GAP) * CFG.wheel);
    clearTimeout(wheelT);
    wheelT = setTimeout(function () {
      var dd = target - anchor, s = Math.sign(dd);
      var steps = Math.abs(dd) < .12 ? 0 : Math.max(1, Math.round(Math.abs(dd)));
      target = anchor + s * steps; smooth = .36 + .04 * Math.min(steps, 6);
      wheelAcc = 0; wheelT = 0;
    }, 140);
  }, { passive: false });
  addEventListener('keydown', function (e) {
    if (mode === 'intro') return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { goTo(Math.round(target) + 1); e.preventDefault(); }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { goTo(Math.round(target) - 1); e.preventDefault(); }
  });
  var drag = null;
  hero.addEventListener('pointerdown', function (e) {
    if (mode === 'intro' || e.target.closest('a, button, .wi-names, [data-work-list]')) return;
    drag = { y: e.clientY, p: target, t: performance.now(), v: 0, ly: e.clientY, moved: false, id: e.pointerId };
  });
  addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / W; mouse.ty = 1 - (e.clientY - r.top) / H;
    mouse.in = e.pointerType === 'mouse' && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (mode !== 'intro') hero.classList.toggle('is-hover-card', mouse.in && hit(e.clientX - r.left, e.clientY - r.top) != null && !(e.target.closest && e.target.closest('a, button')));
    if (!drag || e.pointerId !== drag.id) return;
    var dy = e.clientY - drag.y;
    if (Math.abs(dy) > 6) drag.moved = true;
    if (!drag.moved) return;
    var now = performance.now(), dtm = Math.max(1, now - drag.t);
    drag.v = drag.v * .7 + ((drag.ly - e.clientY) / dtm) * .3; drag.ly = e.clientY; drag.t = now;
    smooth = .16; target = drag.p - dy / (Ha + GAP);
  }, { passive: true });
  function endDrag() {
    if (!drag) return;
    var d = drag; drag = null;
    if (!d.moved) return;
    var t = Math.round(target + d.v * 260 / (Ha + GAP));
    if (t === Math.round(d.p) && Math.abs(target - d.p) > .12) t += Math.sign(target - d.p);
    target = t; smooth = .38 + .04 * Math.min(6, Math.abs(t - pos));
  }
  addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);
  hero.addEventListener('click', function (e) {
    if (mode === 'intro' || e.target.closest('a, button, .wi-names, [data-work-list]')) return;
    var r = hero.getBoundingClientRect(), v = hit(e.clientX - r.left, e.clientY - r.top);
    if (v == null) return;
    if (v === Math.round(target) && Math.abs(pos - v) < .05) {
      var it = items[wrap(v)];
      document.dispatchEvent(new CustomEvent('osply:work-open', { detail: { index: wrap(v), item: it.root, link: it.el } }));
      if (it.el && it.el.click) it.el.click();
    } else goTo(v);
  });

  var lenisOn = typeof lenis !== 'undefined' && lenis;
  if (lenisOn) lenis.stop();
  function finish() {
    headV = null; mode = 'free'; target = pos = Math.round(pos);
    if (lenisOn) lenis.start();
  }

  function splitLines(el) {
    try { return SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line', aria: 'none' }).lines; }
    catch (e) { return [el]; }
  }

  function start() {
    layout(); buildRows();
    if (N) shown = 0;
    gsap.set(top, { y: H - 2 * REM - top.offsetHeight });
    gsap.set(letters, { y: 0, yPercent: 100, rotationX: 60 });
    if (navW) gsap.set(navW, { clipPath: 'inset(0% 100% 0% 0%)' });
    var navLines = [];
    navTexts.forEach(function (n) { navLines = navLines.concat(splitLines(n)); });
    gsap.set(navLines, { yPercent: 110, opacity: 0 });
    gsap.set(navTexts, { visibility: 'visible' });
    if (bottom) gsap.set(bottom, { opacity: 0 });
    gsap.set(line, { scaleX: 0 });
    var fields = fieldEls.map(function (f) { return f.querySelector('.wi-track'); }).filter(Boolean);
    var rowSpans = rows.map(function (r) { return r.firstChild; });
    gsap.set(fields, { yPercent: 110 });
    gsap.set(rowSpans, { yPercent: 110 });
    var LOOPS = N * CFG.loops;
    ENTER = H + Ha + Hs;
    enterY = ENTER; pos = -LOOPS; lastPos = pos; headV = -LOOPS - 1;
    D.classList.remove('osply-boot');
    gsap.ticker.add(frame);

    if (reduce || !N) {
      gsap.set(top, { y: 0 }); gsap.set(letters, { yPercent: 0, rotationX: 0 }); if (navW) gsap.set(navW, { clipPath: 'inset(0% 0% 0% 0%)' });
      gsap.set(navLines.concat(fields, rowSpans), { yPercent: 0, opacity: 1 });
      gsap.set(line, { scaleX: 1 }); if (bottom) gsap.to(bottom, { opacity: 1, duration: .6 });
      enterY = 0; pos = 0; if (pct) pct.remove(); finish(); return;
    }

    if (SOFT) {
      gsap.set(top, { y: 0 });
      gsap.set(fields.concat(rowSpans), { yPercent: 0 });
      gsap.set(line, { scaleX: 1 }); if (bottom) gsap.set(bottom, { opacity: 1 });
      enterY = 0; pos = 0; lastPos = 0; if (pct) pct.remove(); finish();
      if (window.osplyVT) window.osplyVT.go();
      var wait = window.osplyVT ? window.osplyVT.wait() : 0;
      gsap.set(navLines, { yPercent: 0, opacity: 1 });
      if (navW) {
        gsap.set(navW, { clipPath: 'inset(0% 0% 0% 0%)' });
        var navH = navW.offsetHeight;
        navW.style.overflow = 'hidden';
        var na = navW.animate([{ height: '0px' }, { height: navH + 'px' }], { duration: 1000, delay: wait * 1000, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
        na.onfinish = function () { navW.style.overflow = ''; na.cancel(); };
      }
      gsap.to(letters, { yPercent: 0, rotationX: 0, duration: 1.4, ease: 'expo.out', stagger: .035, delay: wait });
      return;
    }
    var t0 = performance.now(), ps = pct && pct.firstChild, bar = { p: 0 };
    function draw() {
      var p = bar.p;
      if (navW) gsap.set(navW, { clipPath: 'inset(0% ' + (100 - p).toFixed(2) + '% 0% 0%)' });
      if (pct && ps.isConnected) { ps.textContent = Math.round(p) + '%'; pct.style.left = 'calc(' + p.toFixed(2) + '% - ' + (ps.offsetWidth + .5 * REM) + 'px)'; }
    }
    function last() {
      if (N && loaded < N && (performance.now() - t0) / 1000 < CFG.maxLoad) return gsap.delayedCall(.1, last);
      reveal(navLines, fields, LOOPS, bar, draw);
    }
    gsap.timeline({ onComplete: last })
      .to(bar, { p: CFG.stops[0], duration: CFG.steps[0], ease: 'expo.inOut', onUpdate: draw })
      .to(bar, { p: CFG.stops[1], duration: CFG.steps[1], ease: 'expo.inOut', onUpdate: draw });
  }

  function reveal(navLines, fields, LOOPS, bar, draw) {
    var tl = gsap.timeline({ onComplete: finish }), LS = CFG.steps[2];
    tl.to(bar, { p: 100, duration: LS, ease: 'expo.inOut', onUpdate: draw }, 0);
    var A = Math.max(0, LS - CFG.lettersLead);
    tl.to(letters, { yPercent: 0, rotationX: 0, duration: 1.4, ease: 'expo.out', stagger: .035 }, A);
    if (pct) tl.to(pct.firstChild, { yPercent: -110, duration: .5, ease: 'power3.in', onComplete: function () { pct.remove(); } }, LS);
    tl.to(navLines, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'power4.out', stagger: .08 }, LS + .1);
    var S0 = CFG.spin, CUT = Math.max(0, Math.min(CFG.turn2Cut, S0 - CFG.turn2From - .1)), S = S0 - CUT, T1 = Math.min(CFG.turn2From, S - .1);
    var B = Math.max(0, A + CFG.listDelay), spinEase = gsap.parseEase('power3.inOut');
    function spinClock(t) { if (t <= T1) return t; var x = Math.min(1, (t - T1) / (S - T1)); return t + CUT * x * x * (3 - 2 * x); }
    tl.add(function () { mode = 'intro'; }, B);
    tl.to({ y: ENTER }, { y: 0, duration: 1.4, ease: 'power3.out', onUpdate: function () { enterY = this.targets()[0].y; } }, B);
    var sp = { t: 0 };
    tl.to(sp, { t: S, duration: S, ease: 'none', onUpdate: function () { pos = -LOOPS * (1 - spinEase(Math.min(1, spinClock(sp.t) / S0))); } }, B);
    tl.to(top, { y: 0, duration: CFG.topDur, ease: 'power3.inOut' }, B + CFG.topAt);
    var L = A + S - CFG.infoEarly + CFG.infoDelay;
    tl.to(line, { scaleX: 1, duration: 1.2, ease: 'expo.inOut' }, L);
    var rowSpans = rows.map(function (r) { return r.firstChild; });
    var cols = [fields[0], fields[1]].concat(rowSpans.slice(1, 1 + ROWS), [fields[2]]).filter(Boolean);
    tl.to(cols, { yPercent: 0, duration: .9, ease: 'power4.out', stagger: function (i) { return i < 2 ? i * .2 : i < cols.length - 1 ? .4 + (i - 2) * .04 : .6; } }, L + .15);
    tl.set(rowSpans, { yPercent: 0 }, L + 1.2);
    if (bottom) tl.to(bottom, { opacity: 1, duration: .8, ease: 'power2.out' }, L + 1.1);
  }

  (function adoptHeadings(tries) {
    var hs = [].slice.call(hero.querySelectorAll('[data-split="heading"]'));
    if (!hs.length) return;
    if (!window.ScrollTrigger) { hs.forEach(function (h) { h.classList.add('is-held'); }); return; }
    var done = 0;
    hs.forEach(function (h) {
      if (h._osply) { done++; return; }
      var st = ScrollTrigger.getAll().filter(function (s) { return s.trigger === h && s.animation; })[0];
      if (!st) return;
      var anim = st.animation; h._osply = true; done++;
      st.kill(false, true);
      anim.pause(0, false);
      h.classList.add('is-held');
      var d = parseFloat(h.getAttribute('data-split-delay')) || 0;
      if (SOFT) anim.progress(1);
      else gsap.delayedCall(Math.max(0, d - performance.now() / 1000), function () { anim.play(0); });
    });
    if (done < hs.length && tries < 60) setTimeout(function () { adoptHeadings(tries + 1); }, 100);
    else hs.forEach(function (h) { h.classList.add('is-held'); });
  })(0);

  var rz; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(layout, 120); });
  mqMob.addEventListener('change', layout);

  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise(function (r) { setTimeout(r, 1500); })]).then(start);
})();

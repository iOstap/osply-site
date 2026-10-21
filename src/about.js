// ------------- ABOUT: HERO PARALLAX ------------- //

document.addEventListener('DOMContentLoaded', function () {
  if (document.documentElement.classList.contains('w-editor')) return;
  var top = document.querySelector('.hero-top');
  var about = document.querySelector('.section-about') || document.querySelector('.section-2');
  if (!top || !about) return;
  var portrait = matchMedia('(orientation:portrait) and (max-width:820px),(orientation:portrait) and (hover:none) and (pointer:coarse)');
  function start() {
    if (!portrait.matches) return 'top bottom';
    var shift = Math.max(0, -parseFloat(getComputedStyle(about).marginTop) || 0);
    return 'top ' + Math.max(0, innerHeight - shift) + 'px';
  }
  osply.gsap().then(function () {
    gsap.fromTo(top, { yPercent: 0 }, { yPercent: -75, ease: 'none', scrollTrigger: { trigger: about, start: start, end: 'top top', scrub: 1, invalidateOnRefresh: true } });
  });
});



// ------------- ABOUT: HERO TITLE ------------- //

(function () {
  var imgs = [].slice.call(document.querySelectorAll('.hero-title .hero-letter img'));
  var wrap = document.querySelector('.hero-top .nav');
  if (!imgs.length && !wrap) return;
  var played = false, DUR = 1400, STAGGER = 35, GRID_DUR = 1000, GRID_EASE = 'cubic-bezier(.16,1,.3,1)';
  var EASE = (function () {
    if (!window.CSS || !CSS.supports('animation-timing-function', 'linear(0, 1)')) return GRID_EASE;
    var p = []; for (var i = 0; i <= 60; i++) { var t = i / 60; p.push((t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)).toFixed(4)); }
    return 'linear(' + p.join(',') + ')';
  })();
  var FROM = 'translateY(100%) rotateX(60deg)', TO = 'translateY(0) rotateX(0deg)';
  function openHeight() {
    wrap.classList.add('is-open');
    var h = wrap.getBoundingClientRect().height;
    wrap.classList.remove('is-open');
    return h + 'px';
  }
  function lit() { document.documentElement.classList.add('hero-lit'); }
  function done() { if (window.__aboutTitleRevealed) return; window.__aboutTitleRevealed = true; dispatchEvent(new Event('about:title-revealed')); }
  function show() {
    lit();
    imgs.forEach(function (el) { el.style.transform = 'none'; });
    if (wrap) wrap.classList.add('is-open');
    done();
  }
  function play() {
    if (played) return; played = true;
    lit();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return show();
    imgs.forEach(function (el, i) {
      var a = el.animate([{ transform: FROM }, { transform: TO }], { duration: DUR, delay: i * STAGGER, easing: EASE, fill: 'both' });
      a.onfinish = function () { el.style.transform = 'none'; a.cancel(); };
    });
    if (wrap) {
      var g = wrap.animate([{ height: '0px' }, { height: openHeight() }], { duration: GRID_DUR, easing: GRID_EASE, fill: 'both' });
      g.onfinish = function () { wrap.classList.add('is-open'); g.cancel(); };
    }
    setTimeout(done, Math.max(0, DUR + Math.max(0, imgs.length - 1) * STAGGER - 800));
  }
  addEventListener('basalt3d:title', play, { once: true });
  if (window.__basaltTitle) play();
  setTimeout(play, 9000);
})();



// ------------- ABOUT: FLIP CARD START (<= 820px + touch tablets) ------------- //

(function () {
  if (document.documentElement.classList.contains('w-editor')) return;
  var CFG = { maxW: 820, from: 50, fromPhone: 45, phoneW: 767, to: 40, over: .5, smooth: .14, tabMin: 600, tabFrom: 31.5, tabTo: 28 };
  var st = document.querySelector('[data-flip-start]');
  var hero = document.querySelector('.basalt-hero');
  var heroTop = hero && hero.querySelector('.hero-top');
  if (!st || !hero || !heroTop) return;
  var nav = heroTop.querySelector('.nav');
  var mq = matchMedia('(max-width: ' + CFG.maxW + 'px)');
  var phone = matchMedia('(max-width: ' + CFG.phoneW + 'px)');
  var touch = matchMedia('(hover: none) and (pointer: coarse)');
  var portrait = matchMedia('(orientation: portrait) and (max-width: 820px), (orientation: portrait) and (hover: none) and (pointer: coarse)');
  function tablet() { return touch.matches && Math.min(innerWidth, innerHeight) >= CFG.tabMin; }
  function on() { return mq.matches || tablet(); }
  function from() { return tablet() ? CFG.tabFrom : phone.matches ? CFG.fromPhone : CFG.from; }
  function to() { return tablet() ? CFG.tabTo : CFG.to; }
  function unit() { return tablet() ? 'vmin' : 'vw'; }
  var cur = from(), raf = 0;
  function scrollPos() { return window.__scroller ? window.__scroller.scrollTop : (window.scrollY || 0); }
  function shiftY() { var t = getComputedStyle(heroTop).transform; return t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0; }
  function navGrow() { return nav && !nav.classList.contains('is-open') ? Math.max(0, nav.scrollHeight - nav.offsetHeight) : 0; }
  function place() {
    if (!on()) return;
    var box = st.offsetParent || st.parentElement;
    var b = box.getBoundingClientRect(), hr = hero.getBoundingClientRect(), tr = heroTop.getBoundingClientRect();
    if (portrait.matches) { st.style.top = (hr.top + hr.height / 2 - b.top) + 'px'; return; }
    st.style.top = ((tr.bottom - shiftY() + navGrow() + Math.min(hr.bottom, hr.top + innerHeight)) / 2 - b.top) + 'px';
  }
  function target() {
    var p = Math.min(1, Math.max(0, scrollPos() / (innerHeight * CFG.over)));
    p = p * p * (3 - 2 * p);
    var f = from();
    return f + (to() - f) * p;
  }
  function tick() {
    raf = 0;
    if (!on()) return;
    var t = target();
    cur += (t - cur) * CFG.smooth;
    if (Math.abs(t - cur) < .01) cur = t;
    st.style.width = cur.toFixed(3) + unit();
    if (cur !== t) raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf && on()) raf = requestAnimationFrame(tick); }
  function apply() {
    if (on()) { st.style.maxWidth = 'none'; cur = target(); st.style.width = cur + unit(); place(); }
    else { st.style.top = ''; st.style.width = ''; st.style.maxWidth = ''; }
  }
  apply();
  document.addEventListener('scroll', wake, { passive: true, capture: true });
  var rz; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(apply, 120); });
  [mq, phone, touch, portrait].forEach(function (m) { m.addEventListener('change', apply); });
  addEventListener('load', place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  var ro = new ResizeObserver(place); ro.observe(heroTop); ro.observe(hero);
})();



// ------------- ABOUT: SCROLL DOWN ARROWS ------------- //

(function () {
  if (document.documentElement.classList.contains('w-editor')) return;
  var el = document.querySelector('.scroll-down-about');
  if (!el || !window.osply || !matchMedia('(min-width: 992px) and (hover: hover) and (pointer: fine)').matches) return;
  osply.gsap().then(function () { osply.arrowFx(el); });
})();



// ------------- ABOUT: SERVICES WARP ------------- //

import * as THREE from 'three';
(function () {
  if (document.documentElement.classList.contains('w-editor')) return;
  var ITEMS = ['Brand Identity', 'Digital Experiences', 'UI Design', '3D & Motion', 'Web Development', 'AI Integration'];
  var LIST = ITEMS, GAP = .14, DIM = .1, TALL = .64, FONT = '"Lay Grotesk",Arial,sans-serif';
  var sec = document.querySelector('.services-warp');
  if (!sec) return;
  sec.setAttribute('aria-label', 'Services');
  sec.insertAdjacentHTML('afterbegin', '<ul class="services-warp_list">' + ITEMS.map(function (t) { return '<li>' + t.replace(/&/g, '&amp;') + '</li>'; }).join('') + '</ul><div class="services-warp_canvas" aria-hidden="true"></div>');
  var host = sec.querySelector('.services-warp_canvas');
  window.__warpActive = 0;
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' }); }
  catch (e) { sec.classList.add('is-fallback'); return; }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  host.appendChild(renderer.domElement);
  var W = 1, H = 1, DPR = 1, mobile = false, portrait = false, tall = false, loops = 1, F = 60, A = 80, P = 800, NE = .6, R = 300;
  var scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10), rt = new THREE.WebGLRenderTarget(2, 2), geo = new THREE.PlaneGeometry(1, 1), tex = {}, meshes = [];
  function setFont(x, px) { x.font = '500 ' + px + 'px ' + FONT; try { x.letterSpacing = (-.05 * px) + 'px'; } catch (e) {} }
  function makeLabel(text) {
    var c = document.createElement('canvas'), x = c.getContext('2d'), px = Math.round(F * DPR), str = text.toUpperCase();
    setFont(x, px);
    var w = Math.ceil(x.measureText(str).width + px * .3), h = Math.ceil(px * 1.2);
    c.width = w; c.height = h; setFont(x, px);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(str, w / 2, h / 2 + px * .04);
    var t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.userData = { w: w / DPR, h: h / DPR };
    return t;
  }
  function buildLabels() {
    Object.keys(tex).forEach(function (k) { tex[k].dispose(); }); tex = {};
    ITEMS.forEach(function (t) { tex[t] = makeLabel(t); });
    while (meshes.length < LIST.length) { var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false })); meshes.push(m); scene.add(m); }
    while (meshes.length > LIST.length) { var r = meshes.pop(); scene.remove(r); r.material.dispose(); }
    meshes.forEach(function (m, i) { var t = tex[LIST[i]]; m.material.map = t; m.material.needsUpdate = true; m.scale.set(t.userData.w, t.userData.h, 1); });
  }
  var post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tMap: { value: rt.texture }, uD: { value: -.9 }, uD2: { value: -.6 }, uBg: { value: new THREE.Vector3(14 / 255, 14 / 255, 14 / 255) }, uEdgeFade: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'uniform sampler2D tMap;uniform float uD;uniform float uD2;uniform vec3 uBg;uniform float uEdgeFade;varying vec2 vUv;void main(){vec2 c=vUv-.5;float r2=dot(c,c);c*=1.+uD*r2+uD2*r2*r2;vec4 t=texture2D(tMap,c+.5);float e=1.;if(uEdgeFade>0.){e=smoothstep(0.,uEdgeFade,vUv.y)*smoothstep(0.,uEdgeFade,1.-vUv.y);}float a=t.a*e;gl_FragColor=vec4(uBg*(1.-a)+t.rgb*e,1.);}',
    depthTest: false, depthWrite: false
  }));
  var postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(post);
  function capHeight() { var x = document.createElement('canvas').getContext('2d'); x.font = '500 100px ' + FONT; return (x.measureText('H').actualBoundingBoxAscent || 70) / 100; }
  function widest() { var x = document.createElement('canvas').getContext('2d'), m = 0; setFont(x, 100); ITEMS.forEach(function (t) { m = Math.max(m, x.measureText(t.toUpperCase()).width); }); return m / 100 || 10; }
  var state = { p: 0 }, drawn = -1, dirty = true, visible = false;
  function layout() {
    W = sec.clientWidth || innerWidth; H = sec.clientHeight || innerHeight;
    portrait = H > W; mobile = W < 768 || portrait; tall = !mobile && H / W > TALL;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    F = portrait ? W * .085 : mobile ? W * .12 : Math.min(W * .09, H * .13);
    F = Math.min(F, W * (portrait ? .76 : mobile ? .68 : .62) / widest());
    A = F * (capHeight() + (portrait ? .32 : GAP));
    if (mobile || tall) {
      loops = Math.max(3, Math.ceil(H * (tall ? 1.1 : .7) / (A * ITEMS.length)));
      LIST = []; for (var i = 0; i < loops; i++) LIST = LIST.concat(ITEMS);
    } else { loops = 1; LIST = ITEMS; }
    P = A * LIST.length; NE = (portrait ? 1.15 : 1) / loops; R = A * 3;
    post.material.uniforms.uD.value = mobile ? -.75 : -.9;
    post.material.uniforms.uEdgeFade.value = portrait ? .12 : 0;
    renderer.setPixelRatio(DPR); renderer.setSize(W, H, false); rt.setSize(Math.round(W * DPR), Math.round(H * DPR));
    cam.left = -W / 2; cam.right = W / 2; cam.top = H / 2; cam.bottom = -H / 2; cam.updateProjectionMatrix();
    buildLabels(); dirty = true;
  }
  function render() {
    if (!visible || (!dirty && drawn === state.p)) return;
    drawn = state.p; dirty = false;
    var best = 0, bestD = 1e9;
    meshes.forEach(function (m, i) {
      var re = -i * A + (state.p - .25) * P * NE;
      re = (((re + P / 2) % P) + P) % P - P / 2;
      m.position.y = re;
      var d = Math.abs(re); if (d < bestD) { bestD = d; best = i; }
      var a = Math.pow(Math.max(0, 1 - d / R), 3), e = Math.min(1, Math.max(0, (P / 2 - d) / A));
      m.material.opacity = (DIM + (1 - DIM) * a) * e * e * (3 - 2 * e);
    });
    window.__warpActive = best % ITEMS.length;
    renderer.setRenderTarget(rt); renderer.render(scene, cam);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  }
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) { dirty = true; render(); } }, { rootMargin: '100px 0px' }).observe(sec);
  var rz;
  addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (sec.clientWidth !== W || sec.clientHeight !== H) layout(); }, 150); });
  layout();
  if (document.fonts && document.fonts.load) document.fonts.load('500 64px "Lay Grotesk"').then(layout, function () {});
  osply.gsap().then(function () {
    gsap.fromTo(state, { p: 0 }, { p: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: .5 } });
    gsap.ticker.add(render);
    ScrollTrigger.refresh();
  });
  addEventListener('load', function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
})();



// ------------- ABOUT: FLIPPING CARD ------------- //

(function () {
  var root = document.documentElement;
  var track = root.classList.contains('w-editor') ? null : document.querySelector('[data-flip-track]');
  function shown() { root.classList.add('flip-shown'); }
  if (!track) { shown(); return; }
  var ds = track.dataset;
  var CFG = {
    midX: .5, startAt: parseFloat(ds.flipStartAt) || .9, burnEnd: parseFloat(ds.flipBurnEnd) || .8, glitch: 1,
    turn: 360, reveal: 2, revealDelay: .1, tilt: .3, bend: 1.3, maxVel: 2000, svgScale: 2, segments: 32, volume: .3
  };
  setTimeout(shown, 12000);
  var titleAt = window.__basaltTitle ? performance.now() : -1;
  addEventListener('basalt3d:title', function () { if (titleAt < 0) titleAt = performance.now(); }, { once: true });

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return .5 - .5 * Math.cos(Math.PI * clamp(t, 0, 1)); }

  var actx = null, lastClick = 0;
  function unlockAudio() {
    try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {}
  }
  function click(i) {
    if (!actx || actx.state !== 'running') return;
    var now = performance.now();
    if (now - lastClick < 45) return;
    lastClick = now;
    var t = actx.currentTime, v = CFG.volume, f0 = 110 * Math.pow(1.07, (i || 0) % 6);
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

  function makeTex(source, w, h, renderer) {
    var t = new THREE.Texture(source);
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.needsUpdate = true;
    return { tex: t, w: w, h: h };
  }
  function loadImage(src, cors) {
    return new Promise(function (res, rej) {
      var im = new Image();
      if (cors) im.crossOrigin = 'anonymous';
      im.decoding = 'async'; im.onload = function () { res(im); }; im.onerror = rej; im.src = src;
    });
  }
  function isSvg(src) { return /\.svg(\?|#|$)/i.test(src) || /^data:image\/svg/i.test(src); }
  function loadSvgTexture(src, targetW, renderer) {
    return fetch(src, { mode: 'cors' }).then(function (r) { return r.text(); }).then(function (txt) {
      var svg = new DOMParser().parseFromString(txt, 'image/svg+xml').documentElement;
      var vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(parseFloat);
      var iw = vb[2] || parseFloat(svg.getAttribute('width')) || 1000;
      var ih = vb[3] || parseFloat(svg.getAttribute('height')) || 1000;
      if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 ' + iw + ' ' + ih);
      var maxTex = Math.min(renderer.capabilities.maxTextureSize, 4096);
      var W = Math.round(clamp(targetW, 256, maxTex)), H = Math.round(W * ih / iw);
      if (H > maxTex) { W = Math.round(W * maxTex / H); H = maxTex; }
      svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('preserveAspectRatio', 'none');
      var url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      return loadImage(url, false).then(function (im) {
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        c.getContext('2d').drawImage(im, 0, 0, W, H);
        URL.revokeObjectURL(url);
        return makeTex(c, W, H, renderer);
      });
    });
  }
  function loadSrc(src, targetW, renderer) {
    if (!src) return Promise.resolve(null);
    if (isSvg(src)) return loadSvgTexture(src, targetW, renderer);
    return loadImage(src, true).then(function (im) { return makeTex(im, im.naturalWidth, im.naturalHeight, renderer); });
  }
  function imgSrc(img) { return img ? (img.currentSrc || img.getAttribute('src')) : null; }

  var VERT = [
    'uniform vec2 uSize;uniform float uBendY;uniform float uBendX;uniform float uFlutter;uniform float uTime;',
    'varying vec2 vUv;varying float vShade;',
    'void main(){',
    '  vUv = uv;',
    '  vec3 p = position;',
    '  float z = uBendY * p.y * p.y * 4.0 * uSize.y * 0.22 + uBendX * p.x * p.x * 4.0 * uSize.x * 0.22;',
    '  z += sin(p.x * 5.0 + uTime * 2.6) * sin(p.y * 3.5 + uTime * 1.9) * uFlutter * uSize.x * 0.03;',
    '  vShade = z / (max(uSize.x, uSize.y) * 0.22);',
    '  p.z = z;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform sampler2D uFront;uniform sampler2D uBack;uniform vec2 uSize;uniform vec2 uFrontRes;uniform vec2 uBackRes;',
    'uniform float uReveal;uniform float uBurn;uniform float uGlitch;uniform float uTime;',
    'varying vec2 vUv;varying float vShade;',
    'float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
    'float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }',
    'float fbm(vec2 p){ float a=0.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,9.3); a*=0.5; } return s; }',
    'vec2 cover(vec2 uv, vec2 s, vec2 i){ float r = max(s.x / i.x, s.y / i.y); vec2 n = i * r; return uv * s / n + (n - s) * 0.5 / n; }',
    'vec3 spec(float t){ float lo = step(t, 0.5); float w = clamp(1.0 - abs(2.0 * clamp((t - 1.0 / 6.0) / (4.0 / 6.0), 0.0, 1.0) - 1.0), 0.0, 1.0);',
    '  return pow(vec3(lo, 1.0, 1.0 - lo) * vec3(1.0 - w, w, 1.0 - w), vec3(1.0 / 2.2)); }',
    'vec4 tex(vec2 uv){',
    '  if (gl_FrontFacing) return texture2D(uFront, cover(uv, uSize, uFrontRes));',
    '  return texture2D(uBack, cover(vec2(1.0 - uv.x, uv.y), uSize, uBackRes));',
    '}',
    'void main(){',
    '  vec4 c = tex(vUv);',
    '  float s = clamp(vShade, -1.0, 1.0);',
    '  c.rgb *= 1.0 - abs(s) * 0.22;',
    '  c.rgb += max(s, 0.0) * 0.05;',
    '  if (uReveal < 1.0) {',
    '    vec2 q = (vUv - 0.5) * 2.0; float d = max(abs(q.x), abs(q.y)); d = mix(d, length(q) * 0.7071, 0.55);',
    '    vec2 np = vec2(vUv.x * uSize.x / uSize.y, vUv.y) * 3.5;',
    '    float n = fbm(np + vec2(0.2, 0.13) * uTime + fbm(np * 0.7 - 0.1 * uTime) * 1.2);',
    '    float f = d * 0.58 + n * 0.672;',
    '    float aa = fwidth(f) * 1.2 + 0.002;',
    '    c.a *= smoothstep(f - aa, f + aa, mix(0.0, 1.31, uReveal));',
    '  }',
    '  if (uBurn > 0.0) {',
    '    vec2 np = vec2(vUv.x * uSize.x / uSize.y, vUv.y);',
    '    float n1 = fbm(np * 3.2 + vec2(0.0, -uTime * 0.22));',
    '    float n2 = vn(np * 24.0 + vec2(uTime * 0.4, -uTime * 2.2));',
    '    float on = smoothstep(0.0, 0.035, uBurn);',
    '    float d0 = vUv.y - mix(-0.22, 1.24, uBurn) + (n1 - 0.5) * 0.3 + (n2 - 0.5) * 0.04;',
    '    float aa = fwidth(d0) * 1.5 + 0.0015;',
    '    float band = (1.0 - smoothstep(0.0, 0.16, abs(d0))) * on * uGlitch;',
    '    float fl = smoothstep(0.3, 0.7, vn(vec2(np.x * 3.0 + uTime * 0.35, uTime * 0.2)));',
    '    vec2 dir = normalize(vec2((n1 - 0.5) * 1.2, 1.0)) * mix(-1.0, 1.0, fl);',
    '    float amt = 0.04 * band;',
    '    vec3 sum = vec3(0.0), sw = vec3(0.0), sa = vec3(0.0);',
    '    for (int i = 0; i < 7; i++) {',
    '      float k = float(i) / 6.0;',
    '      vec3 w = spec(k);',
    '      float o = (k - 0.5) * amt;',
    '      vec4 t = tex(vUv + dir * o);',
    '      float m = smoothstep(-aa, aa, d0 + dir.y * o) * t.a;',
    '      sum += w * t.rgb * m; sa += w * m; sw += w;',
    '    }',
    '    vec3 pc = sum / sw, pa = sa / sw;',
    '    float A = max(max(pa.r, pa.g), pa.b);',
    '    vec3 rc = pc / max(A, 1e-4) * (1.0 - abs(s) * 0.22) + max(s, 0.0) * 0.05;',
    '    float cut = smoothstep(-aa, aa, d0) * c.a;',
    '    float useR = step(0.001, band);',
    '    c.rgb = mix(c.rgb, rc, useR * smoothstep(0.0, 0.25, band));',
    '    c.a = mix(mix(c.a, cut, on), A, useR * smoothstep(0.0, 0.25, band));',
    '  }',
    '  gl_FragColor = c;',
    '}'
  ].join('\n');

  function init() {
    var startEl = track.querySelector('[data-flip-start]');
    var listEl = track.querySelector('[data-flip-services]');
    var frontImg = track.querySelector('img[data-flip="front"]');
    var backImg = track.querySelector('img[data-flip="back"]') || frontImg;
    if (!startEl || !frontImg) return shown();

    ['pointerdown', 'pointerup', 'click', 'touchend', 'keydown'].forEach(function (ev) { addEventListener(ev, unlockAudio, { passive: true, capture: true }); });

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    var centerMode = matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (getComputedStyle(track).position === 'static') track.style.position = 'relative';
    canvas.style.cssText = (centerMode ? 'position:fixed;' : 'position:absolute;will-change:transform;') + 'left:0;top:0;pointer-events:none;z-index:1;';
    track.appendChild(canvas);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene(), DIST = 1500, camera = new THREE.PerspectiveCamera(45, 1, 10, 6000);
    camera.position.z = DIST;

    var vw = 0, vh = 0, TURN = Math.round(CFG.turn / 180) * Math.PI;
    function resize() {
      vw = innerWidth; vh = innerHeight;
      renderer.setSize(vw, vh, false);
      canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
      camera.aspect = vw / vh;
      camera.fov = 2 * Math.atan(vh / 2 / DIST) * 180 / Math.PI;
      camera.updateProjectionMatrix();
    }
    resize();

    var uniforms = {
      uFront: { value: null }, uBack: { value: null },
      uFrontRes: { value: new THREE.Vector2(1, 1) }, uBackRes: { value: new THREE.Vector2(1, 1) },
      uSize: { value: new THREE.Vector2(1, 1) },
      uBendY: { value: 0 }, uBendX: { value: 0 }, uFlutter: { value: 0 }, uTime: { value: 0 },
      uReveal: { value: 0 }, uBurn: { value: 0 }, uGlitch: { value: CFG.glitch }
    };
    var revT0 = -1, rev = 0, revArmed = titleAt >= 0;
    function startReveal() { revArmed = true; }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { rev = 1; shown(); }
    else { addEventListener('basalt3d:title', startReveal, { once: true }); setTimeout(startReveal, 9000); }
    var mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, CFG.segments, CFG.segments),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniforms, side: THREE.DoubleSide, transparent: true, extensions: { derivatives: true } })
    );
    mesh.visible = false;
    scene.add(mesh);

    var domShown = 'init';
    function showDom(which) {
      if (which === domShown) return;
      domShown = which;
      frontImg.style.opacity = which === 'start' ? '' : '0';
    }
    var T = { front: null, back: null }, curFront = null, curBack = null, rowKey = null;
    function setFront(t) { if (!t || t === curFront) return; curFront = t; uniforms.uFront.value = t.tex; uniforms.uFrontRes.value.set(t.w, t.h); }
    function setBack(t) { if (!t || t === curBack) return; curBack = t; uniforms.uBack.value = t.tex; uniforms.uBackRes.value.set(t.w, t.h); }

    function scrollPos() { return window.__scroller ? window.__scroller.scrollTop : window.scrollY; }
    var lastY = scrollPos(), lastCx = null, vel = 0, bendY = 0, bendX = 0, flutter = 0, flight = 0, time = 0;
    var idleY = null, idleAt = 0, drawnKey = '', cleared = false, burn = 0, lastPhase = 0;

    function frame(t, dtMs) {
      var dt = Math.max(dtMs, 1) / 1000, y0 = scrollPos();
      var settled = Math.abs(bendY) < 1e-3 && Math.abs(bendX) < 1e-3 && flutter < 1e-3 && (rev >= 1 || (revT0 < 0 && !revArmed)) && !(burn > 0 && burn < 1 && lastPhase === 1);
      if (y0 === idleY && settled && innerWidth === vw && innerHeight === vh && t - idleAt < 500) return;
      if (y0 !== idleY || !settled || t - idleAt >= 500) idleAt = t;
      idleY = y0;
      time += dt;
      if (rev < 1) {
        if (revT0 < 0 && lastPhase !== 0) { rev = 1; shown(); }
        else if (revT0 < 0 && revArmed) {
          var sr = startEl.getBoundingClientRect();
          if (sr.top < innerHeight * .92 && sr.bottom > 0) revT0 = performance.now() + CFG.revealDelay * 1000;
        }
        if (revT0 >= 0 && rev < 1) {
          var rx = clamp((performance.now() - revT0) / (CFG.reveal * 1000), 0, 1);
          rev = 1 - Math.pow(1 - rx, 3);
          if (rx >= 1) { rev = 1; shown(); }
        }
      }
      uniforms.uReveal.value = rev;

      if (innerWidth !== vw || innerHeight !== vh) resize();
      if (!vw || !vh) return;

      var c = vh / 2;
      if (!centerMode) {
        var tr = track.getBoundingClientRect();
        canvas.style.transform = 'translate3d(' + (-tr.left) + 'px,' + (-tr.top) + 'px,0)';
      }
      var s = startEl.getBoundingClientRect(), L = listEl ? listEl.getBoundingClientRect() : { top: s.bottom, bottom: s.bottom };
      var midX = vw * CFG.midX, scx = s.left + s.width / 2, scy = s.top + s.height / 2;
      var dT = centerMode ? scy - c : scy - vh * CFG.startAt;
      var d1 = L.top - c, dM = (L.top + L.bottom) / 2 - c, dL = L.bottom - (c - s.height / 2);

      var cx, cy, w = s.width, h = s.height, rotY = 0, turn = 0, leg = 0, phase;
      var atStart = centerMode ? (y0 <= 1 || dT > (lastPhase === 0 ? -4 : -1)) : dT > 0;
      if (atStart) { phase = 0; cx = scx; cy = scy; }
      else if (dL <= 0) { phase = 4; cx = midX; cy = c; rotY = TURN; }
      else if (centerMode) {
        phase = 1;
        cx = dM > 0 ? lerp(scx, midX, ease(clamp(-dT / Math.max(d1 - dT, 1), 0, 1))) : midX;
        cy = c;
      } else {
        phase = 1;
        if (dM > 0) {
          var tA = clamp(-dT / Math.max(dM - dT, 1), 0, 1), gapA = vh * CFG.startAt - c;
          cx = lerp(scx, midX, ease(tA));
          cy = gapA > 1 ? c + gapA * Math.pow(1 - tA, Math.max(1, (dM - dT) / gapA)) : lerp(scy, c, ease(tA));
        } else { cx = midX; cy = c; }
      }
      if (phase === 1) {
        if (d1 > 0) { leg = 1; turn = clamp(-dT / Math.max(d1 - dT, 1), 0, 1); }
        else { leg = 2; turn = clamp(-d1 / Math.max(dL - d1, 1), 0, 1); }
        rotY = TURN * clamp(-dT / Math.max(dL - dT, 1), 0, 1);
      }
      burn = phase === 4 ? 1 : phase === 0 ? 0 : clamp((cy + h / 2 - L.top) / Math.max(h / 2 + (L.bottom - L.top) * CFG.burnEnd, 1), 0, 1);
      uniforms.uBurn.value = burn;
      var tilt = -Math.sin(Math.PI * turn) * CFG.tilt;

      if (leg === 2) {
        var key = 'r' + (window.__warpActive || 0);
        if (key !== rowKey) { if (rowKey !== null) click(window.__warpActive || 0); rowKey = key; }
      } else rowKey = null;
      setFront(T.front); setBack(T.back || T.front);

      var y = scrollPos(), v = (y - lastY) / dt; lastY = y;
      vel = lerp(vel, v, .18);
      var dx = lastCx === null ? 0 : (cx - lastCx) / dt; lastCx = cx;
      flight = lerp(flight, phase === 1 ? 1 : 0, .1);
      var tY = clamp(-vel / CFG.maxVel, -1, 1) * .9 * CFG.bend * flight;
      var tX = clamp(dx / CFG.maxVel, -1, 1) * .7 * CFG.bend * flight;
      bendY = lerp(bendY, tY, .09);
      bendX = lerp(bendX, tX, .09);
      flutter = lerp(flutter, Math.min(Math.abs(tY) + Math.abs(tX), 1) * flight, .06);

      mesh.rotation.set(tilt, rotY, 0);
      mesh.position.set(cx - vw / 2, -(cy - vh / 2), 0);
      mesh.scale.set(w, h, 1);
      uniforms.uSize.value.set(w, h);
      uniforms.uBendY.value = bendY;
      uniforms.uBendX.value = bendX;
      uniforms.uFlutter.value = flutter;
      uniforms.uTime.value = time;

      var rest = phase === 0 && rev >= 1 ? 'start' : null;
      if (rest) { bendY = bendX = flutter = vel = 0; }
      showDom(rest);
      lastPhase = phase;

      mesh.visible = (phase === 1 || (phase === 0 && rev < 1)) && burn < 1;
      var off = rest || rev <= 0 || phase === 4 || burn >= 1 || cy + h < -h || cy - h > vh + h;
      if (!off) {
        var rk = [cx, cy, w, h, rotY, tilt, bendY, bendX, rev, burn, curFront && curFront.tex.id, curBack && curBack.tex.id].join('|');
        if (rk !== drawnKey || flutter > 1e-3 || (burn > 0 && burn < 1 && phase === 1)) { renderer.render(scene, camera); drawnKey = rk; }
        cleared = false;
      } else if (!cleared) { renderer.clear(); cleared = true; drawnKey = ''; }
    }

    var texW = startEl.offsetWidth * Math.min(window.devicePixelRatio || 1, 2) * CFG.svgScale, started = false;
    function startLoop() {
      if (started) return; started = true;
      mesh.visible = true;
      root.classList.add('flip-ready');
      var last = performance.now();
      (function loop(now) { frame(now, now - last); last = now; requestAnimationFrame(loop); })(last);
    }
    loadSrc(imgSrc(frontImg), texW, renderer).then(function (front) {
      T.front = T.back = front;
      setFront(front); setBack(front);
      startLoop();
      return loadSrc(imgSrc(backImg), texW, renderer).catch(function () { return null; }).then(function (b) {
        T.back = b || front;
        drawnKey = ''; idleY = null;
      });
    }).catch(function () {
      if (!started) { canvas.remove(); showDom('start'); }
      shown();
    });
  }

  try { init(); } catch (e) { shown(); }
})();



// ------------- ABOUT: BASALT 3D HERO ------------- //

const root = document.querySelector('[data-basalt3d]');
const portrait = matchMedia('(orientation:portrait) and (max-width:820px),(orientation:portrait) and (hover:none) and (pointer:coarse)');
function releaseTitle(){if(window.__basaltTitle)return;window.__basaltTitle=true;dispatchEvent(new Event('basalt3d:title'));}
if(root&&!document.documentElement.classList.contains('w-editor')){if(portrait.matches){requestAnimationFrame(releaseTitle);}else{import('three').then(function(THREE){init(root,THREE);}).catch(function(e){console.error('[basalt3d]',e);releaseTitle();});}}
function init(root,THREE) {
  const A = JSON.parse(document.getElementById('basalt3d-config').textContent);
  const host = root.querySelector('[data-basalt3d-canvas]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mobile = !fine || Math.min(innerWidth, innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false });
  let dpr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  host.appendChild(renderer.domElement);
  let texOK = false, meshOK = false, ready = false, t0 = -1, titled = false;
  const reveal = () => {
    if (!texOK || !meshOK || ready) return;
    ready = true; t0 = performance.now(); resize(); frame();
    requestAnimationFrame(() => host.classList.add('is-ready'));
    wake();
  };
  THREE.DefaultLoadingManager.onLoad = () => { texOK = true; reveal(); };
  setTimeout(() => { texOK = true; reveal(); }, 8000);

  const BG = new THREE.Color(A.bg);
  const scene = new THREE.Scene();
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, A.fogNear, A.fogFar);
  renderer.setClearColor(BG, 1);

  const rig = new THREE.Group(); rig.position.set(...A.pivot); scene.add(rig);
  const camera = new THREE.PerspectiveCamera(A.vfov, 16 / 9, .05, 60);
  const camBase = new THREE.Vector3(0, 0, 0).sub(rig.position);
  camera.position.copy(camBase); rig.add(camera);

  const tl = new THREE.TextureLoader();
  const tex = url => { const t = tl.load(url); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; };

  const rockMats = A.rocks.map(r => {
    const m = new THREE.MeshBasicMaterial({ map: tex(r.bake), fog: true });
    m.color.setScalar(r.gain ?? 1);
    const ct = r.contrast ?? 1, sf = r.soften ?? 0;
    if (ct !== 1 || sf) {
      m.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vMapUv, ${sf.toFixed(2)} );
        float lumC = 0.08; sampledDiffuseColor.rgb = max( vec3( lumC ) + ( sampledDiffuseColor.rgb - vec3( lumC ) ) * ${ct.toFixed(3)}, 0. );
        diffuseColor *= sampledDiffuseColor;
        #endif`); };
      m.customProgramCacheKey = () => 'rock' + ct + '_' + sf;
    }
    return m;
  });
  const rockMeshes = [];
  let portraitK = 0;
  function placeRocks() {
    A.rocks.forEach((r, n) => {
      const mesh = rockMeshes[n]; if (!mesh) return;
      const o = A.portrait.rocks[n] || {}, k = portraitK;
      const p = r.p.map((v, i) => v + (o.dp || [0, 0, 0])[i] * k), s = r.s * (1 + ((o.ds ?? 1) - 1) * k);
      mesh.matrix.compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r.r.map(d => d * Math.PI / 180), 'YXZ')), new THREE.Vector3(s, s, s));
      mesh.matrixWorldNeedsUpdate = true;
    });
  }
  const onMesh = (h, raw) => {
    let o = 0; const take = (T, n) => { const a = new T(raw, o, n); o += n * T.BYTES_PER_ELEMENT; return a; };
    const q = take(Uint16Array, h.v * 3), uv = take(Uint16Array, h.v * 2), idx = take(Uint16Array, h.i), nrm = take(Int8Array, h.v * 3);
    const pos = new Float32Array(h.v * 3);
    for (let i = 0; i < h.v * 3; i++) pos[i] = h.lo[i % 3] + q[i] * h.sc[i % 3];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3, true));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2, true));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    A.rocks.forEach((r, n) => {
      const mesh = new THREE.Mesh(geo, rockMats[n]);
      mesh.matrixAutoUpdate = false; mesh.renderOrder = 0; scene.add(mesh); rockMeshes[n] = mesh;
    });
    placeRocks();
    meshOK = true; reveal();
  };
  fetch(A.model, { mode: 'cors' }).then(r => r.blob())
    .then(b => createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }))
    .then(bmp => {
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
      const px = g.getImageData(0, 0, bmp.width, bmp.height).data, n = A.mesh.n, out = new Uint8Array(n);
      for (let i = 0, j = 0; j < n; i += 4) { out[j++] = px[i]; if (j < n) out[j++] = px[i + 1]; if (j < n) out[j++] = px[i + 2]; }
      onMesh(A.mesh, out.buffer);
    }).catch(e => console.error('[basalt3d]', e));

  const dRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  dRT.depthTexture = new THREE.DepthTexture(1, 1); dRT.depthTexture.type = THREE.UnsignedIntType;
  const SOFTU = () => ({ dTex: { value: dRT.depthTexture }, cn: { value: camera.near }, cf: { value: camera.far }, vres: { value: new THREE.Vector2(1, 1) } });
  const SOFT = `#include <packing>
    uniform sampler2D dTex; uniform float cn, cf; uniform vec2 vres; varying float vVz;
    float soft(float k){ float d=texture2D(dTex, gl_FragCoord.xy/vres).x; float sz=perspectiveDepthToViewZ(d,cn,cf); return smoothstep(0.,k,vVz-sz); }`;
  const softMats = [];
  const NOISE = `
    float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float a=0.5, s=0.; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,9.3); a*=0.5; } return s; }`;

  const smokeMat = o => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { ...SOFTU(), time: { value: 0 }, op: { value: o.op }, sp: { value: o.sp }, col: { value: new THREE.Color(o.c ?? '#d8d8d8') }, seed: { value: o.seed }, edge: { value: new THREE.Vector4(...(o.edge || [0, .35, .15, .15])) } },
    vertexShader: 'varying vec2 vUv; varying float vVz; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vVz=mv.z; gl_Position=projectionMatrix*mv; }',
    fragmentShader: SOFT + NOISE + `varying vec2 vUv; uniform float time, op, sp, seed; uniform vec3 col; uniform vec4 edge;
      void main(){
        vec2 p=vUv*vec2(3.2,1.6)+vec2(seed*7.1,seed*3.3);
        vec2 w=vec2(fbm(p+vec2(time*sp,time*sp*0.3)), fbm(p+vec2(5.2,1.3)-vec2(time*sp*0.7,0.)));
        float d=smoothstep(0.32,0.85,fbm(p*1.3+w*1.7+vec2(time*sp*0.5,0.)));
        float m=smoothstep(edge.x,edge.y,vUv.y)*smoothstep(1.,1.-edge.y,vUv.y)*smoothstep(0.,edge.z,vUv.x)*smoothstep(1.,1.-edge.w,vUv.x);
        gl_FragColor=vec4(col, d*m*op*soft(0.45));
      }` });
  const smokes = A.smoke.map(o => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), smokeMat(o)); softMats.push(m.material);
    m.position.set(...o.p); m.renderOrder = 2; scene.add(m);
    return m;
  });

  const rayMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { ...SOFTU(), time: { value: 0 }, op: { value: A.rayOp } },
    vertexShader: 'attribute float seed; varying vec2 vUv; varying float vs; varying float vVz; void main(){ vUv=uv; vs=seed; vec4 mv=modelViewMatrix*instanceMatrix*vec4(position,1.); vVz=mv.z; gl_Position=projectionMatrix*mv; }',
    fragmentShader: SOFT + NOISE + `varying vec2 vUv; varying float vs; uniform float time, op;
      void main(){
        float x=clamp(abs(vUv.x-0.5)*2.,0.,1.); float core=exp(-x*x*2.6)*(1.-x);
        float streak=fbm(vec2(vUv.x*2.+vs*13., vUv.y*0.8-time*0.04));
        float fadeY=smoothstep(0.,0.35,vUv.y)*smoothstep(1.,0.55,vUv.y);
        float pulse=0.55+0.45*sin(time*0.35+vs*6.283);
        gl_FragColor=vec4(vec3(1.,0.99,0.97), clamp(core*fadeY*(0.6+0.5*streak)*pulse*op*soft(0.6),0.,1.));
      }` });
  softMats.push(rayMat);
  const rayMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), rayMat, A.rays.length);
  {
    const seeds = new Float32Array(A.rays.length), m = new THREE.Matrix4(), q = new THREE.Quaternion();
    A.rays.forEach((r, i) => {
      seeds[i] = Math.random();
      q.setFromEuler(new THREE.Euler(0, 0, r.rz)); m.compose(new THREE.Vector3(...r.p), q, new THREE.Vector3(r.w, r.h, 1)); rayMesh.setMatrixAt(i, m);
    });
    rayMesh.geometry.setAttribute('seed', new THREE.InstancedBufferAttribute(seeds, 1));
    rayMesh.renderOrder = 3; rayMesh.frustumCulled = false; scene.add(rayMesh);
  }

  const rt = new THREE.WebGLRenderTarget(1, 1, { samples: mobile ? 0 : 4, type: THREE.HalfFloatType });
  const small = [0, 1].map(() => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const postScene = new THREE.Scene(); postScene.add(quad);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const vs = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
  const blurMat = new THREE.ShaderMaterial({ vertexShader: vs, uniforms: { t: { value: null }, dir: { value: new THREE.Vector2() } },
    fragmentShader: `varying vec2 vUv; uniform sampler2D t; uniform vec2 dir;
      void main(){ vec3 s=texture2D(t,vUv).rgb*0.227;
        s+=(texture2D(t,vUv+dir*1.384).rgb+texture2D(t,vUv-dir*1.384).rgb)*0.316; s+=(texture2D(t,vUv+dir*3.23).rgb+texture2D(t,vUv-dir*3.23).rgb)*0.07;
        gl_FragColor=vec4(s,1.); }` });
  const finalMat = new THREE.ShaderMaterial({ vertexShader: vs,
    uniforms: { t: { value: rt.texture }, b: { value: small[1].texture }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) } },
    fragmentShader: `varying vec2 vUv; uniform sampler2D t,b; uniform float time; uniform vec2 res;
      float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      vec3 spec(float t){ float lo=step(t,0.5); float w=clamp(1.-abs(2.*clamp((t-1./6.)/(4./6.),0.,1.)-1.),0.,1.);
        return pow(vec3(lo,1.,1.-lo)*vec3(1.-w,w,1.-w),vec3(1./2.2)); }
      vec2 barrel(vec2 c,float a){ vec2 cc=c-0.5; return c+cc*dot(cc,cc)*a; }
      void main(){
        vec2 uv2=vUv*(1.-vUv.yx); float vig=pow(uv2.x*uv2.y*20.,0.5);
        vec3 sum=vec3(0.), sw=vec3(0.);
        for(int i=0;i<7;i++){ float k=float(i)/7.; vec3 w=spec(k); sw+=w; sum+=w*texture2D(t,barrel(vUv,${A.ca.toFixed(3)}*k)).rgb; }
        vec3 c=mix(max(texture2D(b,vUv).rgb,0.),max(sum/sw,0.),clamp(vig,0.,1.));
        c+=(h(floor(vUv*res/1.5)+fract(time*7.)*61.)-0.5)*0.03;
        float v=length((vUv-0.5)*vec2(1.,0.8)); c*=1.-smoothstep(0.45,0.95,v)*${A.vig.toFixed(2)};
        gl_FragColor=vec4(c,1.);
      }` });

  function resize() {
    const r = host.getBoundingClientRect(), W = Math.max(1, r.width), H = Math.max(1, r.height);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    dRT.setSize(pw >> 1, ph >> 1); softMats.forEach(m => m.uniforms.vres.value.set(pw, ph)); rt.setSize(pw, ph); small.forEach(s => s.setSize(pw >> 2, ph >> 2)); finalMat.uniforms.res.value.set(pw, ph);
    const aspect = W / H, AD = 16 / 9, VF = A.vfov * Math.PI / 180, PT = A.portrait;
    camera.aspect = aspect;
    portraitK = 0; placeRocks();
    if (aspect >= AD) { camera.fov = A.vfov; camera.updateProjectionMatrix(); return; }
    const k = Math.min(Math.max((aspect - .5) / (AD - .5), 0), 1), sm = k * k * (3 - 2 * k);
    portraitK = 1 - sm; placeRocks();
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(PT.vfov * Math.PI / 360) * (1 - sm) + Math.tan(VF / 2) * sm));
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] += PT.shift[0] * (1 - sm); camera.projectionMatrix.elements[9] += PT.shift[1] * (1 - sm);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  const MR = fine ? 0 : A.mobileRest;
  let tx = MR, ty = 0, cx = MR, cy = 0, ts = 0, cs = 0;
  if (fine) {
    addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { tx = ty = 0; return; }
      tx = (e.clientX - r.left) / r.width * 2 - 1; ty = (e.clientY - r.top) / r.height * 2 - 1;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { tx = ty = 0; });
  }
  const sy = () => { const s = window.__scroller; return s && s.scrollHeight > s.clientHeight ? s.scrollTop : (scrollY || document.documentElement.scrollTop || 0); };
  const scrollTarget = () => { ts = Math.min(Math.max(sy() / Math.max(1, root.offsetHeight), 0), 1); };
  document.addEventListener('scroll', scrollTarget, { passive: true, capture: true });
  addEventListener('resize', () => { resize(); scrollTarget(); }, { passive: true });
  const clock = new THREE.Clock(); let raf = 0, visible = true;
  const SC = A.scroll, MO = A.mouse, PV = rig.position.clone(), RS = [.035, .08, .03], SW = A.mobileSway;
  function frame() {
    const dt0 = clock.getDelta(), t = clock.elapsedTime;
    if (!fine && !reduce) { tx = MR + Math.sin(t * .13) * SW; ty = Math.cos(t * .11) * SW * .6; }
    const dt = Math.min(dt0, .1), dk = 1 - Math.exp(-2 * dt);
    cx += (tx - cx) * dk; cy += (ty - cy) * dk; cs += (ts - cs) * (1 - Math.exp(-4 * dt)); if (!Number.isFinite(cs)) cs = 0;
    rig.rotation.set(RS[0] + Math.sin(t * .07) * .004, RS[1] - cx * MO.yaw - cs * SC.yaw + Math.sin(t * .05) * .006, RS[2] - cx * MO.roll + cs * SC.roll);
    rig.position.set(PV.x - cx * MO.shift, PV.y, PV.z);
    const it = t0 < 0 ? 0 : Math.max(0, (performance.now() - t0) / 3000);
    const intro = reduce || it >= 1 ? 0 : Math.pow(2, -10 * it);
    camera.position.set(camBase.x, camBase.y - cs * SC.down + intro * .12, camBase.z + cs * SC.back + intro * A.introBack);
    camera.lookAt(rig.localToWorld(new THREE.Vector3(0, 0, 0)).setY(camera.getWorldPosition(new THREE.Vector3()).y));
    for (const s of smokes) s.material.uniforms.time.value = t;
    rayMat.uniforms.time.value = t;
    for (const s of smokes) s.visible = false; rayMesh.visible = false; scene.background = null;
    renderer.setRenderTarget(dRT); renderer.clear(); renderer.render(scene, camera);
    for (const s of smokes) s.visible = true; rayMesh.visible = true; scene.background = BG;
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    quad.material = blurMat;
    blurMat.uniforms.t.value = rt.texture; blurMat.uniforms.dir.value.set(2.5 / small[0].width, 0); renderer.setRenderTarget(small[0]); renderer.render(postScene, postCam);
    blurMat.uniforms.t.value = small[0].texture; blurMat.uniforms.dir.value.set(0, 2.5 / small[0].height); renderer.setRenderTarget(small[1]); renderer.render(postScene, postCam);
    blurMat.uniforms.t.value = small[1].texture; blurMat.uniforms.dir.value.set(6 / small[0].width, 0); renderer.setRenderTarget(small[0]); renderer.render(postScene, postCam);
    blurMat.uniforms.t.value = small[0].texture; blurMat.uniforms.dir.value.set(0, 6 / small[0].height); renderer.setRenderTarget(small[1]); renderer.render(postScene, postCam);
    if (!titled && t0 >= 0) { titled = true; window.__basaltTitle = true; dispatchEvent(new Event('basalt3d:title')); }
    quad.material = finalMat; finalMat.uniforms.time.value = t % 100;
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  }
  const past = () => sy() > root.offsetHeight * 1.05;
  let act = 0, skip = false, gap = 16, lastT = 0, adaptAt = 0;
  function loop() {
    raf = 0;
    if (!visible || !ready || past()) { lastT = 0; return; }
    const now = performance.now();
    if (lastT && now - lastT < 500) gap += (now - lastT - gap) * .15;
    lastT = now;
    if (gap > 45 && dpr > .5 && now - adaptAt > 1000) { adaptAt = now; dpr = Math.max(.5, dpr * .8); resize(); }
    const idle = now - act > 2000 && now - t0 > 6200;
    if (idle && gap > 100) { lastT = 0; return; }
    skip = !skip && idle;
    if (!skip) frame();
    if (!reduce) raf = requestAnimationFrame(loop);
  }
  function wake() { act = performance.now(); if (!raf && visible && ready && !past()) raf = requestAnimationFrame(loop); }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); }).observe(root);
  document.addEventListener('scroll', wake, { passive: true, capture: true });
  addEventListener('pointermove', wake, { passive: true });
  addEventListener('touchstart', wake, { passive: true });
  new ResizeObserver(() => { resize(); scrollTarget(); wake(); }).observe(host);
  resize(); scrollTarget();
}

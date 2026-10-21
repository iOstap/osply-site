// ------------- WORK PAGE INTRO ------------- //

(function () {
  var D = document.documentElement;
  if (D.classList.contains('w-editor')) return;
  var CFG = {
    start: .25, startVertical: .7, descVertical: .2, textStep: .08, textDur: 1.1,
    rise: .08, slideDur: 1.4, slideStagger: .1,
    mobRise: .02, mobDur: 1.2, mobDelay: .1, mobMargin: '0px 0px -20% 0px'
  };
  var vertical = matchMedia('(max-width: 991px), (orientation: portrait)').matches;
  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  Promise.all([osply.gsap(), Promise.race([fonts, new Promise(function (r) { setTimeout(r, 1500); })])]).then(function () {
    var root = document.querySelector('[data-pm="content"]') || document;
    var list = root.querySelector('[data-pm="list"]');

    if (list) [].slice.call(list.querySelectorAll('img')).forEach(function (im) {
      var s = im.getAttribute('src') || '';
      if (!s || /placeholder/i.test(s) || im.classList.contains('w-dyn-bind-empty')) {
        var sl = im.parentElement === list ? im : im.closest('[data-pm="list"] > *');
        if (sl && !sl.matches('[data-pm="cover"]')) sl.remove();
      }
    });

    [].slice.call(root.querySelectorAll('.w-dyn-items')).forEach(function (l) {
      var its = [].slice.call(l.children).filter(function (n) { return n.querySelector('[data-pm-text]') || n.hasAttribute('data-pm-text'); });
      its.forEach(function (it, i) {
        if (i === its.length - 1) return;
        var t = it.hasAttribute('data-pm-text') ? it : it.querySelector('[data-pm-text]');
        if (t) { t.appendChild(document.createTextNode(',')); it.style.marginRight = '.3em'; }
      });
    });

    var groups = {};
    function g(k) { return groups[k] || (groups[k] = { k: k, lines: [], fades: [], els: [] }); }
    [].slice.call(root.querySelectorAll('[data-pm-text]')).forEach(function (el) {
      var lines;
      try { lines = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'pm-line', aria: 'none' }).lines; } catch (e) { lines = [el]; }
      gsap.set(lines, { yPercent: 110 });
      el.style.visibility = 'visible';
      var gr = g(parseFloat(el.getAttribute('data-pm-text')) || 0);
      [].push.apply(gr.lines, lines); gr.els.push(el);
    });
    [].slice.call(root.querySelectorAll('[data-pm-fade]')).forEach(function (el) {
      gsap.set(el, { opacity: 0 });
      var gr = g(parseFloat(el.getAttribute('data-pm-fade')) || 0); gr.fades.push(el); gr.els.push(el);
    });
    var slides = list ? [].slice.call(list.children) : [];
    gsap.set(slides, { opacity: 0, '--iy': (innerHeight * (vertical ? CFG.mobRise : CFG.rise)) + 'px' });
    window.__pmReady = true;
    osply.linkFx(root); osply.arrowFx(root);

    var wait = window.osplyVT ? window.osplyVT.wait() : 0;
    var now0 = performance.now() / 1000, t0 = CFG.start + wait;
    function delayNow(late, row) { return Math.max(0, now0 + t0 + (late ? CFG.startVertical - CFG.start : (row && vertical ? CFG.descVertical : 0)) - performance.now() / 1000); }
    function isLate(gr) { if (!vertical) return false; var el = gr.els[0]; return !!el && el.getBoundingClientRect().top > innerHeight * .35; }

    var rowQ = [], rowT = 0, done = {};
    function flushRows() {
      var b = rowQ.splice(0).sort(function (a, c) { return a.k - c.k; }), n = { early: 0, late: 0 };
      b.forEach(function (gr) {
        var late = isLate(gr), at = delayNow(late, true) + (late ? n.late++ : n.early++) * CFG.textStep;
        if (gr.lines.length) gsap.to(gr.lines, { yPercent: 0, duration: CFG.textDur, ease: 'power4.out', stagger: .06, delay: at });
        if (gr.fades.length) gsap.to(gr.fades, { opacity: 1, duration: .8, ease: 'power2.out', delay: at + .2 });
      });
    }
    var imgQ = [], imgT = 0;
    function flushImgs() {
      var b = imgQ.splice(0);
      if (!b.length) return;
      if (vertical) gsap.to(b, { opacity: 1, '--iy': '0px', duration: CFG.mobDur, ease: 'power2.out', delay: delayNow(false, true) + CFG.mobDelay });
      else gsap.to(b, { opacity: 1, '--iy': '0px', duration: CFG.slideDur, ease: 'expo.out', stagger: CFG.slideStagger, delay: delayNow() + .1 });
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var gr = e.target._pmRow;
        if (gr && !done[gr.k]) { done[gr.k] = true; rowQ.push(gr); }
      });
      clearTimeout(rowT); rowT = setTimeout(flushRows, 0);
    }, { rootMargin: '0px 0px -8% 0px' });
    var ioImg = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { ioImg.unobserve(e.target); imgQ.push(e.target); } });
      clearTimeout(imgT); imgT = setTimeout(flushImgs, 0);
    }, { rootMargin: vertical ? CFG.mobMargin : '0px 0px 15% 0px' });
    Object.keys(groups).forEach(function (k) { groups[k].els.forEach(function (el) { el._pmRow = groups[k]; io.observe(el); }); });
    slides.forEach(function (s, i) {
      if (i < 3) [].slice.call(s.querySelectorAll('img')).concat(s.tagName === 'IMG' ? [s] : []).forEach(function (im) { im.loading = 'eager'; });
      ioImg.observe(s);
    });
  }).catch(function () { D.classList.remove('pm-js'); });
})();

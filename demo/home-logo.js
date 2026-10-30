// ------------- HERO LOGO ------------- //
const LOGO = [
  'M276.632 15.5077V152.492L236.656 168H39.9758L0 152.492V15.5077L39.9758 0H236.656L276.632 15.5077ZM126.324 160.246H150.31V7.75384H126.324V160.246Z',
  'M559.342 15.5077V68.4923H433.018V7.75384H409.032V80.1231H519.364L559.342 95.6308V152.492L519.364 168H322.684L282.709 152.492V99.5077H409.032V160.246H433.018V87.8769H322.684L282.709 72.3692V15.5077L322.684 0H519.364L559.342 15.5077Z',
  'M842.05 15.5077V78.8308L802.072 94.3384H691.741V168H565.417V0H802.072L842.05 15.5077ZM691.741 86.5847H715.727V7.75384H691.741V86.5847Z',
  'M974.45 160.246H998.435V99.5077H1124.76V168H848.126V0H974.45V160.246Z',
  'M1256.36 108.554H1281.14V0H1407.47V97.6985L1332.31 117.342V168H1205.99V117.342L1130.83 97.6985V0H1256.36V108.554Z'
];

const title = document.querySelector('[data-hero-logo]');
if (title) init(title).catch(() => document.documentElement.classList.remove('hero-logo-on'));

async function init(title) {
  const THREE = await import('three');
  const { SVGLoader } = await import('three/addons/loaders/SVGLoader.js');
  const P = {
    depth: 0.16, tilt: -0.32, near: 260, tiltEase: 3,
    chromeTint: '#dfe1e6', chromeRoughness: 0.16, chromeEnv: 1.25, exposure: 1.05,
    bloom: 0.45, bloomThreshold: 0.85, sparkles: 0.55, sparkleLength: 60,
    wireColor: '#d9d9d9', wireOpacity: 0.7, wireDetail: 3, wireMaxEdge: 0.5, wireRes: 0.5, wireBlur: 4, wireGlow: 1.1,
    curl: 10, splat: 70, force: 3500, velocityFade: 2.5, dyeFade: 1.6, maskLow: 0.12, maskHigh: 0.6,
    refraction: 0.3, aberration: 0.25, haze: 0.05,
  };
  const letterEls = [...title.querySelectorAll('.hero-letter')];
  const imgs = letterEls.map((el) => el.querySelector('img'));
  if (letterEls.length !== LOGO.length) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  Object.assign(canvas.style, { position: 'absolute', pointerEvents: 'none', display: 'block', zIndex: '2' });
  title.style.position = 'relative';
  title.appendChild(canvas);

  const HF = THREE.HalfFloatType;
  const rt = (w, h, o = {}) => new THREE.WebGLRenderTarget(w, h, Object.assign({ type: HF, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping }, o));
  const double = (w, h) => {
    const d = { read: rt(w, h), write: rt(w, h), swap() { const t = d.read; d.read = d.write; d.write = t; } };
    return d;
  };

  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quadScene.add(quad);
  const pass = (mat, target) => {
    quad.material = mat;
    renderer.setRenderTarget(target || null);
    renderer.render(quadScene, quadCam);
  };

  const baseVert = `
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
    uniform vec2 texelSize;
    void main(){
      vUv = uv;
      vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }`;
  const mat = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: baseVert, fragmentShader: frag, uniforms: Object.assign({ texelSize: { value: new THREE.Vector2() } }, uniforms), depthTest: false, depthWrite: false });

  const splatMat = mat(`
    varying vec2 vUv; uniform sampler2D uTarget; uniform float aspect; uniform vec3 color; uniform vec2 point; uniform float radius;
    void main(){ vec2 p = vUv - point; p.x *= aspect; vec3 s = exp(-dot(p, p) / radius) * color; gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + s, 1.0); }`,
    { uTarget: { value: null }, aspect: { value: 1 }, color: { value: new THREE.Vector3() }, point: { value: new THREE.Vector2() }, radius: { value: 0.001 } });

  const advectMat = mat(`
    varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 velTexel; uniform float dt; uniform float dissipation;
    void main(){ vec2 c = vUv - dt * texture2D(uVelocity, vUv).xy * velTexel; gl_FragColor = texture2D(uSource, c) / (1.0 + dissipation * dt); }`,
    { uVelocity: { value: null }, uSource: { value: null }, velTexel: { value: new THREE.Vector2() }, dt: { value: 0.016 }, dissipation: { value: 1 } });

  const curlMat = mat(`
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform sampler2D uVelocity;
    void main(){ float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y; float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x; gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0); }`,
    { uVelocity: { value: null } });

  const vortMat = mat(`
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
    void main(){
      float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x; float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x; float C = texture2D(uCurl, vUv).x;
      vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + 0.0001; f *= curl * C; f.y *= -1.0;
      vec2 v = texture2D(uVelocity, vUv).xy + f * dt; gl_FragColor = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
    }`,
    { uVelocity: { value: null }, uCurl: { value: null }, curl: { value: 0 }, dt: { value: 0.016 } });

  const divMat = mat(`
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform sampler2D uVelocity;
    void main(){
      float L = texture2D(uVelocity, vL).x; float R = texture2D(uVelocity, vR).x; float T = texture2D(uVelocity, vT).y; float B = texture2D(uVelocity, vB).y; vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x; if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }`,
    { uVelocity: { value: null } });

  const clearMat = mat(`
    varying vec2 vUv; uniform sampler2D uTexture; uniform float value;
    void main(){ gl_FragColor = value * texture2D(uTexture, vUv); }`,
    { uTexture: { value: null }, value: { value: 0.8 } });

  const pressureMat = mat(`
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform sampler2D uPressure; uniform sampler2D uDivergence;
    void main(){ float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x; float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x; float d = texture2D(uDivergence, vUv).x; gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0); }`,
    { uPressure: { value: null }, uDivergence: { value: null } });

  const gradMat = mat(`
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform sampler2D uPressure; uniform sampler2D uVelocity;
    void main(){ float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x; float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x; vec2 v = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B); gl_FragColor = vec4(v, 0.0, 1.0); }`,
    { uPressure: { value: null }, uVelocity: { value: null } });

  const brightMat = mat(`
    varying vec2 vUv; uniform sampler2D uTexture; uniform float threshold;
    void main(){ vec4 c = texture2D(uTexture, vUv); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); gl_FragColor = vec4(c.rgb * smoothstep(threshold, threshold + 0.6, l), 1.0); }`,
    { uTexture: { value: null }, threshold: { value: 0.6 } });

  const blurMat = mat(`
    varying vec2 vUv; uniform sampler2D uTexture; uniform vec2 dir;
    void main(){
      vec3 c = texture2D(uTexture, vUv).rgb * 0.2270270270;
      c += texture2D(uTexture, vUv + dir * 1.3846153846).rgb * 0.3162162162; c += texture2D(uTexture, vUv - dir * 1.3846153846).rgb * 0.3162162162;
      c += texture2D(uTexture, vUv + dir * 3.2307692308).rgb * 0.0702702703; c += texture2D(uTexture, vUv - dir * 3.2307692308).rgb * 0.0702702703;
      gl_FragColor = vec4(c, 1.0);
    }`,
    { uTexture: { value: null }, dir: { value: new THREE.Vector2() } });


  const STARS = 6;
  const compMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, transparent: true,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tBloom1; uniform sampler2D tBloom2; uniform sampler2D tDye; uniform sampler2D tVel;
      uniform vec2 uRes; uniform float uDpr; uniform float uTime;
      uniform vec3 uWire; uniform float uWireOpacity; uniform float uWireBlur; uniform float uWireGlow;
      uniform float uExposure; uniform float uBloom; uniform float uSparkles; uniform float uSparkleLength;
      uniform float uMaskLow; uniform float uMaskHigh; uniform float uRefraction; uniform float uAberration; uniform float uHaze;
      uniform vec4 uStars[${STARS}];
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      vec3 toSrgb(vec3 c){ return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
      void main(){
        vec2 frag = gl_FragCoord.xy;
        float dye = texture2D(tDye, vUv).r;
        vec2 vel = clamp(texture2D(tVel, vUv).xy, -400.0, 400.0);
        float m = 1.0 - smoothstep(uMaskLow, uMaskHigh, dye);
        float glow = 0.0;
        for (int i = 0; i < 8; i++) {
          float ang = float(i) * 0.785398 + 0.39;
          glow += texture2D(tA, vUv + vec2(cos(ang), sin(ang)) * uWireBlur * uDpr / uRes).a;
        }
        float wire = clamp(texture2D(tA, vUv).a + glow / 8.0 * uWireGlow, 0.0, 1.0) * uWireOpacity * (1.0 - m);
        vec2 off = vel * 0.00018 * uRefraction;
        vec2 ab = vel * 0.00006 * uAberration;
        vec4 bC = texture2D(tB, vUv - off);
        float bR = texture2D(tB, vUv - off - ab).r;
        float bBl = texture2D(tB, vUv - off + ab).b;
        vec3 chrome = toSrgb(aces(vec3(bR, bC.g, bBl) * uExposure));
        vec3 bloom = texture2D(tBloom1, vUv - off).rgb + texture2D(tBloom2, vUv - off).rgb * 1.4;
        vec3 spark = vec3(0.0);
        for (int i = 0; i < ${STARS}; i++) {
          vec4 s = uStars[i];
          vec2 d = (frag - s.xy * uRes) / uDpr;
          float tw = pow(0.5 + 0.5 * sin(uTime * (0.9 + s.w * 0.6) + s.z * 6.2831), 3.0);
          float lit = texture2D(tB, s.xy).a;
          vec2 r1 = vec2(dot(d, vec2(0.766, 0.643)), dot(d, vec2(-0.643, 0.766)));
          float ray1 = exp(-abs(r1.y) * 0.9) * exp(-abs(r1.x) / (uSparkleLength * (0.6 + s.w)));
          float ray2 = exp(-abs(r1.x) * 1.1) * exp(-abs(r1.y) / (uSparkleLength * 0.18));
          float core = exp(-length(d) * 0.35) * 2.0 + exp(-length(d) * 0.08) * 0.35;
          spark += vec3(0.92, 0.94, 1.0) * (ray1 + ray2 + core) * tw * lit;
        }
        vec3 light = (bloom * uBloom * 0.5 + spark * uSparkles) * m;
        float haze = uHaze * smoothstep(0.0, 0.6, dye);
        vec3 col = uWire * wire * (1.0 - bC.a * m) + chrome * m + light + vec3(haze);
        float a = clamp(max(wire, bC.a * m) + dot(light, vec3(0.3333)) + haze, 0.0, 1.0);
        gl_FragColor = vec4(min(col, vec3(a)), a);
      }`,
    uniforms: {
      tA: { value: null }, tB: { value: null }, tBloom1: { value: null }, tBloom2: { value: null }, tDye: { value: null }, tVel: { value: null },
      uRes: { value: new THREE.Vector2() }, uDpr: { value: dpr }, uTime: { value: 0 },
      uWire: { value: new THREE.Color(P.wireColor) }, uWireOpacity: { value: P.wireOpacity }, uWireBlur: { value: P.wireBlur }, uWireGlow: { value: P.wireGlow },
      uExposure: { value: P.exposure }, uBloom: { value: P.bloom }, uSparkles: { value: P.sparkles }, uSparkleLength: { value: P.sparkleLength },
      uMaskLow: { value: P.maskLow }, uMaskHigh: { value: P.maskHigh }, uRefraction: { value: P.refraction }, uAberration: { value: P.aberration }, uHaze: { value: P.haze },
      uStars: { value: Array.from({ length: STARS }, () => new THREE.Vector4(-10, -10, 0, 0)) }
    }
  });
  compMat.blending = THREE.NoBlending;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  camera.position.set(0, 0, 1400);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(20, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDir; void main(){
      float y = vDir.y;
      float band = smoothstep(-0.32, -0.02, y) * (1.0 - smoothstep(0.02, 0.42, y));
      vec3 c = vec3(0.02, 0.02, 0.028);
      c += vec3(0.95, 0.97, 1.1) * band * 1.25;
      c += vec3(0.35, 0.36, 0.42) * smoothstep(0.55, 1.0, y);
      c += vec3(0.12, 0.12, 0.15) * smoothstep(-0.4, -1.0, y);
      gl_FragColor = vec4(c, 1.0);
    }`
  })));
  const strip = (w, h, x, y, z, i, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i * 0.6, i * 0.6, i * 0.64), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); m.rotateZ(rz); m.rotateY(ry);
    envScene.add(m);
  };
  strip(14, 1.4, 0, 9, 6, 9, 0, 0.2);
  strip(1.2, 12, -9, 0, 7, 7);
  strip(1.6, 12, 10, 2, 3, 5, 0, -0.3);
  strip(10, 0.6, 0, -6, 9, 4);
  strip(4, 4, -4, 6, -8, 3);
  strip(18, 2.5, 0, 2, -12, 1.4);
  strip(0.5, 9, 6, -4, 9, 8, 0, 0.5);
  const envChrome = pmrem.fromScene(envScene, 0.015).texture;

  const matB = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(P.chromeTint), metalness: 1, roughness: P.chromeRoughness, envMap: envChrome, envMapIntensity: P.chromeEnv, clearcoat: 1, clearcoatRoughness: 0.06 });
  matB.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace('( isOrthographic )', '( false )')); };
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-300, 500, 900);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.08));

  const pivot = new THREE.Group();
  scene.add(pivot);
  const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false, depthWrite: false });
  const parser = new SVGLoader();
  const D = 168 * P.depth;
  const letters = LOGO.map((d) => {
    const shapes = parser.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`).paths.flatMap((p) => SVGLoader.createShapes(p));
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: D, bevelEnabled: true, bevelThickness: 2.5, bevelSize: 1.6, bevelOffset: -0.4, bevelSegments: 5, curveSegments: 48 });
    geo.rotateX(Math.PI); geo.center(); geo.computeBoundingBox();
    const solid = new THREE.ExtrudeGeometry(shapes, { depth: D, bevelEnabled: false, curveSegments: P.wireDetail });
    solid.rotateX(Math.PI); solid.center(); solid.computeBoundingBox();
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    geo.boundingBox.getSize(a); solid.boundingBox.getSize(b);
    solid.scale(a.x / b.x, a.y / b.y, a.z / b.z);
    const pos = solid.attributes.position, caps = solid.groups[0], pts = [], max = a.y * P.wireMaxEdge;
    const va = new THREE.Vector3(), vb = new THREE.Vector3();
    for (let i = caps.start; i < caps.start + caps.count; i += 3) {
      for (let k = 0; k < 3; k++) {
        va.fromBufferAttribute(pos, i + k); vb.fromBufferAttribute(pos, i + ((k + 1) % 3));
        if (va.distanceTo(vb) <= max) pts.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
      }
    }
    const edges = new THREE.EdgesGeometry(solid, 1);
    pts.push(...edges.attributes.position.array);
    edges.dispose(); solid.dispose();
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mesh = new THREE.Mesh(geo, matB);
    const wire = new THREE.LineSegments(wg, wireMat);
    const holder = new THREE.Group();
    holder.add(mesh, wire);
    pivot.add(holder);
    return { holder, mesh, wire, w: a.x, h: a.y };
  });

  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: STARS }, () => {
    const L = letters[Math.floor(rnd() * letters.length)];
    const pos = L.mesh.geometry.attributes.position, nor = L.mesh.geometry.attributes.normal, zMax = L.mesh.geometry.boundingBox.max.z;
    let i = 0;
    for (let t = 0; t < 400; t++) { i = Math.floor(rnd() * pos.count); const nz = nor.getZ(i); if (pos.getZ(i) > zMax * 0.6 && nz > 0.25 && nz < 0.85) break; }
    return { L, v: new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)), phase: rnd(), size: rnd() };
  });

  let W = 1, H = 1, CW = 1, CH = 1, padX = 0, padT = 0, padB = 0;
  let rtA, rtB, bloom1a, bloom1b, bloom2a, bloom2b, velocity, dye, pressure, divergence, curlRT;
  const simTexel = new THREE.Vector2(), dyeTexel = new THREE.Vector2();
  const boxes = letters.map(() => ({ x: 0, y: 0, w: 1, h: 1 }));

  const measure = () => {
    const tr = title.getBoundingClientRect();
    letterEls.forEach((el, i) => { const r = el.getBoundingClientRect(); boxes[i] = { x: r.left - tr.left, y: r.top - tr.top, w: r.width, h: r.height }; });
  };
  const resize = () => {
    W = title.clientWidth; H = title.clientHeight;
    padX = Math.round(H * 0.25); padT = Math.round(H * 0.15); padB = Math.round(H * 0.15);
    CW = W + padX * 2; CH = H + padT + padB;
    Object.assign(canvas.style, { left: -padX + 'px', top: -padT + 'px', width: CW + 'px', height: CH + 'px' });
    renderer.setSize(CW, CH, false);
    camera.left = -W / 2 - padX; camera.right = W / 2 + padX; camera.top = H / 2 + padT; camera.bottom = -H / 2 - padB;
    camera.updateProjectionMatrix();
    const w = Math.floor(CW * dpr), h = Math.floor(CH * dpr);
    [rtA, rtB, bloom1a, bloom1b, bloom2a, bloom2b, divergence, curlRT].forEach((r) => r && r.dispose());
    [velocity, dye, pressure].forEach((d) => d && (d.read.dispose(), d.write.dispose()));
    rtA = rt(Math.max(1, Math.round(w * P.wireRes)), Math.max(1, Math.round(h * P.wireRes)), { samples: 4, depthBuffer: true });
    rtB = rt(w, h, { samples: 4, depthBuffer: true });
    bloom1a = rt(w >> 2, h >> 2); bloom1b = rt(w >> 2, h >> 2);
    bloom2a = rt(w >> 3, h >> 3); bloom2b = rt(w >> 3, h >> 3);
    const ar = CW / CH, sw = 256, sh = Math.max(16, Math.round(256 / ar)), dw = 1024, dh = Math.max(32, Math.round(1024 / ar));
    velocity = double(sw, sh); pressure = double(sw, sh); dye = double(dw, dh);
    divergence = rt(sw, sh); curlRT = rt(sw, sh);
    simTexel.set(1 / sw, 1 / sh); dyeTexel.set(1 / dw, 1 / dh);
    measure();
  };

  const splat = (x, y, dx, dy, amount) => {
    const aspect = CW / CH;
    splatMat.uniforms.aspect.value = aspect;
    splatMat.uniforms.point.value.set(x, y);
    splatMat.uniforms.radius.value = Math.pow(P.splat / CH, 2);
    splatMat.uniforms.uTarget.value = velocity.read.texture;
    splatMat.uniforms.color.value.set(dx, dy, 0);
    splatMat.uniforms.texelSize.value.copy(simTexel);
    pass(splatMat, velocity.write); velocity.swap();
    splatMat.uniforms.uTarget.value = dye.read.texture;
    splatMat.uniforms.color.value.set(amount, 0, 0);
    splatMat.uniforms.texelSize.value.copy(dyeTexel);
    pass(splatMat, dye.write); dye.swap();
  };

  const step = (dt) => {
    [curlMat, vortMat, divMat, clearMat, pressureMat, gradMat].forEach((m) => m.uniforms.texelSize.value.copy(simTexel));
    curlMat.uniforms.uVelocity.value = velocity.read.texture; pass(curlMat, curlRT);
    vortMat.uniforms.uVelocity.value = velocity.read.texture; vortMat.uniforms.uCurl.value = curlRT.texture; vortMat.uniforms.curl.value = P.curl; vortMat.uniforms.dt.value = dt;
    pass(vortMat, velocity.write); velocity.swap();
    divMat.uniforms.uVelocity.value = velocity.read.texture; pass(divMat, divergence);
    clearMat.uniforms.uTexture.value = pressure.read.texture; pass(clearMat, pressure.write); pressure.swap();
    pressureMat.uniforms.uDivergence.value = divergence.texture;
    for (let i = 0; i < 20; i++) { pressureMat.uniforms.uPressure.value = pressure.read.texture; pass(pressureMat, pressure.write); pressure.swap(); }
    gradMat.uniforms.uPressure.value = pressure.read.texture; gradMat.uniforms.uVelocity.value = velocity.read.texture;
    pass(gradMat, velocity.write); velocity.swap();
    advectMat.uniforms.dt.value = dt;
    advectMat.uniforms.velTexel.value.copy(simTexel);
    advectMat.uniforms.texelSize.value.copy(simTexel);
    advectMat.uniforms.uVelocity.value = velocity.read.texture; advectMat.uniforms.uSource.value = velocity.read.texture; advectMat.uniforms.dissipation.value = P.velocityFade;
    pass(advectMat, velocity.write); velocity.swap();
    advectMat.uniforms.texelSize.value.copy(dyeTexel);
    advectMat.uniforms.uVelocity.value = velocity.read.texture; advectMat.uniforms.uSource.value = dye.read.texture; advectMat.uniforms.dissipation.value = P.dyeFade;
    pass(advectMat, dye.write); dye.swap();
  };

  const pointer = { x: -1, y: -1, px: -1, py: -1, cx: -1e4, cy: -1e4, moved: false, active: false };
  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
    if (!pointer.active) { pointer.px = x; pointer.py = y; pointer.active = true; }
    pointer.x = x; pointer.y = y; pointer.cx = e.clientX; pointer.cy = e.clientY; pointer.moved = true;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; pointer.cx = pointer.cy = -1e4; });

  const tmp = new THREE.Vector3();
  let tilt = 0, last = performance.now(), time = 0, visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(title);

  const render = (now) => {
    requestAnimationFrame(render);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now; time += dt;

    if (pointer.moved) {
      const ar = CW / CH;
      const dx = (pointer.x - pointer.px) * P.force * ar, dy = (pointer.y - pointer.py) * P.force;
      const amt = Math.min(Math.hypot((pointer.x - pointer.px) * ar, pointer.y - pointer.py) * 18, 0.8) + 0.08;
      splat(pointer.x, pointer.y, dx, dy, amt);
      pointer.px = pointer.x; pointer.py = pointer.y; pointer.moved = false;
    }
    step(dt);

    const tr = title.getBoundingClientRect();
    const ddx = Math.max(tr.left - pointer.cx, 0, pointer.cx - tr.right), ddy = Math.max(tr.top - pointer.cy, 0, pointer.cy - tr.bottom);
    const k = 1 - Math.min(Math.hypot(ddx, ddy) / P.near, 1);
    tilt += (P.tilt * k * k * (3 - 2 * k) - tilt) * Math.min(dt * P.tiltEase, 1);
    pivot.rotation.x = tilt;

    const gsap = window.gsap;
    if (!gsap) return;
    letters.forEach((L, i) => {
      const b = boxes[i], img = imgs[i];
      const yp = (parseFloat(gsap.getProperty(img, 'yPercent')) || 0) + (parseFloat(gsap.getProperty(img, 'y')) || 0) / b.h * 100;
      const rx = parseFloat(gsap.getProperty(img, 'rotationX')) || 0;
      const sx = b.w / L.w, sy = b.h / L.h;
      L.holder.position.set(b.x + b.w / 2 - W / 2, H / 2 - (b.y + b.h / 2) - yp / 100 * b.h, 0);
      L.holder.rotation.x = -rx * Math.PI / 180;
      L.holder.scale.set(sx, sy, sy);
    });
    scene.updateMatrixWorld();

    renderer.setClearColor(0x000000, 0);
    letters.forEach((L) => { L.mesh.visible = false; L.wire.visible = true; });
    renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(scene, camera);
    letters.forEach((L) => { L.mesh.visible = true; L.wire.visible = false; });
    renderer.setRenderTarget(rtB); renderer.clear(); renderer.render(scene, camera);

    brightMat.uniforms.uTexture.value = rtB.texture; brightMat.uniforms.threshold.value = P.bloomThreshold;
    pass(brightMat, bloom1a);
    const blur = (a, b2) => {
      blurMat.uniforms.uTexture.value = a.texture; blurMat.uniforms.dir.value.set(1 / a.width, 0); pass(blurMat, b2);
      blurMat.uniforms.uTexture.value = b2.texture; blurMat.uniforms.dir.value.set(0, 1 / a.height); pass(blurMat, a);
    };
    blur(bloom1a, bloom1b);
    blurMat.uniforms.uTexture.value = bloom1a.texture; blurMat.uniforms.dir.value.set(0, 0); pass(blurMat, bloom2a);
    blur(bloom2a, bloom2b); blur(bloom2a, bloom2b);

    const su = compMat.uniforms.uStars.value;
    stars.forEach((s, i) => { tmp.copy(s.v).applyMatrix4(s.L.mesh.matrixWorld).project(camera); su[i].set(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5, s.phase, s.size); });

    const u = compMat.uniforms;
    u.tA.value = rtA.texture; u.tB.value = rtB.texture; u.tBloom1.value = bloom1a.texture; u.tBloom2.value = bloom2a.texture;
    u.tDye.value = dye.read.texture; u.tVel.value = velocity.read.texture;
    u.uRes.value.set(CW * dpr, CH * dpr); u.uTime.value = time;
    renderer.setRenderTarget(null); renderer.clear();
    pass(compMat, null);
  };

  new ResizeObserver(resize).observe(title);
  addEventListener('resize', measure);
  resize();
  document.documentElement.classList.add('hero-logo-on');
  requestAnimationFrame(render);
}

// ------------- LOGO REVEAL ------------- //
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.querySelector('[data-logo-reveal]');
if (root) init(root);

function init(root) {
  const LOGO = 'M17.6 0C21.1346 0 24 2.86538 24 6.4V10.0519C24 10.9006 23.6629 11.7145 23.0627 12.3146L12.3146 23.0627C11.7145 23.6629 10.9006 24 10.0519 24H6.4C2.86538 24 1.80416e-07 21.1346 0 17.6L0 14.0322C0 13.1835 0.337142 12.3696 0.937258 11.7695L11.7695 0.937259C12.3696 0.337142 13.1835 0 14.0322 0L17.6 0ZM8.96 5.76C7.19269 5.76 5.76 7.19269 5.76 8.96V15.04C5.76 16.8074 7.19269 18.24 8.96 18.24H15.04C16.8074 18.24 18.24 16.8074 18.24 15.04V8.96C18.24 7.19269 16.8074 5.76 15.04 5.76H8.96Z';

  const P = {
    background: getComputedStyle(document.documentElement).getPropertyValue('--color--background').trim() || '#0e0e0e',
    logoX: 0.25,
    logoSize: 0.46,
    depth: 5,
    tiltX: 0.18,
    tiltY: -0.42,
    follow: 0.35,
    pixel: 2,
    gain: 0.95,
    gamma: 1.5,
    dotGap: 0,
    ditherEnv: 0.4,
    grain: 0.045,
    fibers: 0.5,
    chromeTint: '#e4e7ff',
    chromeRoughness: 0.1,
    chromeEnv: 1.2,
    exposure: 1,
    bloom: 0.6,
    bloomThreshold: 0.8,
    sparkles: 0.8,
    sparkleLength: 70,
    curl: 22,
    splatRadius: 0.18,
    force: 3800,
    velocityFade: 1.2,
    dyeFade: 2.2,
    maskLow: 0.12,
    maskHigh: 0.6,
    refraction: 0.35,
    film: 0.035,
    frost: 0.5,
    aberration: 0.25,
    intro: true
  };

  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.autoClear = false;
  root.appendChild(renderer.domElement);
  Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', touchAction: 'pan-y' });

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

  const STARS = 7;
  const compMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tBloom1; uniform sampler2D tBloom2; uniform sampler2D tDye; uniform sampler2D tVel;
      uniform vec2 uRes; uniform float uDpr; uniform float uTime; uniform vec3 uBg;
      uniform float uPixel; uniform float uGain; uniform float uGamma; uniform float uDotGap; uniform float uGrain; uniform float uFibers;
      uniform float uExposure; uniform float uBloom; uniform float uSparkles; uniform float uSparkleLength;
      uniform float uMaskLow; uniform float uMaskHigh; uniform float uRefraction; uniform float uFilm; uniform float uFrost; uniform float uAberration;
      uniform vec4 uStars[${STARS}];

      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
      float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
      float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      vec3 toSrgb(vec3 c){ return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

      void main(){
        vec2 frag = gl_FragCoord.xy;
        float dye = texture2D(tDye, vUv).r;
        vec2 vel = clamp(texture2D(tVel, vUv).xy, -400.0, 400.0);
        float m = smoothstep(uMaskLow, uMaskHigh, dye);
        float edge = smoothstep(0.0, uMaskLow + 0.05, dye) * (1.0 - m);

        float ps = max(uPixel * uDpr, 1.0);
        vec2 cell = floor(frag / ps);
        vec2 cellUv = (cell + 0.5) * ps / uRes;
        vec4 a = texture2D(tA, cellUv);
        float lum = pow(clamp(dot(toSrgb(a.rgb), vec3(0.299, 0.587, 0.114)) * uGain, 0.0, 1.0), uGamma);
        vec2 local = fract(frag / ps) - 0.5;
        float square = step(max(abs(local.x), abs(local.y)), 0.5 - uDotGap * 0.5);
        float dots = step(bayer8(cell) + 0.002, lum) * step(0.5, a.a) * square;

        vec3 frost = vec3(0.0);
        for (int i = 0; i < 8; i++) {
          float ang = float(i) * 0.785398;
          vec2 o = vec2(cos(ang), sin(ang)) * (6.0 + 10.0 * edge) * uDpr / uRes;
          vec4 s = texture2D(tA, vUv + o + vel * 0.00025);
          frost += toSrgb(s.rgb) * s.a;
        }
        frost /= 8.0;

        vec3 col = uBg;
        float fib = noise(vec2(frag.x * 0.004, frag.y * 0.35) / uDpr) * noise(vec2(frag.x * 0.02, frag.y * 0.9) / uDpr);
        col += uFibers * 0.018 * fib;
        col += uFilm * smoothstep(0.0, 0.6, dye) * (0.7 + 0.3 * noise(frag * 0.01 / uDpr + uTime * 0.2));
        col = mix(col, vec3(0.94), dots * (1.0 - m));
        col += frost * uFrost * edge * 0.6;

        vec2 off = vel * 0.00018 * uRefraction;
        vec2 ab = vel * 0.00006 * uAberration;
        vec4 bC = texture2D(tB, vUv - off);
        float bR = texture2D(tB, vUv - off - ab).r;
        float bBl = texture2D(tB, vUv - off + ab).b;
        vec3 chrome = aces(vec3(bR, bC.g, bBl) * uExposure);
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

        vec3 revealed = toSrgb(chrome) * bC.a + bloom * uBloom * 0.5 + spark * uSparkles;
        col = mix(col, col * (1.0 - bC.a) + revealed, m);
        col += (hash(frag + fract(uTime) * 100.0) - 0.5) * uGrain;
        gl_FragColor = vec4(col, 1.0);
      }`,
    uniforms: {
      tA: { value: null }, tB: { value: null }, tBloom1: { value: null }, tBloom2: { value: null }, tDye: { value: null }, tVel: { value: null },
      uRes: { value: new THREE.Vector2() }, uDpr: { value: dpr }, uTime: { value: 0 }, uBg: { value: new THREE.Color() },
      uPixel: { value: 2 }, uGain: { value: 1 }, uGamma: { value: 1 }, uDotGap: { value: 0 }, uGrain: { value: 0 }, uFibers: { value: 0 },
      uExposure: { value: 1 }, uBloom: { value: 1 }, uSparkles: { value: 1 }, uSparkleLength: { value: 150 },
      uMaskLow: { value: 0.1 }, uMaskHigh: { value: 0.5 }, uRefraction: { value: 1 }, uFilm: { value: 0 }, uFrost: { value: 0 }, uAberration: { value: 1 },
      uStars: { value: Array.from({ length: STARS }, () => new THREE.Vector4()) }
    }
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envSoft = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
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

  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${LOGO}"/></svg>`);
  const shapes = svg.paths.flatMap((p) => SVGLoader.createShapes(p));
  let geometry = null;
  let logo = null;
  const buildGeometry = () => {
    if (geometry) geometry.dispose();
    geometry = new THREE.ExtrudeGeometry(shapes, { depth: P.depth, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.4, bevelOffset: -0.1, bevelSegments: 8, curveSegments: 64 });
    geometry.rotateX(Math.PI);
    geometry.center();
    geometry.computeBoundingBox();
    if (logo) logo.geometry = geometry;
    pickStars();
  };

  const matA = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, metalness: 0.35, roughness: 0.28, envMap: envSoft, envMapIntensity: P.ditherEnv });
  const matB = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(P.chromeTint), metalness: 1, roughness: P.chromeRoughness, envMap: envChrome, envMapIntensity: P.chromeEnv, clearcoat: 1, clearcoatRoughness: 0.05 });
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-3, 5, 6);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(6, -2, -3);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.08));

  const pivot = new THREE.Group();
  scene.add(pivot);
  const starLocal = [];
  const pickStars = () => {
    starLocal.length = 0;
    const pos = geometry.attributes.position;
    const nor = geometry.attributes.normal;
    const zMax = geometry.boundingBox.max.z;
    const candidates = [];
    for (let i = 0; i < pos.count; i += 3) {
      const nz = nor.getZ(i);
      if (pos.getZ(i) > zMax * 0.55 && nz > 0.25 && nz < 0.85) candidates.push(i);
    }
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let s = 0; s < STARS && candidates.length; s++) {
      const i = candidates[Math.floor(rnd() * candidates.length)];
      starLocal.push({ v: new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)), phase: rnd(), size: rnd() });
    }
  };
  buildGeometry();
  logo = new THREE.Mesh(geometry, matA);
  pivot.add(logo);

  let W = 1, H = 1, aspect = 1;
  let rtA, rtB, bloom1a, bloom1b, bloom2a, bloom2b;
  let velocity, dye, pressure, divergence, curlRT;
  const SIM = 128, DYE = 512;
  const simTexel = new THREE.Vector2(), dyeTexel = new THREE.Vector2();
  const res = (base) => { const ar = Math.max(aspect, 1 / aspect); const min = Math.round(base); const max = Math.round(base * ar); return aspect > 1 ? [max, min] : [min, max]; };

  const resize = () => {
    W = root.clientWidth || window.innerWidth; H = root.clientHeight || window.innerHeight; aspect = W / H;
    renderer.setSize(W, H, false);
    const w = Math.floor(W * dpr), h = Math.floor(H * dpr);
    [rtA, rtB, bloom1a, bloom1b, bloom2a, bloom2b].forEach((r) => r && r.dispose());
    rtA = rt(w, h, { samples: 4, depthBuffer: true });
    rtB = rt(w, h, { samples: 4, depthBuffer: true });
    bloom1a = rt(w >> 2, h >> 2); bloom1b = rt(w >> 2, h >> 2);
    bloom2a = rt(w >> 3, h >> 3); bloom2b = rt(w >> 3, h >> 3);
    const [sw, sh] = res(SIM), [dw, dh] = res(DYE);
    [velocity, dye, pressure].forEach((d) => d && (d.read.dispose(), d.write.dispose()));
    [divergence, curlRT].forEach((r) => r && r.dispose());
    velocity = double(sw, sh); pressure = double(sw, sh); dye = double(dw, dh);
    divergence = rt(sw, sh); curlRT = rt(sw, sh);
    simTexel.set(1 / sw, 1 / sh); dyeTexel.set(1 / dw, 1 / dh);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    layout();
  };

  const layout = () => {
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const vw = vh * aspect;
    const mobile = aspect < 0.8;
    const size = mobile ? Math.min(vw * 0.62, vh * 0.42) : Math.min(vh * P.logoSize, vw * 0.34);
    pivot.scale.setScalar(size / 24);
    pivot.position.set(mobile ? 0 : -vw / 2 + vw * P.logoX, mobile ? vh * 0.12 : 0, 0);
  };

  const splat = (x, y, dx, dy, amount) => {
    splatMat.uniforms.aspect.value = aspect;
    splatMat.uniforms.point.value.set(x, y);
    splatMat.uniforms.radius.value = (P.splatRadius / 100) * (aspect > 1 ? aspect : 1);
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

  const pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, moved: false, nx: 0, ny: 0, active: false };
  const onMove = (cx, cy) => {
    const r = root.getBoundingClientRect();
    const x = (cx - r.left) / r.width, y = 1 - (cy - r.top) / r.height;
    if (!pointer.active) { pointer.px = x; pointer.py = y; pointer.active = true; }
    pointer.x = x; pointer.y = y; pointer.moved = true;
    pointer.nx = x * 2 - 1; pointer.ny = y * 2 - 1;
    intro.on = false;
  };
  root.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY), { passive: true });
  root.addEventListener('pointerdown', (e) => onMove(e.clientX, e.clientY), { passive: true });
  root.addEventListener('pointerleave', () => { pointer.active = false; pointer.nx = 0; pointer.ny = 0; });

  const intro = { on: P.intro, t: 0 };
  const introPath = (t) => {
    const lx = aspect < 0.8 ? 0.5 : P.logoX;
    const ly = aspect < 0.8 ? 0.62 : 0.5;
    const e = t * t * (3 - 2 * t);
    return [lx - 0.22 + e * 0.44, ly + Math.sin(e * Math.PI * 1.5) * 0.12];
  };

  const tmp = new THREE.Vector3();
  const rot = { x: 0, y: 0 };
  const bg = new THREE.Color();
  let last = performance.now(), time = 0, visible = true, raf = 0;

  const render = (now) => {
    raf = requestAnimationFrame(render);
    if (!visible) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now; time += dt;

    if (intro.on) {
      intro.t += dt / 1.8;
      if (intro.t >= 1) intro.on = false;
      const [x, y] = introPath(Math.min(intro.t, 1));
      if (intro.t > dt) { pointer.x = x; pointer.y = y; pointer.moved = true; } else { pointer.px = x; pointer.py = y; pointer.x = x; pointer.y = y; }
    }
    if (pointer.moved) {
      const dx = (pointer.x - pointer.px) * P.force * (aspect > 1 ? aspect : 1);
      const dy = (pointer.y - pointer.py) * P.force;
      const amt = Math.min(Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py) * 25, 0.8) + 0.08;
      splat(pointer.x, pointer.y, dx, dy, amt);
      pointer.px = pointer.x; pointer.py = pointer.y; pointer.moved = false;
    }
    step(dt);

    rot.x += (P.tiltX - pointer.ny * P.follow * 0.5 - rot.x) * Math.min(dt * 3, 1);
    rot.y += (P.tiltY + pointer.nx * P.follow - rot.y) * Math.min(dt * 3, 1);
    pivot.rotation.set(rot.x + Math.sin(time * 0.6) * 0.04, rot.y + Math.sin(time * 0.4) * 0.06, Math.sin(time * 0.5) * 0.02);
    logo.position.y = Math.sin(time * 0.8) * 0.35;
    scene.updateMatrixWorld();

    renderer.setClearColor(0x000000, 0);
    logo.material = matA;
    renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(scene, camera);
    logo.material = matB;
    renderer.setRenderTarget(rtB); renderer.clear(); renderer.render(scene, camera);

    brightMat.uniforms.uTexture.value = rtB.texture; brightMat.uniforms.threshold.value = P.bloomThreshold;
    pass(brightMat, bloom1a);
    const blur = (a, b, w, h) => {
      blurMat.uniforms.uTexture.value = a.texture; blurMat.uniforms.dir.value.set(1 / w, 0); pass(blurMat, b);
      blurMat.uniforms.uTexture.value = b.texture; blurMat.uniforms.dir.value.set(0, 1 / h); pass(blurMat, a);
    };
    blur(bloom1a, bloom1b, bloom1a.width, bloom1a.height);
    blurMat.uniforms.uTexture.value = bloom1a.texture; blurMat.uniforms.dir.value.set(0, 0); pass(blurMat, bloom2a);
    blur(bloom2a, bloom2b, bloom2a.width, bloom2a.height);
    blur(bloom2a, bloom2b, bloom2a.width, bloom2a.height);

    const stars = compMat.uniforms.uStars.value;
    for (let i = 0; i < STARS; i++) {
      const s = starLocal[i];
      if (!s) { stars[i].set(-10, -10, 0, 0); continue; }
      tmp.copy(s.v).applyMatrix4(logo.matrixWorld).project(camera);
      stars[i].set(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5, s.phase, s.size);
    }

    const u = compMat.uniforms;
    u.tA.value = rtA.texture; u.tB.value = rtB.texture; u.tBloom1.value = bloom1a.texture; u.tBloom2.value = bloom2a.texture;
    u.tDye.value = dye.read.texture; u.tVel.value = velocity.read.texture;
    u.uRes.value.set(W * dpr, H * dpr); u.uTime.value = time; u.uBg.value.copy(bg.set(P.background));
    u.uPixel.value = P.pixel; u.uGain.value = P.gain; u.uGamma.value = P.gamma; u.uDotGap.value = P.dotGap; u.uGrain.value = P.grain; u.uFibers.value = P.fibers;
    u.uExposure.value = P.exposure; u.uBloom.value = P.bloom; u.uSparkles.value = P.sparkles; u.uSparkleLength.value = P.sparkleLength;
    u.uMaskLow.value = P.maskLow; u.uMaskHigh.value = P.maskHigh; u.uRefraction.value = P.refraction; u.uFilm.value = P.film; u.uFrost.value = P.frost; u.uAberration.value = P.aberration;
    pass(compMat, null);
  };

  const sync = () => {
    matA.envMapIntensity = P.ditherEnv;
    matB.color.set(P.chromeTint); matB.roughness = P.chromeRoughness; matB.envMapIntensity = P.chromeEnv;
    layout();
  };

  root.logoReveal = { P, sync, rebuild: buildGeometry, replay: () => { intro.on = true; intro.t = 0; } };
  new ResizeObserver(resize).observe(root);
  resize();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; }).observe(root);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
  raf = requestAnimationFrame(render);

  if (root.hasAttribute('data-logo-reveal-gui')) {
    import('https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/+esm').then(({ default: GUI }) => {
      const gui = new GUI({ title: 'Logo Reveal' });
      const f1 = gui.addFolder('Logo');
      f1.add(P, 'logoX', 0.1, 0.5, 0.01).onChange(sync);
      f1.add(P, 'logoSize', 0.3, 0.9, 0.01).onChange(sync);
      f1.add(P, 'depth', 1, 12, 0.1).onFinishChange(buildGeometry);
      f1.add(P, 'tiltX', -1, 1, 0.01);
      f1.add(P, 'tiltY', -1.5, 1.5, 0.01);
      f1.add(P, 'follow', 0, 1, 0.01);
      const f2 = gui.addFolder('Dithering');
      f2.add(P, 'pixel', 1, 8, 0.5);
      f2.add(P, 'gain', 0.2, 3, 0.01);
      f2.add(P, 'gamma', 0.3, 3, 0.01);
      f2.add(P, 'dotGap', 0, 0.8, 0.01);
      f2.add(P, 'ditherEnv', 0, 2, 0.01).onChange(sync);
      f2.add(P, 'grain', 0, 0.2, 0.001);
      f2.add(P, 'fibers', 0, 2, 0.01);
      f2.addColor(P, 'background');
      const f3 = gui.addFolder('Chrome');
      f3.addColor(P, 'chromeTint').onChange(sync);
      f3.add(P, 'chromeRoughness', 0, 0.6, 0.01).onChange(sync);
      f3.add(P, 'chromeEnv', 0, 4, 0.01).onChange(sync);
      f3.add(P, 'exposure', 0.2, 3, 0.01);
      f3.add(P, 'bloom', 0, 3, 0.01);
      f3.add(P, 'bloomThreshold', 0, 2, 0.01);
      f3.add(P, 'sparkles', 0, 3, 0.01);
      f3.add(P, 'sparkleLength', 20, 400, 1);
      const f4 = gui.addFolder('Fluid');
      f4.add(P, 'curl', 0, 60, 0.5);
      f4.add(P, 'splatRadius', 0.05, 1.5, 0.01);
      f4.add(P, 'force', 500, 12000, 50);
      f4.add(P, 'velocityFade', 0, 4, 0.01);
      f4.add(P, 'dyeFade', 0, 4, 0.01);
      f4.add(P, 'maskLow', 0, 1, 0.01);
      f4.add(P, 'maskHigh', 0.01, 2, 0.01);
      f4.add(P, 'refraction', 0, 4, 0.01);
      f4.add(P, 'aberration', 0, 4, 0.01);
      f4.add(P, 'film', 0, 0.3, 0.001);
      f4.add(P, 'frost', 0, 2, 0.01);
      gui.add({ copy: () => navigator.clipboard.writeText(JSON.stringify(P, null, 2)) }, 'copy').name('Copy settings');
      gui.add({ replay: () => { intro.on = true; intro.t = 0; } }, 'replay').name('Replay intro');
    });
  }
}

// A real-time 3D halberd (three.js r128), drawn into the element with [data-halberd].
// Polished steel reflecting a chrome-studio environment, with the axe's cutting edge in the one
// cyan accent: it glows, and a glint runs along it every few seconds. The weapon leans across
// the hero with its head up and to the right and sways gently in a three-quarter view.
// The host may be taller than its parent (so the shaft can run on below the hero); the head is
// placed relative to the parent's height.
(function () {
  const host = document.querySelector("[data-halberd]");
  if (!host || !window.THREE) return;
  const T = THREE;

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return; // no WebGL: the <img> fallback stays
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.setAttribute("aria-hidden", "true");

  const CYAN = new T.Color(0x6fe3ee);
  const SHAFT_R = 0.075;
  const LEAN = -0.56; // radians; the head leans right
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(20, 1, 1, 100);

  // Chrome studio: a bright sky fading to a hard dark horizon, a dim floor, a big overhead
  // softbox, white strips left and front, and a cyan strip on the right.
  const pmrem = new T.PMREMGenerator(renderer);
  const env = new T.Scene();
  const sky = new T.SphereGeometry(10, 64, 32);
  const col = [];
  for (let i = 0; i < sky.attributes.position.count; i++) {
    const y = sky.attributes.position.getY(i) / 10;
    let v;
    if (y > 0.04) v = 0.25 + 1.5 * Math.pow((y - 0.04) / 0.96, 0.6);
    else if (y > -0.02) v = 2.4;
    else v = 0.02 + 0.18 * Math.min(1, -y * 1.5);
    col.push(v * 0.96, v * 0.98, v * 1.02);
  }
  sky.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  env.add(new T.Mesh(sky, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
  function panel(w, h, color, pos) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color, side: T.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
  }
  panel(8, 3, new T.Color(6, 6, 6), [0, 8, 1]);
  panel(1, 12, new T.Color(3, 3, 3.1), [-7, 0, 4]);
  panel(10, 0.6, new T.Color(3.5, 3.5, 3.6), [0, 2.5, 8]);
  panel(1.4, 12, new T.Color(0.5, 2.4, 2.7), [7, 0, 2]);
  scene.environment = pmrem.fromScene(env, 0.02).texture;

  const steel = new T.MeshStandardMaterial({ color: 0xf2f5f7, metalness: 1, roughness: 0.16 });
  const darkSteel = new T.MeshStandardMaterial({ color: 0xa7aeb4, metalness: 1, roughness: 0.3 });
  const edge = new T.MeshStandardMaterial({ color: 0xc8fbff, metalness: 0.6, roughness: 0.1, emissive: CYAN, emissiveIntensity: 1.4 });
  const wood = new T.MeshStandardMaterial({ color: 0x2a2e33, metalness: 0.3, roughness: 0.6 });

  const key = new T.DirectionalLight(0xffffff, 0.8); key.position.set(-2, 4, 5); scene.add(key);

  // tilt leans the weapon and pivots around the head's center; halberd sways on the shaft inside it.
  const tilt = new T.Group();
  tilt.rotation.z = LEAN;
  scene.add(tilt);
  const halberd = new T.Group();
  halberd.position.y = -1.3;
  tilt.add(halberd);
  const rim = new T.PointLight(0x6fe3ee, 4, 6); rim.position.set(1.6, 1.0, 1.2); halberd.add(rim);

  // Extrude a flat shape into a plate, optionally tapering its thickness by x so the faces are
  // ground at an angle and pick up a gradient of reflections.
  function plate(shape, depth, bevel, mat, taper) {
    const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 1.4, bevelSegments: 3, curveSegments: 40 });
    g.translate(0, 0, -depth / 2);
    if (taper) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * taper(p.getX(i), p.getY(i)));
      g.computeVertexNormals();
    }
    const m = new T.Mesh(g, mat);
    halberd.add(m);
    return m;
  }
  function lathe(points, mat, y) {
    const m = new T.Mesh(new T.LatheGeometry(points.map(p => new T.Vector2(p[0], p[1])), 64), mat);
    m.position.y = y || 0;
    halberd.add(m);
    return m;
  }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // Shaft, running far below.
  const shaft = new T.Mesh(new T.CylinderGeometry(SHAFT_R, SHAFT_R, 40, 32), wood);
  shaft.position.y = -19.6;
  halberd.add(shaft);

  // Socket with turned collars.
  lathe([[0, 0], [0.12, 0], [0.12, 0.05], [0.095, 0.08], [0.09, 1.08], [0.115, 1.1], [0.115, 1.16], [0.07, 1.2], [0, 1.2]], steel, 0.2);
  lathe([[0, 0], [0.13, 0], [0.13, 0.07], [0, 0.07]], darkSteel, 0.12);
  lathe([[0, 0], [0.12, 0], [0.12, 0.05], [0, 0.05]], darkSteel, -1.05);

  // Top spike: four-sided, so its ridges catch the light.
  const spike = new T.Mesh(new T.ConeGeometry(0.11, 1.75, 4, 1), steel);
  spike.position.y = 1.4 + 0.875;
  spike.rotation.y = Math.PI / 4;
  halberd.add(spike);
  const spikeBase = new T.Mesh(new T.OctahedronGeometry(0.12), steel);
  spikeBase.position.y = 1.4;
  spikeBase.scale.set(1, 0.6, 1);
  halberd.add(spikeBase);

  // Axe blade: rising top edge into a horn, convex cutting edge, bearded lower point, one
  // piercing near the socket. Thick at the socket, ground thin toward the edge.
  const p0 = new T.Vector2(0.95, 1.62), pc = new T.Vector2(1.2, 0.92), p2 = new T.Vector2(0.92, 0.12);
  const blade = new T.Shape();
  blade.moveTo(0.06, 1.14);
  blade.lineTo(0.5, 1.24);
  blade.quadraticCurveTo(0.8, 1.32, p0.x, p0.y);
  blade.quadraticCurveTo(pc.x, pc.y, p2.x, p2.y);
  blade.quadraticCurveTo(0.74, 0.34, 0.5, 0.42);
  blade.lineTo(0.06, 0.56);
  blade.closePath();
  blade.holes.push(new T.Path().absarc(0.32, 0.86, 0.07, 0, Math.PI * 2, true));
  plate(blade, 0.06, 0.012, steel, x => 1.7 - 1.25 * smooth(0.06, 1.0, x));

  // Cyan cutting edge: a thin band along the blade's curve, sitting just proud of the steel.
  const curve = new T.QuadraticBezierCurve(p0, pc, p2);
  const outer = curve.getPoints(60), inner = outer.map(p => new T.Vector2(p.x - 0.1, p.y));
  plate(new T.Shape(outer.concat(inner.slice().reverse())), 0.03, 0.01, edge);

  // Glow around the edge: an additive ribbon whose brightness falls off away from the edge, with
  // a glint that runs from the horn down to the beard.
  const glowMat = new T.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: CYAN } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float time; uniform vec3 color; varying vec2 vUv;
      void main(){
        float d = abs(vUv.y);
        float halo = pow(1.0 - d, 2.5) * 0.9 + pow(1.0 - d, 10.0) * 2.0;
        float g = fract(time * 0.16) * 1.8 - 0.4;
        float glint = exp(-pow((vUv.x - g) * 6.0, 2.0)) * (pow(1.0 - d, 2.0) * 1.6 + pow(1.0 - d, 16.0) * 4.0);
        vec3 c = color * (halo + glint) + vec3(1.0) * glint * pow(1.0 - d, 20.0);
        // Premultiplied output added onto the canvas, so the glow also shows over transparent pixels.
        gl_FragColor = vec4(c, clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0));
      }`,
    transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false,
    blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor,
    blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneFactor,
  });
  (function ribbon() {
    const pts = curve.getPoints(80), pos = [], uv = [], idx = [];
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = b.y - a.y, ny = -(b.x - a.x);
      const len = Math.hypot(nx, ny); nx /= len; ny /= len;
      if (nx < 0) { nx = -nx; ny = -ny; }
      const u = i / (pts.length - 1);
      for (const [off, v] of [[-0.16, -1], [0, 0], [0.45, 1]]) {
        pos.push(p.x + nx * off, p.y + ny * off, 0);
        uv.push(u, v);
      }
      if (i) for (const k of [0, 1]) { const r = (i - 1) * 3 + k, s = i * 3 + k; idx.push(r, s, r + 1, r + 1, s, s + 1); }
    });
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const m = new T.Mesh(g, glowMat);
    m.renderOrder = 2;
    halberd.add(m);
  })();

  // A four-point star that rides the glint along the edge.
  const star = (function () {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d");
    const r = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.15, "rgba(190,250,255,0.8)"); r.addColorStop(1, "rgba(111,227,238,0)");
    x.fillStyle = r; x.fillRect(0, 0, 128, 128);
    x.globalCompositeOperation = "lighter";
    for (const [w, h] of [[128, 6], [6, 128]]) {
      const l = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      l.addColorStop(0, "rgba(255,255,255,1)"); l.addColorStop(1, "rgba(111,227,238,0)");
      x.fillStyle = l; x.fillRect(64 - w / 2, 64 - h / 2, w, h);
    }
    const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    s.renderOrder = 3;
    halberd.add(s);
    return s;
  })();

  // Back hook, curving down to a point, ground thin toward its tip.
  const hook = new T.Shape();
  hook.moveTo(-0.06, 1.12);
  hook.lineTo(-0.48, 1.12);
  hook.quadraticCurveTo(-0.86, 1.1, -1.08, 0.7);
  hook.quadraticCurveTo(-0.78, 0.9, -0.5, 0.86);
  hook.lineTo(-0.06, 0.8);
  hook.closePath();
  plate(hook, 0.05, 0.012, steel, x => 1.5 - 1.1 * smooth(-0.06, -1.0, x));

  // Riveted langets strapping the head to the shaft.
  for (const s of [-1, 1]) {
    const l = new T.Mesh(new T.BoxGeometry(0.03, 1.2, 0.05), darkSteel);
    l.position.set(s * (SHAFT_R + 0.01), -0.45, 0);
    halberd.add(l);
  }

  // One model unit is about a fifth of the hero's height; the head sits up and to the right,
  // nearer the middle on narrow screens. The camera looks straight at the z = 0 plane, framed so
  // that plane maps 1:1 onto the host's pixels.
  function size() {
    const w = host.clientWidth, h = host.clientHeight, narrow = w < 760;
    const vh = (host.parentElement || host).clientHeight;
    renderer.setSize(w, h, false);
    const px = Math.min(vh * (narrow ? 0.13 : 0.19), w * (narrow ? 0.24 : 0.2));
    const W = w / px, H = h / px;
    const dist = (H / 2) / Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    camera.aspect = w / h;
    camera.near = Math.max(0.1, dist - 20); camera.far = dist + 20;
    camera.position.set(W / 2, -H / 2, dist);
    camera.lookAt(W / 2, -H / 2, 0);
    camera.updateProjectionMatrix();
    tilt.position.set(w * (narrow ? 0.6 : 0.78) / px, -vh * (narrow ? 0.3 : 0.33) / px, 0);
  }
  renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
  host.querySelector("img")?.remove();
  host.appendChild(renderer.domElement);
  addEventListener("resize", size);
  size();

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let tx = 0, ty = 0, mx = 0, my = 0;
  addEventListener("pointermove", e => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; });
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);

  function frame(ms) {
    const t = still ? 2.2 : ms / 1000;
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    // Three-quarter view, swaying a little either side, nudged by the pointer.
    halberd.rotation.y = -0.42 + Math.sin(t * 0.3) * 0.2 + mx * 0.35;
    halberd.rotation.x = my * 0.06;
    tilt.rotation.z = LEAN + mx * 0.04;
    glowMat.uniforms.time.value = t;
    const g = (t * 0.16) % 1 * 1.8 - 0.4;
    const on = g > 0 && g < 1;
    if (on) { const p = curve.getPoint(g); star.position.set(p.x + 0.02, p.y, 0.04); }
    const pulse = on ? Math.exp(-Math.pow((g - 0.5) * 2.4, 2)) : 0;
    star.scale.setScalar(on ? 0.35 + 0.6 * pulse : 0.0001);
    edge.emissiveIntensity = 1.4 + pulse * 1.6;
    if (visible || still) renderer.render(scene, camera);
    if (!still) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

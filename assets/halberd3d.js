// A real-time 3D halberd (three.js r128), drawn into the element with [data-halberd].
// Polished steel lit by a studio environment, with the axe's cutting edge in the one cyan accent.
// It leans diagonally across the host with its head up and to the right, turns slowly on its own
// shaft so reflections glint across the blade, and follows the pointer a little.
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
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-hidden", "true");

  const SHAFT_R = 0.075;
  const LEAN = -0.56; // radians; the head leans right
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(0, 1, 0, -1, -10, 10);

  // Studio environment for reflections: dark room, a big overhead softbox, a white strip on the
  // left and a cyan strip on the right.
  const pmrem = new T.PMREMGenerator(renderer);
  const env = new T.Scene();
  env.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ color: 0x0b0c0e, side: T.BackSide })));
  function panel(w, h, color, pos, look) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color, side: T.DoubleSide }));
    m.position.set(...pos); m.lookAt(...look); env.add(m);
  }
  panel(8, 3, new T.Color(5, 5, 5), [0, 7, 2], [0, 0, 0]);
  panel(1.2, 9, new T.Color(2.2, 2.3, 2.4), [-7, 1, 3], [0, 0, 0]);
  panel(1.2, 9, new T.Color(0.6, 2.6, 2.9), [7, 1, -2], [0, 0, 0]);
  panel(6, 1, new T.Color(0.9, 0.9, 0.9), [0, -6, 4], [0, 0, 0]);
  // In front: a dim fill plus two bright strips, so the flat blade faces show highlights that
  // sweep across them as the halberd turns, and a cyan wash from the right.
  panel(16, 12, new T.Color(0.22, 0.23, 0.25), [0, 0, 9], [0, 0, 0]);
  panel(12, 0.9, new T.Color(3.2, 3.2, 3.3), [0, 3.2, 7.5], [0, 0, 0]);
  panel(0.8, 12, new T.Color(2.4, 2.4, 2.5), [-3.5, 0, 7.5], [0, 0, 0]);
  panel(3, 12, new T.Color(0.25, 1.1, 1.25), [5.5, 0, 6.5], [0, 0, 0]);
  scene.environment = pmrem.fromScene(env, 0.03).texture;

  const steel = new T.MeshStandardMaterial({ color: 0xe6eaed, metalness: 1, roughness: 0.3 });
  const darkSteel = new T.MeshStandardMaterial({ color: 0x9aa1a7, metalness: 1, roughness: 0.38 });
  const edge = new T.MeshStandardMaterial({ color: 0x3fb8c4, metalness: 0.7, roughness: 0.18, emissive: 0x2fc7d4, emissiveIntensity: 0.7 });
  const wood = new T.MeshStandardMaterial({ color: 0x2a2e33, metalness: 0.2, roughness: 0.75 });

  const key = new T.DirectionalLight(0xffffff, 1.2); key.position.set(-2, 4, 5); scene.add(key);

  // tilt leans the weapon and pivots around the head's center; halberd spins on the shaft inside it.
  const tilt = new T.Group();
  tilt.rotation.z = LEAN;
  scene.add(tilt);
  const halberd = new T.Group();
  halberd.position.y = -1.3;
  tilt.add(halberd);
  const rim = new T.PointLight(0x6fe3ee, 3, 8); rim.position.set(2.2, 0.3, -1.5); tilt.add(rim);

  function plate(shape, depth, bevel, mat) {
    const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 1.4, bevelSegments: 3, curveSegments: 32 });
    g.translate(0, 0, -depth / 2);
    const m = new T.Mesh(g, mat);
    halberd.add(m);
    return m;
  }
  function lathe(points, mat, y) {
    const m = new T.Mesh(new T.LatheGeometry(points.map(p => new T.Vector2(p[0], p[1])), 48), mat);
    m.position.y = y || 0;
    halberd.add(m);
    return m;
  }

  // Shaft, running far below the frame.
  const shaft = new T.Mesh(new T.CylinderGeometry(SHAFT_R, SHAFT_R, 40, 32), wood);
  shaft.position.y = -19.6;
  halberd.add(shaft);

  // Socket with turned collars.
  lathe([[0, 0], [0.12, 0], [0.12, 0.05], [0.095, 0.08], [0.09, 1.08], [0.115, 1.1], [0.115, 1.16], [0.07, 1.2], [0, 1.2]], steel, 0.2);
  lathe([[0, 0], [0.13, 0], [0.13, 0.07], [0, 0.07]], darkSteel, 0.12);

  // Top spike: four-sided, so its ridges catch the light.
  const spike = new T.Mesh(new T.ConeGeometry(0.11, 1.75, 4, 1), steel);
  spike.position.y = 1.4 + 0.875;
  spike.rotation.y = Math.PI / 4;
  halberd.add(spike);
  const spikeBase = new T.Mesh(new T.OctahedronGeometry(0.12), steel);
  spikeBase.position.y = 1.4;
  spikeBase.scale.set(1, 0.6, 1);
  halberd.add(spikeBase);

  // Axe blade: rising top edge into a horn, convex cutting edge, bearded lower point, one piercing near the socket.
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
  plate(blade, 0.045, 0.014, steel);

  // Cyan cutting edge: a band following the blade's curve, sitting just proud of the steel.
  const curve = new T.QuadraticBezierCurve(p0, pc, p2);
  const outer = curve.getPoints(40), inner = outer.map(p => new T.Vector2(p.x - 0.13, p.y));
  const band = new T.Shape(outer.concat(inner.reverse()));
  plate(band, 0.1, 0.01, edge);

  // Back hook, curving down to a point.
  const hook = new T.Shape();
  hook.moveTo(-0.06, 1.12);
  hook.lineTo(-0.48, 1.12);
  hook.quadraticCurveTo(-0.86, 1.1, -1.08, 0.7);
  hook.quadraticCurveTo(-0.78, 0.9, -0.5, 0.86);
  hook.lineTo(-0.06, 0.8);
  hook.closePath();
  plate(hook, 0.04, 0.014, steel);

  // Riveted langets strapping the head to the shaft.
  for (const s of [-1, 1]) {
    const l = new T.Mesh(new T.BoxGeometry(0.03, 1.2, 0.05), darkSteel);
    l.position.set(s * (SHAFT_R + 0.01), -0.45, 0);
    halberd.add(l);
  }

  // One model unit is about a fifth of the host's height; the head sits up and to the right,
  // nearer the middle on narrow screens.
  function size() {
    const w = host.clientWidth, h = host.clientHeight, narrow = w < 760;
    renderer.setSize(w, h, false);
    const px = Math.min(h * (narrow ? 0.13 : 0.19), w * (narrow ? 0.24 : 0.2));
    camera.left = 0; camera.right = w / px; camera.top = 0; camera.bottom = -h / px;
    camera.updateProjectionMatrix();
    tilt.position.set(w * (narrow ? 0.6 : 0.7) / px, -h * (narrow ? 0.3 : 0.4) / px, 0);
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
    const t = ms / 1000;
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    halberd.rotation.y = (still ? -0.35 : Math.sin(t * 0.35) * 0.55) + mx * 0.9;
    halberd.rotation.x = my * 0.08;
    rim.position.x = 2.2 + Math.sin(t * 0.6) * 0.8;
    tilt.rotation.z = LEAN + mx * 0.06;
    if (visible || still) renderer.render(scene, camera);
    if (!still) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

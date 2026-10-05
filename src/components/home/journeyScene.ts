import * as THREE from 'three';

/**
 * Scroll-driven WebGL "compiler flight": the camera travels along a path through
 * the stages of the sdev toolchain (source → tokens → tree → bytecode → WASM/x86-64)
 * and ends orbiting the self-hosting fixed point. Progress (0..1) is pushed in from
 * the page's single passive scroll listener; nothing here listens to scroll.
 */

const token = (name: string, fallback: string) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const [h, s, l] = raw.split(/\s+/);
  return new THREE.Color().setStyle(`hsl(${h}, ${s}, ${l})`);
};

const cssHsl = (name: string, alpha = 1) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `hsl(${raw} / ${alpha})`;
};

type Stage = { title: string; index: string; lines: [string, string][]; accent: string; pos: THREE.Vector3; rotY: number };

const STAGES: Stage[] = [
  {
    index: '01', title: 'source.sdev', accent: '--primary', pos: new THREE.Vector3(0, 0, 0), rotY: 0,
    lines: [
      ['--muted-foreground', '// a taste of sdev'],
      ['--brand-sky', 'conjure greet(name) ::'],
      ['--brand-green', '  yield "Hello, " + name'],
      ['--muted-foreground', ';;'],
      ['--brand-sky', 'forge names be ["Ada", "Grace"]'],
      ['--brand-sky', 'iterate name through names ::'],
      ['--brand-amber', '  speak(greet(name))'],
      ['--muted-foreground', ';;'],
    ],
  },
  {
    index: '02', title: 'tokens', accent: '--brand-cyan', pos: new THREE.Vector3(-1.2, 0.3, -20), rotY: 0.18,
    lines: [
      ['--brand-cyan', 'KW_CONJURE   "conjure"'],
      ['--foreground', 'IDENT        "greet"'],
      ['--muted-foreground', 'LPAREN       "("'],
      ['--foreground', 'IDENT        "name"'],
      ['--muted-foreground', 'RPAREN       ")"'],
      ['--brand-cyan', 'BLOCK_OPEN   "::"'],
      ['--brand-cyan', 'KW_YIELD     "yield"'],
      ['--brand-green', 'STRING       "Hello, "'],
    ],
  },
  {
    index: '03', title: 'syntax tree', accent: '--brand-violet', pos: new THREE.Vector3(1.4, -0.2, -40), rotY: -0.2,
    lines: [
      ['--brand-violet', 'Program'],
      ['--foreground', ' ├─ FuncDecl greet(name)'],
      ['--foreground', ' │   └─ Yield'],
      ['--brand-green', ' │       └─ Binary(+) "Hello, " name'],
      ['--foreground', ' ├─ Forge names'],
      ['--brand-green', ' │   └─ List ["Ada", "Grace"]'],
      ['--foreground', ' └─ Iterate name ∈ names'],
      ['--brand-amber', '     └─ Call speak(greet(name))'],
    ],
  },
  {
    index: '04', title: 'bytecode', accent: '--brand-amber', pos: new THREE.Vector3(-1, 0.4, -60), rotY: 0.15,
    lines: [
      ['--brand-amber', '0000  ENTER       1'],
      ['--foreground', '0002  PUSH_STR    "Hello, "'],
      ['--foreground', '0004  LOAD_LOC    0'],
      ['--foreground', '0006  ADD'],
      ['--brand-amber', '0007  RET'],
      ['--foreground', '0008  PUSH_LIST   2'],
      ['--foreground', '000a  STORE_GLB   names'],
      ['--brand-amber', '000c  ITER_NEXT   0x18'],
    ],
  },
  {
    index: '05', title: 'seed.wasm', accent: '--brand-sky', pos: new THREE.Vector3(-5.4, 0.6, -82), rotY: 0.42,
    lines: [
      ['--brand-sky', '(module $sdev_seed'],
      ['--foreground', '  (memory 16)'],
      ['--foreground', '  (func $dispatch'],
      ['--muted-foreground', '    loop $vm'],
      ['--foreground', '      local.get $pc'],
      ['--foreground', '      i32.load8_u'],
      ['--brand-sky', '      br_table $op…'],
      ['--muted-foreground', '  ))'],
    ],
  },
  {
    index: '06', title: 'native x86-64', accent: '--brand-green', pos: new THREE.Vector3(5.4, 0.6, -82), rotY: -0.42,
    lines: [
      ['--brand-green', '_start:'],
      ['--foreground', '    movq  %rsp, %rbp'],
      ['--foreground', '    leaq  names(%rip), %rdi'],
      ['--foreground', '    call  sdev_iterate'],
      ['--foreground', '    movq  $60, %rax'],
      ['--foreground', '    xorq  %rdi, %rdi'],
      ['--brand-green', '    syscall'],
      ['--muted-foreground', '# no libc · static'],
    ],
  },
];

const CORE = new THREE.Vector3(0, 0.4, -112);

function panelTexture(stage: Stage, maxAniso: number) {
  const W = 1024, H = 640;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = cssHsl('--card', 0.82);
  g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 22); g.fill();
  g.strokeStyle = cssHsl(stage.accent, 0.75);
  g.lineWidth = 3; g.stroke();
  // header
  g.fillStyle = cssHsl('--background', 0.55);
  g.beginPath(); g.roundRect(4, 4, W - 8, 74, [22, 22, 0, 0]); g.fill();
  g.font = '600 28px "JetBrains Mono", monospace';
  g.fillStyle = cssHsl(stage.accent);
  g.fillText(stage.index, 36, 52);
  g.fillStyle = cssHsl('--foreground', 0.85);
  g.fillText(stage.title, 92, 52);
  ['--brand-rose', '--brand-amber', '--brand-green'].forEach((t, i) => {
    g.fillStyle = cssHsl(t, 0.7);
    g.beginPath(); g.arc(W - 120 + i * 32, 41, 9, 0, Math.PI * 2); g.fill();
  });
  g.font = '500 30px "JetBrains Mono", monospace';
  stage.lines.forEach(([color, text], i) => {
    g.fillStyle = cssHsl(color);
    g.fillText(text, 44, 140 + i * 58);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export class JourneyScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private curve: THREE.CatmullRomCurve3;
  private panels: THREE.Group[] = [];
  private packets: { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; offset: number }[] = [];
  private core = new THREE.Group();
  private particles: THREE.Points;
  private target = 0;
  private current = 0;
  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();
  private clock = new THREE.Clock();
  private raf = 0;
  private running = false;
  private disposables: { dispose: () => void }[] = [];
  private look = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private size = new THREE.Vector2(1, 1);
  private lastShift = NaN;

  constructor(private canvas: HTMLCanvasElement, private compact: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !compact, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.25 : 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 260);
    this.scene.fog = new THREE.FogExp2(token('--background', '220 23% 5%'), 0.028);

    this.curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.6, 15),
      new THREE.Vector3(0, 0.4, 8.5),
      new THREE.Vector3(2.6, 1.0, -9),
      new THREE.Vector3(-1.2, 0.3, -11.5),
      new THREE.Vector3(-3.2, -0.2, -28),
      new THREE.Vector3(1.4, -0.2, -31.5),
      new THREE.Vector3(3.4, 0.9, -48),
      new THREE.Vector3(-1, 0.4, -51.5),
      new THREE.Vector3(0, 1.6, -66),
      new THREE.Vector3(0, 1.0, -70),
      new THREE.Vector3(-2.5, 1.0, -94),
      new THREE.Vector3(0, 0.8, -100),
    ], false, 'catmullrom', 0.35);

    this.buildPanels();
    this.particles = this.buildParticles();
    this.buildCore();
    this.buildPackets();
    this.resize();
  }

  private buildPanels() {
    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    const geo = new THREE.PlaneGeometry(6.4, 4);
    const edgeGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(6.6, 4.2));
    this.disposables.push(geo, edgeGeo);
    STAGES.forEach((stage) => {
      const tex = panelTexture(stage, aniso);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
      const edgeMat = new THREE.LineBasicMaterial({ color: token(stage.accent, '217 91% 60%'), transparent: true, opacity: 0.5 });
      this.disposables.push(tex, mat, edgeMat);
      const group = new THREE.Group();
      group.add(new THREE.Mesh(geo, mat));
      const edge = new THREE.LineSegments(edgeGeo, edgeMat);
      edge.position.z = -0.25;
      group.add(edge);
      // a faint plinth grid under each panel
      const grid = new THREE.GridHelper(10, 10, token(stage.accent, '217 91% 60%'), token('--border', '217 20% 20%'));
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.18;
      grid.position.y = -2.8;
      group.add(grid);
      this.disposables.push(grid.geometry, grid.material as THREE.Material);
      group.position.copy(stage.pos);
      group.rotation.y = stage.rotY;
      this.scene.add(group);
      this.panels.push(group);
    });
  }

  private buildParticles() {
    const count = this.compact ? 1400 : 3200;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [token('--primary', '217 91% 60%'), token('--brand-cyan', '187 85% 55%'), token('--brand-violet', '258 70% 68%'), token('--foreground', '220 33% 93%')];
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.random() * 22;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r * 0.6;
      pos[i * 3 + 2] = 24 - Math.random() * 160;
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
    this.disposables.push(geo, mat);
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    return pts;
  }

  private buildPackets() {
    const geo = new THREE.SphereGeometry(0.06, 10, 10);
    this.disposables.push(geo);
    const pairs: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5]];
    pairs.forEach(([a, b], pi) => {
      const accent = token(STAGES[b].accent, '217 91% 60%');
      const mat = new THREE.MeshBasicMaterial({ color: accent });
      const lineMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.16 });
      this.disposables.push(mat, lineMat);
      const from = STAGES[a].pos.clone().add(new THREE.Vector3(0, -2.2, 0));
      const to = STAGES[b].pos.clone().add(new THREE.Vector3(0, -2.2, 0));
      const lineGeo = new THREE.BufferGeometry().setFromPoints([from, to]);
      this.disposables.push(lineGeo);
      this.scene.add(new THREE.Line(lineGeo, lineMat));
      for (let k = 0; k < 4; k++) {
        const mesh = new THREE.Mesh(geo, mat);
        this.scene.add(mesh);
        this.packets.push({ mesh, from, to, offset: k / 4 + pi * 0.13 });
      }
    });
  }

  private buildCore() {
    const knotGeo = new THREE.TorusKnotGeometry(2.2, 0.5, this.compact ? 120 : 220, 18, 2, 3);
    const knotMat = new THREE.MeshBasicMaterial({ color: token('--primary', '217 91% 60%'), wireframe: true, transparent: true, opacity: 0.38 });
    const innerGeo = new THREE.IcosahedronGeometry(1.05, 1);
    const innerMat = new THREE.MeshBasicMaterial({ color: token('--brand-cyan', '187 85% 55%'), wireframe: true, transparent: true, opacity: 0.85 });
    const ringGeo = new THREE.TorusGeometry(4.2, 0.012, 8, 160);
    const ringMat = new THREE.MeshBasicMaterial({ color: token('--brand-violet', '258 70% 68%'), transparent: true, opacity: 0.6 });
    this.disposables.push(knotGeo, knotMat, innerGeo, innerMat, ringGeo, ringMat);
    const knot = new THREE.Mesh(knotGeo, knotMat);
    const inner = new THREE.Mesh(innerGeo, innerMat);
    const ringA = new THREE.Mesh(ringGeo, ringMat);
    const ringB = new THREE.Mesh(ringGeo, ringMat);
    ringA.rotation.x = Math.PI / 2.4;
    ringB.rotation.y = Math.PI / 2.2;
    this.core.add(knot, inner, ringA, ringB);
    this.core.position.copy(CORE);
    this.scene.add(this.core);
  }

  setProgress(p: number) { this.target = Math.min(Math.max(p, 0), 1); }
  setPointer(x: number, y: number) { this.pointer.set(x, y); }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep panels framed on tall phone screens
    this.camera.fov = w / h < 0.8 ? 72 : 52;
    this.size.set(w, h);
    this.applyOffset(0);
  }

  /** On wide screens the 3D focus sits right of centre so the chapter copy has room on the left. */
  private applyOffset(orbit: number) {
    const { x: w, y: h } = this.size;
    const shift = w / h > 1.1 ? -w * 0.17 * (1 - orbit) : 0;
    if (Math.abs(shift - this.lastShift) < 0.5 && this.camera.view) return;
    this.lastShift = shift;
    this.camera.setViewOffset(w, h, shift, 0, w, h);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.getDelta();
    const loop = () => {
      if (!this.running) return;
      this.frame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Render one frame at the current progress (used for reduced-motion snapshots). */
  renderOnce() { this.current = this.target; this.frame(); }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    // critically-damped follow: smooth but never lags far behind native scroll
    this.current += (this.target - this.current) * (1 - Math.exp(-dt * 7));
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 4));
    const p = this.current;

    const travel = Math.min(p / 0.9, 1);
    const camPos = this.curve.getPointAt(travel);
    const ahead = this.curve.getPointAt(Math.min(travel + 0.035, 1));

    // final chapter: orbit the fixed-point core
    const orbit = Math.min(Math.max((p - 0.86) / 0.14, 0), 1);
    if (orbit > 0) {
      const ang = orbit * 1.4 - 0.7;
      const orbitPos = this.tmp.set(CORE.x + Math.sin(ang) * 10, CORE.y + 1.2 + orbit * 0.8, CORE.z + Math.cos(ang) * 10);
      camPos.lerp(orbitPos, orbit);
      ahead.lerp(CORE, Math.min(orbit * 1.6, 1));
    }

    this.applyOffset(orbit);
    camPos.x += this.pointerSmooth.x * 0.45;
    camPos.y += this.pointerSmooth.y * 0.3;
    this.camera.position.copy(camPos);
    this.look.lerp(ahead, this.look.lengthSq() === 0 ? 1 : 1 - Math.exp(-dt * 6));
    this.camera.lookAt(this.look);

    // panels breathe gently and turn slightly toward the camera as you pass
    this.panels.forEach((g, i) => {
      g.position.y = STAGES[i].pos.y + Math.sin(t * 0.6 + i) * 0.08;
      const dz = this.camera.position.z - g.position.z;
      g.rotation.y = STAGES[i].rotY * Math.min(Math.max(dz / 14, 0.2), 1.4);
    });

    this.packets.forEach((pk) => {
      const k = (t * 0.22 + pk.offset) % 1;
      pk.mesh.position.lerpVectors(pk.from, pk.to, k);
      pk.mesh.scale.setScalar(Math.sin(k * Math.PI) * 1.2 + 0.2);
    });

    this.core.rotation.y = t * 0.25 + p * 3;
    this.core.rotation.x = Math.sin(t * 0.3) * 0.2;
    this.core.children[1].rotation.set(t * 0.6, t * 0.4, 0);
    this.particles.rotation.z = t * 0.01 + p * 0.6;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
  }
}

import * as THREE from 'three';

type Panel = { label: string; lines: string[] };

export function createCompilerScene(host: HTMLDivElement, section: HTMLElement, panels: Panel[]) {
  const css = getComputedStyle(section);
  const color = (token: string) => new THREE.Color(`hsl(${css.getPropertyValue(token).trim().split(/\s+/).join(', ')})`);
  const background = color('--background');
  const surface = color('--card');
  const primary = color('--primary');
  const foreground = color('--foreground');
  const muted = color('--muted-foreground');
  const scene = new THREE.Scene();
  scene.background = background;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  scene.add(new THREE.AmbientLight(foreground, 2));
  const light = new THREE.DirectionalLight(primary, 5);
  light.position.set(4, 8, 10); scene.add(light);
  const rig = new THREE.Group(); scene.add(rig);
  const textures: THREE.Texture[] = [];
  const blocks = panels.map((panel, i) => {
    const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 840;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = surface.getStyle(); ctx.fillRect(0, 0, 1400, 840);
    ctx.fillStyle = primary.getStyle(); ctx.fillRect(0, 0, 8, 840);
    ctx.font = '500 34px monospace'; ctx.fillStyle = muted.getStyle();
    ctx.fillText(`0${i + 1} / SDEV`, 60, 75);
    ctx.font = '500 46px monospace'; ctx.fillStyle = foreground.getStyle(); ctx.fillText(panel.label, 60, 165);
    ctx.strokeStyle = muted.getStyle(); ctx.globalAlpha = .3; ctx.beginPath(); ctx.moveTo(60, 205); ctx.lineTo(1340, 205); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.font = '32px monospace';
    panel.lines.forEach((line, n) => { ctx.fillStyle = n % 2 ? foreground.getStyle() : primary.getStyle(); ctx.fillText(line, 60, 290 + n * 78); });
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
    const group = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.84, .15), new THREE.MeshStandardMaterial({ color: surface, metalness: .5, roughness: .35 }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(6.36, 3.8), new THREE.MeshBasicMaterial({ map: texture })); face.position.z = .081;
    group.add(slab, face);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({ color: primary, transparent: true, opacity: .4 })); group.add(edge);
    rig.add(group); return group;
  });
  // A deterministic exploded assembly, not an autoplaying decorative object.
  const machine = new THREE.Group(); rig.add(machine);
  const tileGeometry = new THREE.BoxGeometry(.62, .2, .62);
  const tiles: THREE.Mesh[] = [];
  for (let z = 0; z < 6; z++) {
    for (let x = 0; x < 6; x++) {
      const tile = new THREE.Mesh(tileGeometry, new THREE.MeshStandardMaterial({ color: (x + z) % 5 === 0 ? primary : surface, roughness: .28, metalness: .65 }));
      tile.userData.x = x; tile.userData.z = z;
      machine.add(tile); tiles.push(tile);
    }
  }
  const processor = new THREE.Mesh(new THREE.BoxGeometry(4.9, .28, 4.9), new THREE.MeshStandardMaterial({ color: surface, metalness: .8, roughness: .35 }));
  processor.position.y = -.4; machine.add(processor);
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(processor.geometry), new THREE.LineBasicMaterial({ color: primary }));
  outline.position.copy(processor.position); machine.add(outline);
  const targets = new THREE.Group(); rig.add(targets);
  const targetBlocks = ['WebAssembly', 'Native x86-64'].map((label, i) => {
    const c = document.createElement('canvas'); c.width = 800; c.height = 400;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = surface.getStyle(); ctx.fillRect(0, 0, 800, 400);
    ctx.fillStyle = primary.getStyle(); ctx.fillRect(40, 45, 70, 8);
    ctx.font = '500 28px monospace'; ctx.fillStyle = muted.getStyle(); ctx.fillText(i ? '02 / DESKTOP' : '01 / BROWSER', 40, 115);
    ctx.font = '500 48px monospace'; ctx.fillStyle = foreground.getStyle(); ctx.fillText(label, 40, 225);
    ctx.font = '28px monospace'; ctx.fillStyle = primary.getStyle(); ctx.fillText(i ? 'native machine code' : 'portable bytecode', 40, 315);
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
    const target = new THREE.Group();
    target.add(new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.75, .4), new THREE.MeshStandardMaterial({ color: surface, metalness: .7, roughness: .3 })));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.48, 1.73), new THREE.MeshBasicMaterial({ map: texture })); face.position.z = .21;
    target.add(face); targets.add(target); return target;
  });
  const smooth = (start: number, end: number, p: number) => THREE.MathUtils.smoothstep(p, start, end);
  const resize = () => { const { width, height } = host.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  let frame = 0;
  let visible = true;
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); visibility.observe(host);
  const render = () => {
    frame = requestAnimationFrame(render);
    if (!visible) return;
    const p = Number(section.style.getPropertyValue('--how') || 0);
    const stage = Math.min(p * 3, 1.4);
    const assembly = smooth(.4, .7, p);
    const split = smooth(.72, .96, p);
    rig.rotation.y = -.55 + p * 1.05;
    rig.rotation.x = .12 - Math.sin(p * Math.PI) * .16;
    blocks.forEach((block, i) => {
      const d = i - stage;
      const explode = smooth(.27, .48, p);
      block.position.set(d * .6 + (i % 2 ? 1 : -1) * explode * 7, d * .65 + explode * (i - 1.5) * 3, -d * 3.1 - explode * 3);
      block.rotation.y = d * -.08 + explode * (i % 2 ? .6 : -.6);
      block.visible = d > -.8 && p < .56;
    });
    machine.visible = p > .35 && p < .96;
    machine.rotation.set(.65 + assembly * .22, assembly * .6, 0);
    machine.scale.setScalar(1 - split * .7);
    tiles.forEach(tile => {
      const x = Number(tile.userData.x); const z = Number(tile.userData.z);
      const scatter = 1 - assembly;
      tile.position.set((x - 2.5) * (.73 + scatter * 1.6), scatter * ((x + z) % 4) * 1.2, (z - 2.5) * (.73 + scatter * 1.6));
      tile.rotation.set(scatter * .35, scatter * (x - 2.5) * .15, 0);
    });
    targets.visible = p > .74;
    targetBlocks.forEach((target, i) => {
      target.position.set(-.8 + (i ? 1 : -1) * (1 + split * .85), (i ? -.75 : .75) * split, split);
      target.rotation.y = (i ? -.2 : .2) * split;
      target.scale.setScalar(.05 + split * .95);
    });
    const framingDistance = Math.max(17, 6.4 / (.43 * 2 * Math.tan(THREE.MathUtils.degToRad(18)) * camera.aspect));
    camera.position.set(-3.1 + Math.sin(p * Math.PI) * 1.3, 1.2 + p * .7, framingDistance - Math.sin(p * Math.PI));
    camera.lookAt(-3.1, .5, 0);
    renderer.render(scene, camera);
    host.dataset.progress = p.toFixed(3);
    host.dataset.chapter = p < .35 ? 'layers' : p < .74 ? 'assembly' : 'targets';
  }; render();
  return () => {
    cancelAnimationFrame(frame); observer.disconnect(); visibility.disconnect();
    scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()); } });
    textures.forEach(t => t.dispose()); renderer.dispose(); renderer.domElement.remove();
  };
}
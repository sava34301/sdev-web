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
  const resize = () => { const { width, height } = host.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  let frame = 0;
  let visible = true;
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); visibility.observe(host);
  const render = () => {
    frame = requestAnimationFrame(render);
    if (!visible) return;
    const p = Number(section.style.getPropertyValue('--how') || 0);
    const stage = p * 3;
    rig.rotation.y = -.48 + p * .68;
    rig.rotation.x = .12 - Math.sin(p * Math.PI) * .16;
    blocks.forEach((block, i) => {
      const d = i - stage;
      block.position.set(d * .6, d * .65, -d * 3.1);
      block.rotation.y = d * -.08;
      block.visible = d > -.8;
    });
    const framingDistance = Math.max(17, 6.4 / (.43 * 2 * Math.tan(THREE.MathUtils.degToRad(18)) * camera.aspect));
    camera.position.set(-3.1 + Math.sin(p * Math.PI) * 1.3, 1.2 + p * .7, framingDistance - Math.sin(p * Math.PI));
    camera.lookAt(-3.1, .5, 0);
    renderer.render(scene, camera);
    host.dataset.progress = p.toFixed(3);
  }; render();
  return () => {
    cancelAnimationFrame(frame); observer.disconnect(); visibility.disconnect();
    scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()); } });
    textures.forEach(t => t.dispose()); renderer.dispose(); renderer.domElement.remove();
  };
}
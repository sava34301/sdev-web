import * as THREE from 'three';

export function createCompilerScene(canvas: HTMLCanvasElement) {
  const styles = getComputedStyle(document.documentElement);
  const color = (token: string) => new THREE.Color(`hsl(${styles.getPropertyValue(token).trim().replace(/\s+/g, ', ')})`);
  const background = color('--background');
  const primary = color('--primary');
  const foreground = color('--foreground');
  const muted = color('--muted-foreground');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(background, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  scene.add(new THREE.AmbientLight(foreground, 2));
  const light = new THREE.DirectionalLight(foreground, 4);
  light.position.set(4, 9, 8); scene.add(light);
  const blueLight = new THREE.PointLight(primary, 35, 30);
  blueLight.position.set(-2, 4, 4); scene.add(blueLight);
  const assembly = new THREE.Group(); scene.add(assembly);
  const resources: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  const boardGeometry = new THREE.BoxGeometry(5.6, .16, 3.6);
  resources.push(boardGeometry);
  const layers = ['YOUR SOURCE', 'UNDERSTANDING', 'SELF-HOSTED COMPILER', 'WASM + NATIVE'];
  const details = [
    ['forge message be "Hello, World!"', 'speak(message)'],
    ['source → tokens → syntax tree', 'read intent · preserve working code'],
    ['PUSH_STR  "Hello, World!"', 'CALL      speak', 'RET'],
    ['BROWSER                  COMPUTER', 'WebAssembly              x86-64', 'Hello, World!'],
  ];
  const groups = layers.map((label, i) => {
    const group = new THREE.Group(); assembly.add(group);
    const material = new THREE.MeshStandardMaterial({ color: color('--card'), metalness: .5, roughness: .35 });
    resources.push(material);
    group.add(new THREE.Mesh(boardGeometry, material));
    const edges = new THREE.EdgesGeometry(boardGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: i === 0 ? primary : color('--border') });
    resources.push(edges, edgeMaterial);
    group.add(new THREE.LineSegments(edges, edgeMaterial));
    const surface = document.createElement('canvas'); surface.width = 1024; surface.height = 640;
    const ctx = surface.getContext('2d');
    if (ctx) {
      ctx.fillStyle = color('--card').getStyle(); ctx.fillRect(0, 0, 1024, 640);
      ctx.fillStyle = primary.getStyle(); ctx.font = '500 24px monospace'; ctx.fillText(`0${i + 1} / SDEV`, 60, 68);
      ctx.fillStyle = foreground.getStyle(); ctx.font = '600 42px sans-serif'; ctx.fillText(label, 60, 148);
      ctx.strokeStyle = color('--border').getStyle(); ctx.beginPath(); ctx.moveTo(60, 190); ctx.lineTo(964, 190); ctx.stroke();
      ctx.font = '26px monospace';
      details[i].forEach((line, n) => { ctx.fillStyle = n === 0 ? foreground.getStyle() : muted.getStyle(); ctx.fillText(line, 60, 278 + n * 58); });
      ctx.fillStyle = primary.getStyle(); ctx.fillRect(60, 554, 130, 5);
    }
    const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace;
    const faceGeometry = new THREE.PlaneGeometry(5.5, 3.5);
    const faceMaterial = new THREE.MeshBasicMaterial({ map: texture });
    resources.push(texture, faceGeometry, faceMaterial);
    const face = new THREE.Mesh(faceGeometry, faceMaterial); face.rotation.x = -Math.PI / 2; face.position.y = .09; group.add(face);
    return group;
  });
  // Fine vertical rails make the separation of the compiler layers tangible.
  const railGeometry = new THREE.CylinderGeometry(.025, .025, 7, 8);
  const railMaterial = new THREE.MeshStandardMaterial({ color: primary, metalness: .7, roughness: .25 });
  resources.push(railGeometry, railMaterial);
  for (const x of [-2.6, 2.6]) for (const z of [-1.55, 1.55]) {
    const rail = new THREE.Mesh(railGeometry, railMaterial); rail.position.set(x, 0, z); assembly.add(rail);
  }
  let progress = 0;
  const render = (p: number) => {
    progress = p;
    const explosion = Math.sin(Math.min(p * 1.35, 1) * Math.PI / 2);
    groups.forEach((group, i) => {
      group.position.y = (1.5 - i) * (.32 + explosion * 1.65);
      group.rotation.y = (i - 1.5) * Math.sin(p * Math.PI) * .13;
    });
    const compact = camera.aspect < 1.25;
    assembly.scale.setScalar(compact ? .75 : 1);
    assembly.position.set(compact ? 2.4 : 3.1, -.5, 0);
    assembly.rotation.y = -.25 + p * 1.8;
    camera.position.set(Math.sin(p * Math.PI) * 2, 7.5 - p * 3.2, 17 - p * 2);
    camera.lookAt(0, -.3, 0);
    renderer.render(scene, camera);
    canvas.dataset.progress = p.toFixed(3);
  };
  const resize = () => {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render(progress);
  };
  resize();
  return { render, resize, dispose: () => { resources.forEach(r => r.dispose()); renderer.dispose(); } };
}
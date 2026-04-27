// Controlador de câmera — abstrai OrbitControls (3D) e pan/zoom Konva (2D)
export class CameraController {
  constructor() {
    this.modo = '3d';  // '3d' | '2d'
    this._controls3d = null;  // THREE.OrbitControls
    this._stage2d = null;     // Konva.Stage
    this._camera3d = null;    // THREE.PerspectiveCamera
    // Posição padrão da câmera 3D
    this._defaultPos3d = { x: 0, y: 18, z: 18 };
    this._defaultTarget = { x: 0, y: 0, z: 0 };
  }

  // ── Inicialização ──────────────────────────────────────────────────────────

  init3D(camera, renderer, controls) {
    this._camera3d  = camera;
    this._renderer3d = renderer;
    this._controls3d = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 80;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // não vai embaixo do plano
    this.reset3D();
  }

  init2D(stage) {
    this._stage2d = stage;
    this._setupPanZoom2D();
  }

  setModo(modo) {
    this.modo = modo;
  }

  // ── Controles 3D ──────────────────────────────────────────────────────────

  reset3D() {
    if (!this._camera3d) return;
    const { x, y, z } = this._defaultPos3d;
    this._camera3d.position.set(x, y, z);
    if (this._controls3d) {
      this._controls3d.target.set(0, 0, 0);
      this._controls3d.update();
    }
  }

  focar3D(posX, posY, gridSize) {
    if (!this._camera3d || !this._controls3d) return;
    const wx = (posX - 10) * gridSize;
    const wz = (posY - 10) * gridSize;
    this._controls3d.target.set(wx, 0, wz);
    this._camera3d.position.set(wx, 10, wz + 8);
    this._controls3d.update();
  }

  centralizar3D(mapW, mapH, gridSize) {
    if (!this._camera3d || !this._controls3d) return;
    const cx = (mapW / 2) * gridSize;
    const cz = (mapH / 2) * gridSize;
    this._controls3d.target.set(cx, 0, cz);
    const dist = Math.max(mapW, mapH) * gridSize * 0.7;
    this._camera3d.position.set(cx, dist, cz + dist * 0.4);
    this._controls3d.update();
  }

  update3D() {
    if (this._controls3d) this._controls3d.update();
  }

  // ── Controles 2D (Konva) ──────────────────────────────────────────────────

  _setupPanZoom2D() {
    const stage = this._stage2d;
    if (!stage) return;
    let lastDist = 0;
    let isPanning = false;
    let lastPos = { x: 0, y: 0 };

    // Desktop: arrastar no fundo para pan
    stage.on('mousedown', e => {
      if (e.target !== stage && e.target.getClassName() !== 'Layer') return;
      isPanning = true;
      lastPos = stage.getPointerPosition();
    });
    stage.on('mousemove', () => {
      if (!isPanning) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      stage.x(stage.x() + pos.x - lastPos.x);
      stage.y(stage.y() + pos.y - lastPos.y);
      lastPos = pos;
    });
    stage.on('mouseup', () => { isPanning = false; });

    // Scroll para zoom
    stage.on('wheel', e => {
      e.evt.preventDefault();
      const oldScale = stage.scaleX();
      const pointer  = stage.getPointerPosition();
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
      const fator = e.evt.deltaY < 0 ? 1.1 : 0.9;
      const novaEscala = Math.min(Math.max(oldScale * fator, 0.2), 5);
      stage.scale({ x: novaEscala, y: novaEscala });
      stage.position({
        x: pointer.x - mousePointTo.x * novaEscala,
        y: pointer.y - mousePointTo.y * novaEscala,
      });
    });

    // Touch: 1 dedo pan, 2 dedos pinch zoom
    stage.on('touchmove', e => {
      e.evt.preventDefault();
      const touches = e.evt.touches;
      if (touches.length === 1) {
        const rect = stage.container().getBoundingClientRect();
        const pos = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top };
        if (isPanning) {
          stage.x(stage.x() + pos.x - lastPos.x);
          stage.y(stage.y() + pos.y - lastPos.y);
        }
        lastPos = pos;
        isPanning = true;
      } else if (touches.length === 2) {
        isPanning = false;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastDist) {
          const fator = dist / lastDist;
          const oldScale = stage.scaleX();
          const novaEscala = Math.min(Math.max(oldScale * fator, 0.2), 5);
          stage.scale({ x: novaEscala, y: novaEscala });
        }
        lastDist = dist;
      }
    });
    stage.on('touchend', () => { isPanning = false; lastDist = 0; });
  }

  reset2D(container) {
    if (!this._stage2d) return;
    this._stage2d.x(0);
    this._stage2d.y(0);
    this._stage2d.scale({ x: 1, y: 1 });
  }

  centralizar2D(mapW, mapH, gridSize) {
    if (!this._stage2d) return;
    const stage = this._stage2d;
    const sw = stage.width(), sh = stage.height();
    const mw = mapW * gridSize, mh = mapH * gridSize;
    const escala = Math.min(sw / mw, sh / mh) * 0.9;
    stage.scale({ x: escala, y: escala });
    stage.position({ x: (sw - mw * escala) / 2, y: (sh - mh * escala) / 2 });
  }

  focar2D(posX, posY, gridSize) {
    if (!this._stage2d) return;
    const stage = this._stage2d;
    const escala = 2;
    const wx = posX * gridSize;
    const wy = posY * gridSize;
    stage.scale({ x: escala, y: escala });
    stage.position({
      x: stage.width() / 2 - wx * escala,
      y: stage.height() / 2 - wy * escala,
    });
  }
}

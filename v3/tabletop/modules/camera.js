// Controlador de câmera para modos 3D (OrbitControls) e 2D (Konva)
// Suporte a WASD em ambos os modos

export class CameraController {
  constructor() {
    this.modo = '3d';
    this._controls  = null;
    this._camera    = null;
    this._stage     = null;
    this._keys      = {};       // teclas pressionadas
    this._wasdSpeed = 0.15;     // unidades por frame (3D)
    this._wasdSpeed2d = 8;      // px por frame (2D)
    this._wasdInit  = false;
    this._raf       = null;
  }

  // ── Inicialização ──────────────────────────────────────────────────────────

  init3D(camera, renderer, controls) {
    this._camera   = camera;
    this._controls = controls;
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.08;
    controls.minDistance     = 2;
    controls.maxDistance     = 100;
    controls.maxPolarAngle   = Math.PI / 2 - 0.04;
    this.reset3D();
    this._iniciarWASD();
  }

  init2D(stage) {
    this._stage = stage;
    this._setupPanZoom2D();
    this._iniciarWASD();
  }

  setModo(modo) { this.modo = modo; }

  // ── WASD ──────────────────────────────────────────────────────────────────

  _iniciarWASD() {
    if (this._wasdInit) return;
    this._wasdInit = true;

    window.addEventListener('keydown', e => {
      // Não captura quando foco está em input/textarea
      if (document.activeElement?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) return;
      this._keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', e => { this._keys[e.key.toLowerCase()] = false; });

    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      this._tickWASD();
    };
    loop();
  }

  _tickWASD() {
    const { w, a, s, d } = {
      w: this._keys['w'], a: this._keys['a'],
      s: this._keys['s'], d: this._keys['d'],
    };
    if (!w && !a && !s && !d) return;

    if (this.modo === '3d' && this._controls) {
      // Move o target do OrbitControls no plano XZ
      const spd = this._wasdSpeed * (this._controls.getDistance?.() || 10) * 0.05;
      const fwd  = new THREE.Vector3();
      const right = new THREE.Vector3();
      this._camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();
      right.crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

      const delta = new THREE.Vector3();
      if (w) delta.addScaledVector(fwd,   spd);
      if (s) delta.addScaledVector(fwd,  -spd);
      if (d) delta.addScaledVector(right, spd);
      if (a) delta.addScaledVector(right,-spd);

      this._controls.target.add(delta);
      this._camera.position.add(delta);
      this._controls.update();
    } else if (this.modo === '2d' && this._stage) {
      const spd = this._wasdSpeed2d / this._stage.scaleX();
      let dx = 0, dy = 0;
      if (w) dy += spd;
      if (s) dy -= spd;
      if (a) dx += spd;
      if (d) dx -= spd;
      this._stage.x(this._stage.x() + dx);
      this._stage.y(this._stage.y() + dy);
    }
  }

  // ── 3D ────────────────────────────────────────────────────────────────────

  reset3D() {
    if (!this._camera) return;
    this._camera.position.set(0, 18, 18);
    if (this._controls) { this._controls.target.set(0, 0, 0); this._controls.update(); }
  }

  focar3D(posX, posY, gridSize) {
    if (!this._camera || !this._controls) return;
    const wx = posX * gridSize, wz = posY * gridSize;
    this._controls.target.set(wx, 0, wz);
    this._camera.position.set(wx, 10, wz + 8);
    this._controls.update();
  }

  centralizar3D(mapW, mapH, gridSize) {
    if (!this._camera || !this._controls) return;
    const cx = (mapW / 2) * gridSize, cz = (mapH / 2) * gridSize;
    this._controls.target.set(cx, 0, cz);
    const dist = Math.max(mapW, mapH) * gridSize * 0.7;
    this._camera.position.set(cx, dist, cz + dist * 0.4);
    this._controls.update();
  }

  update3D() { this._controls?.update(); }

  setOrbitEnabled(enabled) {
    if (!this._controls) return;
    this._controls.enableRotate = enabled;
    this._controls.enablePan    = enabled;
    // Manter zoom sempre ativo
    this._controls.enableZoom   = true;
  }

  // ── 2D ────────────────────────────────────────────────────────────────────

  _setupPanZoom2D() {
    const stage = this._stage;
    if (!stage) return;
    let isPanning = false, lastPos = { x: 0, y: 0 }, lastDist = 0;

    stage.on('mousedown', e => {
      if (e.target !== stage) return;
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
    stage.on('mouseup mouseleave', () => { isPanning = false; });

    stage.on('wheel', e => {
      e.evt.preventDefault();
      const oldScale = stage.scaleX();
      const pointer  = stage.getPointerPosition();
      const mapTo    = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
      const nova     = Math.min(Math.max(oldScale * (e.evt.deltaY < 0 ? 1.1 : 0.9), 0.15), 6);
      stage.scale({ x: nova, y: nova });
      stage.position({ x: pointer.x - mapTo.x * nova, y: pointer.y - mapTo.y * nova });
    });

    stage.on('touchmove', e => {
      e.evt.preventDefault();
      const t = e.evt.touches;
      if (t.length === 1) {
        const rect = stage.container().getBoundingClientRect();
        const pos  = { x: t[0].clientX - rect.left, y: t[0].clientY - rect.top };
        if (isPanning) { stage.x(stage.x() + pos.x - lastPos.x); stage.y(stage.y() + pos.y - lastPos.y); }
        lastPos = pos; isPanning = true;
      } else if (t.length === 2) {
        isPanning = false;
        const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastDist) {
          const nova = Math.min(Math.max(stage.scaleX() * (dist / lastDist), 0.15), 6);
          stage.scale({ x: nova, y: nova });
        }
        lastDist = dist;
      }
    });
    stage.on('touchend', () => { isPanning = false; lastDist = 0; });
  }

  reset2D() {
    if (!this._stage) return;
    this._stage.x(0); this._stage.y(0); this._stage.scale({ x: 1, y: 1 });
  }

  centralizar2D(mapW, mapH, gridSize) {
    if (!this._stage) return;
    const sw = this._stage.width(), sh = this._stage.height();
    const mw = mapW * gridSize, mh = mapH * gridSize;
    const esc = Math.min(sw / mw, sh / mh) * 0.9;
    this._stage.scale({ x: esc, y: esc });
    this._stage.position({ x: (sw - mw * esc) / 2, y: (sh - mh * esc) / 2 });
  }

  focar2D(posX, posY, gridSize) {
    if (!this._stage) return;
    const esc = 2;
    const wx = posX * gridSize, wy = posY * gridSize;
    this._stage.scale({ x: esc, y: esc });
    this._stage.position({ x: this._stage.width() / 2 - wx * esc, y: this._stage.height() / 2 - wy * esc });
  }

  setPanEnabled2D(enabled) {
    // Habilita/desabilita pan via drag no stage (para modo régua)
    if (!this._stage) return;
    this._stage.draggable(false); // stage nunca é draggable diretamente
    this._panEnabled2D = enabled;
  }
}

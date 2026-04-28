// Orquestrador principal do Tabletop VTT v2
import { initFirebase, listenTokens, listenMapas, listenConfig, listenFog,
         listenItens, listenBiblioteca, listenPings,
         saveConfig, sendPing, patchMapaItem } from './modules/firebase-sync.js';
import { SceneManager } from './modules/scene-manager.js';
import { TokenManager }  from './modules/tokens.js';
import { Renderer3D }    from './modules/renderer3d.js';
import { Renderer2D }    from './modules/renderer2d.js';
import { CameraController } from './modules/camera.js';
import { FogOfWar }      from './modules/fogofwar.js';
import { Toolbar }       from './modules/toolbar.js';
import { PingSystem }    from './modules/ping.js';
import { Ruler }         from './modules/ruler.js';
import { MapPanel }      from './modules/map-panel.js';
import { TokenPanel }    from './modules/token-panel.js';
import { ItemsPanel }    from './modules/items.js';
import { Library }       from './modules/library.js';

// ── Auth ──────────────────────────────────────────────────────────────────────

const auth = window.EDAuth?.currentUser?.();
if (!auth) { window.location.href = 'index.html'; throw new Error('Não autenticado'); }

const userId   = auth.id;
const userName = auth.name || 'Jogador';
const isGM     = auth.role === 'admin';
const params   = new URLSearchParams(location.search);
const campanhaId = params.get('campanha') || 'default';
const corPing    = isGM ? '#ff4466' : '#44aaff';

// ── Estado global ─────────────────────────────────────────────────────────────

let modo3D        = true;
let snapGrid      = true;
let ferramenta    = 'selecionar';
let mapas         = {};     // { [id]: dadosMapa }
let sceneConfig   = { gridCols: 20, gridRows: 15, gridVisible: true };

// ── Elementos DOM ──────────────────────────────────────────────────────────────

const $  = id => document.getElementById(id);
const containerViewport = $('viewport');
const container3D  = $('canvas3d');
const container2D  = $('canvas2d');
const pingOverlay  = $('pingOverlay');
const fogCanvas    = $('fogCanvas');
const toolbarEl    = $('toolbar');
const progressBar  = $('progressBar');
const progressFill = $('progressFill');

// Painéis laterais
const painelMapa   = $('painelMapa');
const painelToken  = $('painelToken');
const painelItens  = $('painelItens');
const painelLib    = $('painelBiblioteca');
const painelCenas  = $('painelCenas');

// ── Inicialização Firebase ────────────────────────────────────────────────────

initFirebase();

// ── Módulos ───────────────────────────────────────────────────────────────────

const tokens    = new TokenManager(campanhaId, isGM, userId);
const r3d       = new Renderer3D(container3D);
const r2d       = new Renderer2D(container2D);
const camera    = new CameraController();
const fog       = new FogOfWar(campanhaId, isGM, sceneConfig.gridCols, sceneConfig.gridRows);
const ruler     = new Ruler();
const pings     = new PingSystem(pingOverlay);
const mapPanel    = new MapPanel(painelMapa,   campanhaId, isGM);
const tokenPanel  = new TokenPanel(painelToken, campanhaId, isGM, userId);
const itemsPanel  = new ItemsPanel(painelItens, campanhaId, isGM);
const library     = new Library(painelLib, campanhaId);
const sceneMgr    = new SceneManager(painelCenas, campanhaId, isGM);

// ── Progresso de upload ───────────────────────────────────────────────────────

function mostrarProgress(pct) {
  progressBar.classList.remove('oculto');
  progressFill.style.width = Math.round(pct) + '%';
  if (pct >= 100) setTimeout(() => progressBar.classList.add('oculto'), 800);
}
[mapPanel, tokenPanel, itemsPanel, library].forEach(m => {
  m.onUploadProgress = mostrarProgress;
});

// ── Inicialização dos renderers ───────────────────────────────────────────────

r3d.init();
camera.init3D(r3d.getCamera(), r3d.getRenderer(), r3d.getControls());

r2d.init();
camera.init2D(r2d.getStage());

// Fog canvas
fog.inicializar(fogCanvas);

container2D.style.display = 'none';

// ── Toolbar ───────────────────────────────────────────────────────────────────

const toolbar = new Toolbar(toolbarEl, isGM, {
  onTool:     t => setFerramenta(t),
  onToggleSnap: v => { snapGrid = v; r3d._snapGrid = v; r2d._snapGrid = v; },
  onToggle3D:   v => setModo(v ? '3d' : '2d'),
  onReset:      () => modo3D ? camera.reset3D() : camera.reset2D(),
  onCenter:     () => modo3D
    ? camera.centralizar3D(sceneConfig.gridCols, sceneConfig.gridRows, r3d.gridSize)
    : camera.centralizar2D(sceneConfig.gridCols, sceneConfig.gridRows, r2d.gridSize),
  onOpenMapa:       v => { painelMapa.classList.toggle('oculto', !v); if(v) painelToken.classList.add('oculto'), painelItens.classList.add('oculto'), painelCenas.classList.add('oculto'); },
  onOpenToken:      v => { painelToken.classList.toggle('oculto', !v); if(v) painelMapa.classList.add('oculto'), painelItens.classList.add('oculto'), painelCenas.classList.add('oculto'); },
  onOpenItens:      v => { painelItens.classList.toggle('oculto', !v); if(v) painelMapa.classList.add('oculto'), painelToken.classList.add('oculto'), painelCenas.classList.add('oculto'); },
  onOpenBiblioteca: v => { painelLib.classList.toggle('oculto', !v); },
  onOpenCenas:      v => { painelCenas.classList.toggle('oculto', !v); if(v) painelMapa.classList.add('oculto'), painelToken.classList.add('oculto'), painelItens.classList.add('oculto'); },
  onOpenCeu:        v => { $('painelCeu').classList.toggle('oculto', !v); },
});

// ── Régua ─────────────────────────────────────────────────────────────────────

ruler.onDraw  = ({ inicio, fim, metros }) => {
  r3d.setRuler(inicio, fim, metros);
  r2d.setRuler(inicio, fim, metros);
};
ruler.onClear = () => { r3d.clearRuler(); r2d.clearRuler(); };

// ── Callbacks dos renderers ───────────────────────────────────────────────────

r3d.onTokenClick    = id => tokenPanel.selecionado !== id ? tokenPanel.setTokens(tokens.tokens) : null;
r3d.onTokenDblClick = id => {
  const t = tokens.getById(id);
  if (t) camera.focar3D(t.posX, t.posY, r3d.gridSize);
};
r3d.onTokenMoved  = (id, x, y) => tokens.moveToken(id, x, y);
r3d.onMapClick    = (wx, wz, sx, sy) => {
  if (ferramenta === 'selecionar') dispararPing(sx, sy);
};
r3d.onRulerDown   = (cx, cy) => ruler.iniciar(cx, cy);
r3d.onRulerMove   = (cx, cy) => ruler.atualizar(cx, cy);
r3d.onRulerUp     = (cx, cy) => ruler.finalizar(cx, cy);
r3d.onRulerClick  = ()       => ruler.clique();

r2d.onTokenClick    = id => {};
r2d.onTokenDblClick = id => {
  const t = tokens.getById(id);
  if (t) camera.focar2D(t.posX, t.posY, r2d.gridSize);
};
r2d.onTokenMoved    = (id, x, y) => tokens.moveToken(id, x, y);
r2d.onMapClick      = (wx, wy, sx, sy) => {
  if (ferramenta === 'selecionar') dispararPing(sx, sy);
};
r2d.onVariacaoSelect = (id, idx) => tokens.setVariacao(id, idx);
r2d.onRulerDown  = (cx, cy) => ruler.iniciar(cx, cy);
r2d.onRulerMove  = (cx, cy) => ruler.atualizar(cx, cy);
r2d.onRulerUp    = (cx, cy) => ruler.finalizar(cx, cy);
r2d.onRulerClick = ()       => ruler.clique();

// Items nos renderers
r3d.onItemMoved = (id, x, y) => itemsPanel.moveItem(id, x, y);
r2d.onItemMoved = (id, x, y) => itemsPanel.moveItem(id, x, y);

// ── MapPanel callbacks ────────────────────────────────────────────────────────

mapPanel.onMapaDelete = id => { r3d.removeMapaItem(id); r2d.removeMapaItem(id); };
mapPanel.onMapaEscala = (id, ex, ey) => {
  r3d.upsertMapaItem({ ...mapas[id], id, escalaX: ex, escalaY: ey });
  r2d.upsertMapaItem({ ...mapas[id], id, escalaX: ex, escalaY: ey });
};
mapPanel.onFerrAtiva = nome => {
  // Ativa/desativa drag de mapas nos renderers
  r3d.setMapaDragMode(nome === 'mover');
  r2d.setMapaDragMode(nome === 'mover');
};

// Mapas: sync posição quando renderer mover
r3d.onMapaMoved = (id, posX, posY) => patchMapaItem(campanhaId, id, { posX, posY });
r2d.onMapaMoved = (id, posX, posY) => patchMapaItem(campanhaId, id, { posX, posY });

// ── TokenPanel callbacks ──────────────────────────────────────────────────────

tokenPanel.onSelecionarToken = id => {
  const t = tokens.getById(id);
  if (!t) return;
  modo3D ? camera.focar3D(t.posX, t.posY, r3d.gridSize) : camera.focar2D(t.posX, t.posY, r2d.gridSize);
};

// ── Library: usar asset ───────────────────────────────────────────────────────

library.onUsarAsset = (cat, asset) => {
  if (cat === 'mapas') {
    // Adiciona o mapa à cena
    mapPanel._onUploadDireto?.(asset.url, asset.nome);
  } else if (cat === 'tokens') {
    // Abre painel de token com essa URL como textura da variação 0
    painelToken.classList.remove('oculto');
    tokenPanel.criarComTextura?.(asset.url);
  }
};

// ── Firebase listeners ────────────────────────────────────────────────────────

listenTokens(campanhaId, obj => {
  tokens.setTokens(obj);
  tokenPanel.setTokens(obj);
  renderAllTokens();
});

listenMapas(campanhaId, obj => {
  mapas = obj || {};
  mapPanel.setMapas(mapas);
  renderAllMapas();
});

listenConfig(campanhaId, cfg => {
  sceneConfig = { ...sceneConfig, ...cfg };
  fog.cols = sceneConfig.gridCols;
  fog.rows = sceneConfig.gridRows;
  r3d.setGridVisible(sceneConfig.gridVisible !== false);
  r2d.setGridVisible(sceneConfig.gridVisible !== false);
  if (cfg.corCeu) {
    r3d.setSkyColor(cfg.corCeu);
    const inp = $('ceuInput');
    if (inp) inp.value = cfg.corCeu;
  }
});

listenFog(campanhaId, data => {
  fog.setFog(data);
  r2d.setFogCanvas(fogCanvas);
});

listenItens(campanhaId, obj => {
  itemsPanel.setItens(obj);
  renderAllItens(obj);
});

listenBiblioteca(campanhaId, dados => {
  library.setDados(dados);
});

listenPings(campanhaId, ping => {
  pings.renderPing(ping.screenX, ping.screenY, ping.cor, ping.nome);
});

// ── Renderização ──────────────────────────────────────────────────────────────

function renderAllTokens() {
  const lista = tokens.getAll();
  const ids   = new Set(lista.map(t => t.id));
  Object.keys(r3d._tokenMeshes).forEach(id => { if (!ids.has(id)) r3d.removeToken(id); });
  Object.keys(r2d._tokenNodes).forEach(id => { if (!ids.has(id)) r2d.removeToken(id); });
  lista.forEach(t => { r3d.upsertToken(t); r2d.upsertToken(t); });
}

function renderAllMapas() {
  const lista = Object.entries(mapas);
  const ids   = new Set(lista.map(([id]) => id));
  // Limpa mapas removidos
  Object.keys(r3d._mapaPlanes  || {}).forEach(id => { if (!ids.has(id)) r3d.removeMapaItem(id); });
  Object.keys(r2d._mapaImages  || {}).forEach(id => { if (!ids.has(id)) r2d.removeMapaItem(id); });
  lista.forEach(([id, m]) => {
    r3d.upsertMapaItem({ id, ...m });
    r2d.upsertMapaItem({ id, ...m });
  });
}

function renderAllItens(obj) {
  const lista = Object.entries(obj || {});
  const ids   = new Set(lista.map(([id]) => id));
  Object.keys(r3d._itemMeshes || {}).forEach(id => { if (!ids.has(id)) r3d.removeItem(id); });
  Object.keys(r2d._itemNodes  || {}).forEach(id => { if (!ids.has(id)) r2d.removeItem(id); });
  lista.forEach(([id, item]) => {
    r3d.upsertItem({ id, ...item });
    r2d.upsertItem({ id, ...item });
  });
}

// ── Modo 3D/2D ────────────────────────────────────────────────────────────────

function setModo(novoModo) {
  modo3D = novoModo === '3d';
  container3D.style.display = modo3D ? 'block' : 'none';
  container2D.style.display = modo3D ? 'none'  : 'block';
  camera.setModo(novoModo);
  toolbar.setModo3D(modo3D);
}

// ── Ferramenta ────────────────────────────────────────────────────────────────

function setFerramenta(nome) {
  ferramenta = nome;
  ruler.ativo = false;
  ruler.onClear?.();

  const emRegua = nome === 'regua';
  ruler.ativo = emRegua;
  // Desabilita orbit/pan enquanto régua está ativa
  camera.setOrbitEnabled(!emRegua);
  r3d.setRulerMode(emRegua);
  r2d.setRulerMode(emRegua);

  if (nome === 'fog') {
    $('painelFog').classList.remove('oculto');
  } else {
    $('painelFog').classList.add('oculto');
  }
}

// ── Teclas de variação (desktop) ──────────────────────────────────────────────

window.addEventListener('keydown', e => {
  if (document.activeElement?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) return;
  const n = parseInt(e.key);
  if (n >= 1 && n <= 9 && tokenPanel.selecionado) {
    tokens.setVariacao(tokenPanel.selecionado, n - 1);
  }
});

// ── Alt+dblclick e long-press para ping ───────────────────────────────────────

function dispararPing(sx, sy) {
  sendPing(campanhaId, { screenX: sx, screenY: sy, cor: corPing, nome: userName });
  pings.renderPing(sx, sy, corPing, userName);
}

// ── Fog ───────────────────────────────────────────────────────────────────────

$('btnRevelarTudo')?.addEventListener('click',  () => fog.revelarTudo());
$('btnEsconderTudo')?.addEventListener('click', () => fog.esconderTudo());
$('sliderPincel')?.addEventListener('input',    e  => { fog.pincelTamanho = parseInt(e.target.value); });

document.querySelectorAll('[data-pincel]').forEach(btn => {
  btn.addEventListener('click', () => {
    fog.pincelTipo = btn.dataset.pincel;
    document.querySelectorAll('[data-pincel]').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
  });
});

let fogPintando = false;
fogCanvas.addEventListener('mousedown', e => { fogPintando = true; aplicarFog(e); });
fogCanvas.addEventListener('mousemove', e => { if (fogPintando) aplicarFog(e); });
fogCanvas.addEventListener('mouseup',   () => { fogPintando = false; });

function aplicarFog(e) {
  if (ferramenta !== 'fog') return;
  const rect = fogCanvas.getBoundingClientRect();
  const { col, linha } = fog.pixelParaCelula(e.clientX - rect.left, e.clientY - rect.top);
  $('chkBorracha')?.checked ? fog.revelar(col, linha) : fog.pintar(col, linha);
  r2d.setFogCanvas(fogCanvas);
}

// ── Cor do Céu ────────────────────────────────────────────────────────────────

document.querySelectorAll('#ceuPresets [data-cor]').forEach(btn => {
  btn.addEventListener('click', () => {
    const cor = btn.dataset.cor;
    r3d.setSkyColor(cor);
    saveConfig(campanhaId, { corCeu: cor });
    const inp = $('ceuInput');
    if (inp) inp.value = cor;
  });
});

$('ceuInput')?.addEventListener('input', e => {
  r3d.setSkyColor(e.target.value);
});
$('ceuInput')?.addEventListener('change', e => {
  saveConfig(campanhaId, { corCeu: e.target.value });
});

// ── Centralizar ao carregar ───────────────────────────────────────────────────

window.addEventListener('load', () => {
  setTimeout(() => camera.centralizar3D(sceneConfig.gridCols, sceneConfig.gridRows, r3d.gridSize), 600);
});

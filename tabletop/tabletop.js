// Orquestrador principal do módulo Tabletop
import { initFirebase, listenTokens, listenMapConfig, listenFog, listenInitiative, listenPings, saveMapConfig, sendPing, uploadFile } from './modules/firebase-sync.js';
import { TokenManager }   from './modules/tokens.js';
import { Renderer3D }     from './modules/renderer3d.js';
import { Renderer2D }     from './modules/renderer2d.js';
import { CameraController } from './modules/camera.js';
import { FogOfWar }       from './modules/fogofwar.js';
import { Initiative }     from './modules/initiative.js';
import { Toolbar }        from './modules/toolbar.js';
import { PingSystem }     from './modules/ping.js';

// ── Autenticação ──────────────────────────────────────────────────────────────

const auth = window.EDAuth ? window.EDAuth.getUser() : null;
if (!auth) {
  window.location.href = '../index.html';
  throw new Error('Não autenticado');
}

const userId     = auth.id;
const userName   = auth.name || 'Jogador';
const isGM       = auth.role === 'admin';

// campanhaId vem da URL: ?campanha=XYZ
const params     = new URLSearchParams(location.search);
const campanhaId = params.get('campanha') || 'default';

// ── Estado global ──────────────────────────────────────────────────────────────

let modo3D         = true;
let snapGrid       = true;
let ferramentaAtiva = 'selecionar';
let tokenSelecionado = null;
let mapConfig      = { gridCols: 20, gridRows: 15, gridVisible: true, mapImageUrl: '' };
const corPing      = isGM ? '#ff4466' : '#44aaff';

// ── Elementos DOM ──────────────────────────────────────────────────────────────

const containerViewport = document.getElementById('viewport');
const container3D       = document.getElementById('canvas3d');
const container2D       = document.getElementById('canvas2d');
const pingOverlay       = document.getElementById('pingOverlay');
const painelProps       = document.getElementById('painelPropriedades');
const painelIniciativa  = document.getElementById('painelIniciativa');
const toolbarEl         = document.getElementById('toolbar');
const painelFog         = document.getElementById('painelFog');
const fogCanvas         = document.getElementById('fogCanvas');
const progressBarEl     = document.getElementById('progressBar');
const progressFill      = document.getElementById('progressFill');

// ── Instâncias dos módulos ────────────────────────────────────────────────────

initFirebase();

const tokens    = new TokenManager(campanhaId, isGM, userId);
const r3d       = new Renderer3D(container3D);
const r2d       = new Renderer2D(container2D);
const camera    = new CameraController();
const fog       = new FogOfWar(campanhaId, isGM, mapConfig.gridCols, mapConfig.gridRows);
const initiative = new Initiative(campanhaId, isGM, painelIniciativa);
const pings     = new PingSystem(pingOverlay);

// ── Toolbar ───────────────────────────────────────────────────────────────────

const toolbar = new Toolbar(toolbarEl, isGM, {
  onTool:            t    => setFerramenta(t),
  onToggleSnap:      val  => { snapGrid = val; r3d._snapGrid = val; r2d._snapGrid = val; },
  onToggle3D:        val  => setModo(val ? '3d' : '2d'),
  onReset:           ()   => modo3D ? camera.reset3D() : camera.reset2D(container2D),
  onCenter:          ()   => modo3D
    ? camera.centralizar3D(mapConfig.gridCols, mapConfig.gridRows, r3d.gridSize)
    : camera.centralizar2D(mapConfig.gridCols, mapConfig.gridRows, r2d.gridSize),
  onToggleInitiativa: ()  => painelIniciativa.classList.toggle('oculto'),
  onUploadMapa:      ()   => triggerUploadMapa(),
  onAddToken:        ()   => tokens.addToken(),
});

// ── Inicialização dos renderers ───────────────────────────────────────────────

r3d.init();
camera.init3D(r3d.getCamera(), r3d.getRenderer(), r3d.getControls());

r2d.init();
camera.init2D(r2d.getStage());

// Callbacks de token 3D
r3d.onTokenClick    = id => selecionarToken(id);
r3d.onTokenDblClick = id => { if (modo3D) camera.focar3D(tokens.getById(id)?.posX || 0, tokens.getById(id)?.posY || 0, r3d.gridSize); };
r3d.onTokenMoved    = (id, x, y) => tokens.moveToken(id, x, y);
r3d.onMapClick      = (wx, wz, sx, sy) => dispararPing(sx, sy);

// Callbacks de token 2D
r2d.onTokenClick    = id => selecionarToken(id);
r2d.onTokenDblClick = id => { if (!modo3D) camera.focar2D(tokens.getById(id)?.posX || 0, tokens.getById(id)?.posY || 0, r2d.gridSize); };
r2d.onTokenMoved    = (id, x, y) => tokens.moveToken(id, x, y);
r2d.onMapClick      = (wx, wy, sx, sy) => dispararPing(sx, sy);
r2d.onVariacaoSelect = (id, idx) => tokens.setVariacao(id, idx);

// Fog canvas
fog.inicializar(fogCanvas);

// ── Modo 3D/2D ────────────────────────────────────────────────────────────────

function setModo(novoModo) {
  modo3D = novoModo === '3d';
  container3D.style.display = modo3D ? 'block' : 'none';
  container2D.style.display = modo3D ? 'none'  : 'block';
  camera.setModo(novoModo);
  toolbar.setModo3D(modo3D);

  if (!modo3D) {
    // Sincroniza posições no renderer 2D
    tokens.getAll().forEach(t => r2d.upsertToken(t));
    r2d.setMapa(mapConfig.mapImageUrl, mapConfig.gridCols, mapConfig.gridRows);
  } else {
    tokens.getAll().forEach(t => r3d.upsertToken(t));
  }
}

// Inicializa modo 3D visível
container2D.style.display = 'none';

// ── Firebase listeners ────────────────────────────────────────────────────────

// Tokens
listenTokens(campanhaId, obj => {
  tokens.setTokens(obj);
  renderAllTokens();
});

// Mapa
listenMapConfig(campanhaId, cfg => {
  mapConfig = { ...mapConfig, ...cfg };
  fog.cols = mapConfig.gridCols;
  fog.rows = mapConfig.gridRows;
  r3d.setMapa(mapConfig.mapImageUrl, mapConfig.gridCols, mapConfig.gridRows);
  r3d.setGridVisible(mapConfig.gridVisible !== false);
  r2d.setMapa(mapConfig.mapImageUrl, mapConfig.gridCols, mapConfig.gridRows);
  r2d.setGridVisible(mapConfig.gridVisible !== false);
});

// Fog
listenFog(campanhaId, data => {
  fog.setFog(data);
  r2d.setFogCanvas(fogCanvas);
});

// Iniciativa
listenInitiative(campanhaId, arr => {
  initiative.setLista(arr);
  const ativo = arr.find(e => e.ativo);
  atualizarIndicadorAtivo(ativo?.nome || null);
});

// Pings
listenPings(campanhaId, ping => {
  pings.renderPing(ping.screenX, ping.screenY, ping.cor, ping.nome);
});

// ── Renderização de tokens ─────────────────────────────────────────────────────

function renderAllTokens() {
  const lista = tokens.getAll();
  // Remove tokens que não existem mais
  const idsAtuais = new Set(lista.map(t => t.id));
  // Limpa removidos
  [...Object.keys(r3d._tokenMeshes), ...Object.keys(r2d._tokenNodes)].forEach(id => {
    if (!idsAtuais.has(id)) { r3d.removeToken(id); r2d.removeToken(id); }
  });
  lista.forEach(t => {
    r3d.upsertToken(t);
    r2d.upsertToken(t);
  });
}

// ── Seleção de token e painel de propriedades ─────────────────────────────────

function selecionarToken(id) {
  tokenSelecionado = id;
  renderPainelPropriedades(id);
  painelProps.classList.remove('oculto');
}

function renderPainelPropriedades(id) {
  const t = tokens.getById(id);
  if (!t) { painelProps.innerHTML = ''; return; }
  const podeEditar = isGM || t.fichaId === userId;

  painelProps.innerHTML = `
    <div class="props-header">
      <span class="props-titulo">Propriedades do Token</span>
      <button class="props-fechar" id="btnFecharProps">✕</button>
    </div>

    <section class="props-section">
      <label class="props-label">POSIÇÃO E ESCALA</label>
      <p class="props-hint">Edite o token selecionado diretamente na mesa.</p>
      <label class="props-label">Tamanho</label>
      <input type="range" class="props-slider" id="sliderEscala" min="0.5" max="5" step="0.1"
        value="${t.escala || 1}" ${!podeEditar ? 'disabled' : ''} />
      <span class="props-valor" id="valorEscala">${(t.escala || 1).toFixed(2)}</span>
    </section>

    <section class="props-section">
      <div class="props-section-header">
        <label class="props-label">VISUAL</label>
        <span class="props-badge">2.5D</span>
      </div>
      <label class="props-label">Tipo</label>
      <div class="props-select-mock">Token 2.5D (standee)</div>

      <div class="variacoes-lista" id="variacoesLista">
        ${(t.variacoes || []).map((v, i) => `
          <div class="variacao-item ${i === (t.variacaoAtiva || 0) ? 'variacao-ativa' : ''}" data-idx="${i}">
            <div class="variacao-thumbs">
              <div class="variacao-thumb-wrap">
                <span class="variacao-thumb-label">FRENTE</span>
                <img class="variacao-thumb" src="${v.img3d_frente || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'70\\'><rect width=\\'50\\' height=\\'70\\' fill=\\'%23330a10\\'/></svg>'" />
                <span class="variacao-nome">${v.nome || 'Variação ' + (i + 1)}</span>
              </div>
              <div class="variacao-thumb-wrap">
                <span class="variacao-thumb-label">VERSO</span>
                <img class="variacao-thumb" src="${v.img3d_verso || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'70\\'><rect width=\\'50\\' height=\\'70\\' fill=\\'%23330a10\\'/></svg>'" />
              </div>
            </div>
            ${podeEditar ? `
              <input class="variacao-nome-input" data-idx="${i}" placeholder="Nome" value="${v.nome || ''}" />
              <button class="variacao-del" data-idx="${i}">🗑</button>
            ` : ''}
          </div>
        `).join('')}
      </div>

      ${podeEditar ? `<button class="btn-nova-variacao" id="btnNovaVariacao">+ Nova variação</button>` : ''}
    </section>

    <section class="props-section">
      <label class="props-label">CONTROLE DE JOGADOR</label>
      <p class="props-hint">Vincule o token a uma ficha da campanha para liberar movimento ao jogador dono.</p>
      <label class="props-label">Ficha controladora</label>
      <input class="props-input" id="inputFichaId" placeholder="ID da ficha ou userId" value="${t.fichaId || ''}" ${!isGM ? 'disabled' : ''} />
    </section>

    ${isGM ? `
      <section class="props-section props-section-actions">
        <label class="props-label">
          <input type="checkbox" id="chkBloqueado" ${t.bloqueado ? 'checked' : ''} />
          Bloquear token
        </label>
        <button class="btn-danger" id="btnDeletarToken">Deletar token</button>
      </section>
    ` : ''}
  `;

  // Slider escala
  document.getElementById('sliderEscala')?.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    document.getElementById('valorEscala').textContent = val.toFixed(2);
    tokens.setEscala(id, val);
    r3d.upsertToken({ ...t, escala: val });
    r2d.upsertToken({ ...t, escala: val });
  });

  // Fechar painel
  document.getElementById('btnFecharProps')?.addEventListener('click', () => {
    painelProps.classList.add('oculto');
    tokenSelecionado = null;
  });

  // Nova variação
  document.getElementById('btnNovaVariacao')?.addEventListener('click', () => abrirModalVariacao(id));

  // Deletar variações
  painelProps.querySelectorAll('.variacao-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const td = tokens.getById(id);
      if (!td) return;
      td.variacoes.splice(idx, 1);
      if (td.variacaoAtiva >= td.variacoes.length) td.variacaoAtiva = 0;
      tokens.saveTokenCompleto(id, { ...td });
    });
  });

  // Editar nome de variação
  painelProps.querySelectorAll('.variacao-nome-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const idx = parseInt(inp.dataset.idx);
      const td = tokens.getById(id);
      if (!td || !td.variacoes[idx]) return;
      td.variacoes[idx].nome = inp.value;
      tokens.saveTokenCompleto(id, { ...td });
    });
  });

  // Ficha id
  document.getElementById('inputFichaId')?.addEventListener('change', e => {
    tokens.saveTokenCompleto(id, { ...t, fichaId: e.target.value });
  });

  // Bloqueado
  document.getElementById('chkBloqueado')?.addEventListener('change', e => {
    tokens.setBloqueado(id, e.target.checked);
  });

  // Deletar token
  document.getElementById('btnDeletarToken')?.addEventListener('click', () => {
    if (confirm('Remover este token?')) {
      tokens.removeToken(id);
      painelProps.classList.add('oculto');
    }
  });
}

// ── Modal de nova variação ────────────────────────────────────────────────────

function abrirModalVariacao(tokenId) {
  const modal = document.getElementById('modalVariacao');
  modal.classList.remove('oculto');
  modal.dataset.tokenId = tokenId;
  document.getElementById('varNome').value = '';
  document.getElementById('varFrente').value = '';
  document.getElementById('varVerso').value = '';
  document.getElementById('varImg2d').value = '';
}

async function salvarNovaVariacao() {
  const modal   = document.getElementById('modalVariacao');
  const tokenId = modal.dataset.tokenId;
  const t       = tokens.getById(tokenId);
  if (!t) return;

  const nome       = document.getElementById('varNome').value || 'Nova variação';
  const frenteFile = document.getElementById('varFrente').files[0];
  const versoFile  = document.getElementById('varVerso').files[0];
  const img2dFile  = document.getElementById('varImg2d').files[0];
  const varIdx     = (t.variacoes || []).length;

  mostrarProgress(0);

  const uploads = [];
  const nova = { nome, img3d_frente: '', img3d_verso: '', img2d: '' };

  if (frenteFile) uploads.push(
    tokens.uploadImagemVariacao(tokenId, varIdx, 'frente', frenteFile, p => mostrarProgress(p * 0.33))
      .then(url => { nova.img3d_frente = url; })
  );
  if (versoFile) uploads.push(
    tokens.uploadImagemVariacao(tokenId, varIdx, 'verso', versoFile, p => mostrarProgress(33 + p * 0.33))
      .then(url => { nova.img3d_verso = url; })
  );
  if (img2dFile) uploads.push(
    tokens.uploadImagemVariacao(tokenId, varIdx, '2d', img2dFile, p => mostrarProgress(66 + p * 0.33))
      .then(url => { nova.img2d = url; })
  );

  await Promise.all(uploads);
  mostrarProgress(100);

  const variacoes = [...(t.variacoes || []), nova];
  await tokens.saveTokenCompleto(tokenId, { ...t, variacoes });

  modal.classList.add('oculto');
  ocultarProgress();
  renderPainelPropriedades(tokenId);
}

// ── Upload de mapa ────────────────────────────────────────────────────────────

function triggerUploadMapa() {
  document.getElementById('inputUploadMapa').click();
}

async function onMapaFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  mostrarProgress(0);
  const url = await tokens.uploadMapa(file, p => mostrarProgress(p));
  await saveMapConfig(campanhaId, { mapImageUrl: url });
  mostrarProgress(100);
  setTimeout(ocultarProgress, 800);
}

// ── Ping ──────────────────────────────────────────────────────────────────────

function dispararPing(screenX, screenY) {
  sendPing(campanhaId, { screenX, screenY, cor: corPing, nome: userName });
  pings.renderPing(screenX, screenY, corPing, userName);
}

// ── Teclas para variações (desktop) ──────────────────────────────────────────

window.addEventListener('keydown', e => {
  if (!tokenSelecionado) return;
  const n = parseInt(e.key);
  if (n >= 1 && n <= 9) {
    tokens.setVariacao(tokenSelecionado, n - 1);
    renderPainelPropriedades(tokenSelecionado);
  }
});

// ── Indicador de iniciativa ativa ─────────────────────────────────────────────

function atualizarIndicadorAtivo(nomeAtivo) {
  tokens.getAll().forEach(t => {
    const eAtivo = nomeAtivo && t.nome === nomeAtivo;
    r3d.setActiveIndicator(t.id, eAtivo);
    r2d.setActiveIndicator(t.id, eAtivo);
  });
}

// ── Ferramenta ativa ──────────────────────────────────────────────────────────

function setFerramenta(nome) {
  ferramentaAtiva = nome;

  // Fog panel
  if (nome === 'fog' && isGM) {
    painelFog.classList.remove('oculto');
  } else {
    painelFog.classList.add('oculto');
  }

  // Drag de token — só na ferramenta selecionar
  r2d.layers?.tokens?.getChildren().forEach(node => {
    if (nome === 'selecionar') {
      node.draggable(!tokens.getById(node.getAttr('tokenId'))?.bloqueado);
    } else {
      node.draggable(false);
    }
  });

  // Pan tool — desabilita controls3D click esquerdo
  if (r3d.controls) r3d.controls.enableRotate = (nome !== 'pan');
}

// ── Fog controls ──────────────────────────────────────────────────────────────

document.getElementById('btnRevelarTudo')?.addEventListener('click', () => fog.revelarTudo());
document.getElementById('btnEsconderTudo')?.addEventListener('click', () => fog.esconderTudo());

const sliderPincel = document.getElementById('sliderPincel');
sliderPincel?.addEventListener('input', e => { fog.pincelTamanho = parseInt(e.target.value); });

document.querySelectorAll('[data-pincel]').forEach(btn => {
  btn.addEventListener('click', () => {
    fog.pincelTipo = btn.dataset.pincel;
    document.querySelectorAll('[data-pincel]').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
  });
});

// Fog: clique/arrastar no canvas de fog
let fogPintando = false;
fogCanvas.addEventListener('mousedown', e => { fogPintando = true; aplicarFog(e); });
fogCanvas.addEventListener('mousemove', e => { if (fogPintando) aplicarFog(e); });
fogCanvas.addEventListener('mouseup', () => { fogPintando = false; });
fogCanvas.addEventListener('touchstart', e => { fogPintando = true; aplicarFog(e.touches[0]); }, { passive: true });
fogCanvas.addEventListener('touchmove', e => { if (fogPintando) aplicarFog(e.touches[0]); }, { passive: true });
fogCanvas.addEventListener('touchend', () => { fogPintando = false; });

function aplicarFog(e) {
  if (ferramentaAtiva !== 'fog') return;
  const rect = fogCanvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const { col, linha } = fog.pixelParaCelula(px, py);
  const eraser = document.getElementById('chkBorracha')?.checked;
  if (eraser) fog.revelar(col, linha); else fog.pintar(col, linha);
  r2d.setFogCanvas(fogCanvas);
}

// ── Progresso de upload ───────────────────────────────────────────────────────

function mostrarProgress(pct) {
  progressBarEl.classList.remove('oculto');
  progressFill.style.width = pct + '%';
}
function ocultarProgress() {
  progressBarEl.classList.add('oculto');
  progressFill.style.width = '0%';
}

// ── Eventos de DOM ────────────────────────────────────────────────────────────

document.getElementById('inputUploadMapa')?.addEventListener('change', onMapaFileChange);
document.getElementById('btnSalvarVariacao')?.addEventListener('click', salvarNovaVariacao);
document.getElementById('btnCancelarVariacao')?.addEventListener('click', () => {
  document.getElementById('modalVariacao').classList.add('oculto');
});

// Centraliza mapa no load
window.addEventListener('load', () => {
  setTimeout(() => {
    camera.centralizar3D(mapConfig.gridCols, mapConfig.gridRows, r3d.gridSize);
  }, 500);
});

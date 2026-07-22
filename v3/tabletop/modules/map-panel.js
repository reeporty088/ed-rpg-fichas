// Painel de gerenciamento de mapas na cena
import { pushMapaItem, patchMapaItem, deleteMapaItem } from './firebase-sync.js';
import { comprimirImagem } from './image-compress.js';

export class MapPanel {
  constructor(panelEl, campanhaId, isGM) {
    this.panel      = panelEl;
    this.campanhaId = campanhaId;
    this.isGM       = isGM;
    this.mapas      = {};       // { [id]: dadosMapa }
    this.mapaAtivo  = null;     // id do mapa selecionado
    this.ferrAtiva  = 'mover';  // 'mover'|'ajustar'|'lista'

    // Callbacks para o renderer
    this.onMapaMover   = null;   // (id, posX, posY)
    this.onMapaEscala  = null;   // (id, escalaX, escalaY)
    this.onMapaDelete  = null;   // (id)
    this.onUploadProgress = null; // (pct)

    this.render();
  }

  setMapas(obj) {
    this.mapas = obj || {};
    this._renderLista();
  }

  // ── Render principal ──────────────────────────────────────────────────────

  render() {
    this.panel.innerHTML = `
      <div class="painel-header">
        <span class="painel-titulo">🗺 Mapa</span>
        <button class="painel-fechar" id="mapaPanelFechar">✕</button>
      </div>

      <div class="mapa-ferramentas">
        <button class="mp-btn ativo" data-mp="mover"  title="Mover mapa">🚶 Mover</button>
        <button class="mp-btn"      data-mp="upload"  title="Subir mapa">📤 Upload</button>
        <button class="mp-btn"      data-mp="ajustar" title="Ajustar escala">↔ Ajustar</button>
        <button class="mp-btn"      data-mp="lista"   title="Lista de mapas">📋 Lista</button>
      </div>

      <!-- Ferramenta: ajustar -->
      <div class="mp-section" id="mpAjustar" style="display:none">
        <label class="mp-label">Escala X</label>
        <div class="mp-row">
          <input type="range" id="mpEscalaX" min="0.5" max="5" step="0.1" value="1" class="mp-slider" />
          <input type="number" id="mpEscalaXNum" min="0.5" max="5" step="0.1" value="1" class="mp-num" />
        </div>
        <label class="mp-label">Escala Y</label>
        <div class="mp-row">
          <input type="range" id="mpEscalaY" min="0.5" max="5" step="0.1" value="1" class="mp-slider" />
          <input type="number" id="mpEscalaYNum" min="0.5" max="5" step="0.1" value="1" class="mp-num" />
        </div>
        <button class="mp-btn-salvar" id="mpSalvarEscala">Aplicar</button>
      </div>

      <!-- Ferramenta: lista -->
      <div class="mp-section" id="mpLista" style="display:none">
        <div id="mpListaItens" class="mp-lista"></div>
      </div>

      <!-- Input oculto de upload -->
      <input type="file" id="mpFileInput" accept="image/*" style="display:none" />
    `;

    // Botões de ferramenta
    this.panel.querySelectorAll('[data-mp]').forEach(btn => {
      btn.addEventListener('click', () => this._setFerr(btn.dataset.mp));
    });

    // Upload de mapa
    document.getElementById('mpFileInput')?.addEventListener('change', e => this._onUpload(e));

    // Escala
    const syncSlider = (sliderId, numId) => {
      document.getElementById(sliderId)?.addEventListener('input', e => {
        document.getElementById(numId).value = e.target.value;
      });
      document.getElementById(numId)?.addEventListener('input', e => {
        document.getElementById(sliderId).value = e.target.value;
      });
    };
    syncSlider('mpEscalaX', 'mpEscalaXNum');
    syncSlider('mpEscalaY', 'mpEscalaYNum');

    document.getElementById('mpSalvarEscala')?.addEventListener('click', () => {
      if (!this.mapaAtivo) return;
      const ex = parseFloat(document.getElementById('mpEscalaXNum').value);
      const ey = parseFloat(document.getElementById('mpEscalaYNum').value);
      patchMapaItem(this.campanhaId, this.mapaAtivo, { escalaX: ex, escalaY: ey });
      this.onMapaEscala?.(this.mapaAtivo, ex, ey);
    });

    document.getElementById('mapaPanelFechar')?.addEventListener('click', () => {
      this.panel.classList.add('oculto');
      this.onFerrAtiva?.('none');
    });
  }

  _setFerr(nome) {
    if (nome === 'upload') {
      document.getElementById('mpFileInput')?.click();
      return;
    }
    this.ferrAtiva = nome;
    this.panel.querySelectorAll('[data-mp]').forEach(b => b.classList.toggle('ativo', b.dataset.mp === nome));
    document.getElementById('mpAjustar').style.display = nome === 'ajustar' ? 'block' : 'none';
    document.getElementById('mpLista').style.display   = nome === 'lista'   ? 'block' : 'none';

    if (nome === 'lista') this._renderLista();
    // Notifica tabletop.js qual ferramenta de mapa está ativa
    this.onFerrAtiva?.(nome);
  }

  async _onUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    this.onUploadProgress?.(10);

    const dataUrl = await comprimirImagem(file, 1024, 0.82);
    this.onUploadProgress?.(70);

    const nome = file.name.replace(/\.[^.]+$/, '');
    const ref  = await pushMapaItem(this.campanhaId, { nome, imageUrl: '', posX: 0, posY: 0, escalaX: 1, escalaY: 1, bloqueado: false });
    const id   = ref.key;
    await patchMapaItem(this.campanhaId, id, { imageUrl: dataUrl });
    this.onUploadProgress?.(100);
    e.target.value = '';
  }

  _renderLista() {
    const el = document.getElementById('mpListaItens');
    if (!el) return;
    const itens = Object.entries(this.mapas);
    if (!itens.length) { el.innerHTML = '<p class="mp-vazio">Nenhum mapa na cena.</p>'; return; }

    el.innerHTML = itens.map(([id, m]) => `
      <div class="mp-lista-item ${id === this.mapaAtivo ? 'ativo' : ''}" data-id="${id}">
        <img class="mp-thumb" src="${m.imageUrl || ''}" onerror="this.style.display='none'" />
        <span class="mp-nome">${m.nome || id}</span>
        <div class="mp-acoes">
          <button class="mp-lock" data-id="${id}" title="${m.bloqueado ? 'Desbloquear' : 'Bloquear'}">
            ${m.bloqueado ? '🔒' : '🔓'}
          </button>
          <button class="mp-del" data-id="${id}" title="Remover">🗑</button>
        </div>
      </div>
    `).join('');

    el.querySelectorAll('.mp-lista-item').forEach(div => {
      div.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        this.mapaAtivo = div.dataset.id;
        this._renderLista();
      });
    });

    el.querySelectorAll('.mp-lock').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const atual = this.mapas[id]?.bloqueado;
        patchMapaItem(this.campanhaId, id, { bloqueado: !atual });
      });
    });

    el.querySelectorAll('.mp-del').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Remover este mapa da cena?')) return;
        deleteMapaItem(this.campanhaId, btn.dataset.id);
        this.onMapaDelete?.(btn.dataset.id);
      });
    });
  }

  // Chamado quando escala é alterada externamente (para sincronizar sliders)
  setMapaAtivo(id) {
    this.mapaAtivo = id;
    const m = this.mapas[id];
    if (!m) return;
    const ex = document.getElementById('mpEscalaXNum');
    const ey = document.getElementById('mpEscalaYNum');
    const sx = document.getElementById('mpEscalaX');
    const sy = document.getElementById('mpEscalaY');
    if (ex) ex.value = sx.value = m.escalaX || 1;
    if (ey) ey.value = sy.value = m.escalaY || 1;
  }
}

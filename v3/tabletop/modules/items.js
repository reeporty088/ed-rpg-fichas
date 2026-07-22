// Gerenciador de itens de cenário (móveis, props, decoração)
import { pushItem, saveItem, deleteItem, patchItem } from './firebase-sync.js';
import { comprimirImagem } from './image-compress.js';

const METROS_POR_CELULA = 1.5;

export class ItemsPanel {
  constructor(panelEl, campanhaId, isGM) {
    this.panel      = panelEl;
    this.campanhaId = campanhaId;
    this.isGM       = isGM;
    this.itens      = {};
    this.selecionado = null;
    this._editando  = {};

    this.onUploadProgress = null;
    this.onSelecionarItem = null;

    // Debounce para mover itens
    this._moveDebounces = {};

    this.render();
  }

  setItens(obj) {
    this.itens = obj || {};
    this._renderLista();
    if (this.selecionado && !this.itens[this.selecionado]) {
      this.selecionado = null;
      this._renderProps();
    }
  }

  canEdit(id) { return this.isGM; }  // Apenas GM edita itens

  moveItem(id, posX, posY) {
    if (!this.itens[id]) return;
    this.itens[id].posX = posX;
    this.itens[id].posY = posY;
    clearTimeout(this._moveDebounces[id]);
    this._moveDebounces[id] = setTimeout(() => patchItem(this.campanhaId, id, { posX, posY }), 200);
  }

  // ── Render principal ──────────────────────────────────────────────────────

  render() {
    this.panel.innerHTML = `
      <div class="painel-header">
        <span class="painel-titulo">🪑 Itens</span>
        <button class="painel-fechar" id="itensPanelFechar">✕</button>
      </div>
      ${this.isGM ? `<button class="btn-criar" id="btnCriarItem">➕ Criar novo item</button>` : ''}
      <div class="token-lista" id="itemLista"></div>
      <div class="token-props" id="itemProps"></div>
    `;

    document.getElementById('btnCriarItem')?.addEventListener('click', () => this._criarNovo());
    document.getElementById('itensPanelFechar')?.addEventListener('click', () => {
      this.panel.classList.add('oculto');
    });

    this._renderLista();
  }

  _renderLista() {
    const el = document.getElementById('itemLista');
    if (!el) return;
    const lista = Object.entries(this.itens);
    if (!lista.length) { el.innerHTML = '<p class="mp-vazio">Nenhum item na cena.</p>'; return; }

    el.innerHTML = lista.map(([id, item]) => {
      const imgUrl = item.texturas?.[0]?.url || '';
      return `
        <div class="token-lista-item ${id === this.selecionado ? 'ativo' : ''}" data-id="${id}">
          <img class="token-thumb" src="${imgUrl}" onerror="this.style.background='#0a2010';this.style.border='none'" />
          <span class="token-nome">${item.nome || 'Item'}</span>
          <span class="item-tipo-badge">${item.tipo === '2d_chao' ? '2D' : '2.5D'}</span>
        </div>
      `;
    }).join('');

    el.querySelectorAll('.token-lista-item').forEach(div => {
      div.addEventListener('click', () => {
        this.selecionado = div.dataset.id;
        this._editando = JSON.parse(JSON.stringify(this.itens[this.selecionado]));
        this._renderLista();
        this._renderProps();
        this.onSelecionarItem?.(this.selecionado);
      });
    });
  }

  _renderProps() {
    const el = document.getElementById('itemProps');
    if (!el) return;
    if (!this.selecionado) { el.innerHTML = ''; return; }

    const item = this._editando;
    if (!item) return;
    const altM = item.alturaMetros ?? 1.0;
    const texturas = item.texturas || [];

    el.innerHTML = `
      <div class="props-sep"></div>

      <div class="props-campo">
        <label class="props-label">Nome</label>
        <input class="props-input" id="ipNome" value="${item.nome || ''}" />
      </div>

      <div class="props-campo">
        <label class="props-label">Tipo de renderização</label>
        <div class="tipo-selector">
          <button class="tipo-btn ${item.tipo !== '2d_chao' ? 'ativo' : ''}" data-tipo="2.5d">
            2.5D (standee)
          </button>
          <button class="tipo-btn ${item.tipo === '2d_chao' ? 'ativo' : ''}" data-tipo="2d_chao">
            2D no chão
          </button>
        </div>
      </div>

      <div class="props-campo" id="ipAlturaWrap" ${item.tipo === '2d_chao' ? 'style="display:none"' : ''}>
        <label class="props-label">Altura (metros)</label>
        <div class="mp-row">
          <input type="range" id="ipAltSlider" min="0.3" max="5" step="0.1" value="${altM}" class="mp-slider" />
          <input type="number" id="ipAltNum" min="0.3" max="5" step="0.1" value="${altM}" class="mp-num" style="width:60px" />
          <span class="props-unidade">m</span>
        </div>
      </div>

      <div class="props-campo">
        <label class="props-label">Texturas (estados)</label>
        <div id="ipTexturas">
          ${texturas.map((t, i) => `
            <div class="ip-tex-row" data-ti="${i}">
              <img class="tp-tex-thumb" src="${t.url || ''}" onerror="this.style.display='none'"
                style="${t.url ? '' : 'display:none'}" />
              <input class="props-input" style="flex:1" data-ti="${i}" value="${t.nome || 'Estado ' + (i + 1)}" placeholder="Nome" />
              <button class="tp-tex-btn ip-upload-btn" data-ti="${i}">📤</button>
              <button class="tp-var-del ip-del-btn" data-ti="${i}">✕</button>
              <input type="file" class="ip-file" data-ti="${i}" accept="image/*" style="display:none" />
            </div>
          `).join('')}
        </div>
        <button class="btn-nova-variacao" id="btnAddTextura">+ Adicionar textura</button>
      </div>

      <div class="tp-acoes">
        <button class="btn-primary" id="btnSalvarItem">💾 Salvar</button>
        <button class="btn-danger"  id="btnDeletarItem">🗑 Deletar</button>
      </div>
    `;

    // Tipo
    el.querySelectorAll('.tipo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._editando.tipo = btn.dataset.tipo;
        el.querySelectorAll('.tipo-btn').forEach(b => b.classList.toggle('ativo', b === btn));
        document.getElementById('ipAlturaWrap').style.display = this._editando.tipo === '2d_chao' ? 'none' : '';
      });
    });

    // Altura
    document.getElementById('ipAltSlider')?.addEventListener('input', e => {
      document.getElementById('ipAltNum').value = e.target.value;
      this._editando.alturaMetros = parseFloat(e.target.value);
      this._editando.escala = parseFloat(e.target.value) / METROS_POR_CELULA;
    });
    document.getElementById('ipAltNum')?.addEventListener('input', e => {
      document.getElementById('ipAltSlider').value = e.target.value;
      this._editando.alturaMetros = parseFloat(e.target.value);
      this._editando.escala = parseFloat(e.target.value) / METROS_POR_CELULA;
    });

    // Adicionar textura
    document.getElementById('btnAddTextura')?.addEventListener('click', () => {
      this._editando.texturas = this._editando.texturas || [];
      this._editando.texturas.push({ nome: 'Estado ' + (this._editando.texturas.length + 1), url: '' });
      this._renderProps();
    });

    // Uploads e deleções de textura
    const texEl = document.getElementById('ipTexturas');
    texEl?.querySelectorAll('.ip-upload-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const file = btn.closest('.ip-tex-row').querySelector('.ip-file');
        file.click();
      });
    });
    texEl?.querySelectorAll('.ip-file').forEach(inp => {
      inp.addEventListener('change', e => this._uploadTextura(e));
    });
    texEl?.querySelectorAll('.ip-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ti = parseInt(btn.dataset.ti);
        this._editando.texturas.splice(ti, 1);
        this._renderProps();
      });
    });
    texEl?.querySelectorAll('input.props-input').forEach(inp => {
      inp.addEventListener('input', e => {
        const ti = parseInt(inp.dataset.ti);
        this._editando.texturas[ti].nome = e.target.value;
      });
    });

    // Nome
    document.getElementById('ipNome')?.addEventListener('input', e => { this._editando.nome = e.target.value; });

    document.getElementById('btnSalvarItem')?.addEventListener('click', () => this._salvar());
    document.getElementById('btnDeletarItem')?.addEventListener('click', () => {
      if (!confirm('Deletar este item?')) return;
      deleteItem(this.campanhaId, this.selecionado);
      this.selecionado = null;
      this._renderProps();
      this._renderLista();
    });
  }

  async _uploadTextura(e) {
    const file = e.target.files[0];
    if (!file) return;
    const ti = parseInt(e.target.dataset.ti);
    this.onUploadProgress?.(10);
    const url = await comprimirImagem(file, 512, 0.85);
    this._editando.texturas[ti].url = url;
    const thumb = e.target.closest('.ip-tex-row').querySelector('.tp-tex-thumb');
    if (thumb) { thumb.src = url; thumb.style.display = ''; }
    this.onUploadProgress?.(100);
    e.target.value = '';
  }

  async _salvar() {
    if (!this.selecionado || !this._editando) return;
    await saveItem(this.campanhaId, this.selecionado, { ...this._editando });
  }

  async _criarNovo() {
    const ref = await pushItem(this.campanhaId, {
      nome: 'Novo Item',
      posX: 5, posY: 5,
      escala: 1.0 / METROS_POR_CELULA,
      alturaMetros: 1.0,
      tipo: '2.5d',
      texturas: [{ nome: 'Padrão', url: '' }],
      url2d: '',
    });
    this.selecionado = ref.key;
    this._editando = { ...this.itens[this.selecionado] || { nome: 'Novo Item', tipo: '2.5d', texturas: [] } };
    this._renderLista();
    this._renderProps();
  }

  getAll() {
    return Object.entries(this.itens).map(([id, item]) => ({ id, ...item }));
  }

  getById(id) {
    return this.itens[id] ? { id, ...this.itens[id] } : null;
  }
}

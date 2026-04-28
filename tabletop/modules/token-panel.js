// Painel lateral de gerenciamento de tokens
import { pushToken, saveToken, deleteToken, patchToken } from './firebase-sync.js';
import { comprimirImagem } from './image-compress.js';
import { uploadFile } from './firebase-sync.js';

// Altura padrão em metros e tamanho de célula em metros
const ALTURA_PADRAO_M = 1.70;
const METROS_POR_CELULA = 1.5;

export class TokenPanel {
  constructor(panelEl, campanhaId, isGM, userId) {
    this.panel      = panelEl;
    this.campanhaId = campanhaId;
    this.isGM       = isGM;
    this.userId     = userId;
    this.tokens     = {};
    this.selecionado = null;    // id do token sendo editado
    this._editando  = {};       // cópia local para edição

    this.onUploadProgress = null;
    this.onSelecionarToken = null; // (id) para o renderer focar

    this.render();
  }

  setTokens(obj) {
    this.tokens = obj || {};
    this._renderLista();
    if (this.selecionado && !this.tokens[this.selecionado]) {
      this.selecionado = null;
      this._renderProps();
    }
  }

  canEdit(id) {
    const t = this.tokens[id];
    if (!t) return this.isGM;
    return this.isGM || t.fichaId === this.userId;
  }

  // ── Render principal ──────────────────────────────────────────────────────

  render() {
    this.panel.innerHTML = `
      <div class="painel-header">
        <span class="painel-titulo">🧙 Tokens</span>
        <button class="painel-fechar" id="tokenPanelFechar">✕</button>
      </div>
      ${this.isGM ? `<button class="btn-criar" id="btnCriarToken">➕ Criar novo token</button>` : ''}
      <div class="token-lista" id="tokenLista"></div>
      <div class="token-props" id="tokenProps"></div>
    `;

    document.getElementById('btnCriarToken')?.addEventListener('click', () => this._criarNovo());
    document.getElementById('tokenPanelFechar')?.addEventListener('click', () => {
      this.panel.classList.add('oculto');
    });

    this._renderLista();
  }

  _renderLista() {
    const el = document.getElementById('tokenLista');
    if (!el) return;
    const lista = Object.entries(this.tokens);
    if (!lista.length) { el.innerHTML = '<p class="mp-vazio">Nenhum token na cena.</p>'; return; }

    el.innerHTML = lista.map(([id, t]) => {
      const img = t.variacoes?.[t.variacaoAtiva || 0]?.img2d || '';
      return `
        <div class="token-lista-item ${id === this.selecionado ? 'ativo' : ''}" data-id="${id}">
          <img class="token-thumb" src="${img}" onerror="this.style.background='#330a10';this.style.border='none'" />
          <span class="token-nome">${t.nome || 'Token'}</span>
        </div>
      `;
    }).join('');

    el.querySelectorAll('.token-lista-item').forEach(div => {
      div.addEventListener('click', () => {
        this.selecionado = div.dataset.id;
        this._editando = JSON.parse(JSON.stringify(this.tokens[this.selecionado]));
        this._renderLista();
        this._renderProps();
        this.onSelecionarToken?.(this.selecionado);
      });
    });
  }

  _renderProps() {
    const el = document.getElementById('tokenProps');
    if (!el) return;
    if (!this.selecionado) { el.innerHTML = ''; return; }

    const t = this._editando;
    if (!t) return;
    const podeEditar = this.canEdit(this.selecionado);
    const alturaM = t.alturaMetros ?? ALTURA_PADRAO_M;
    const variacoes = t.variacoes || [];

    el.innerHTML = `
      <div class="props-sep"></div>

      <div class="props-campo">
        <label class="props-label">Nome</label>
        <input class="props-input" id="tpNome" value="${t.nome || ''}" ${!podeEditar ? 'disabled' : ''} />
      </div>

      <div class="props-campo">
        <label class="props-label">Altura (metros)</label>
        <div class="mp-row">
          <input type="range" id="tpAltSlider" min="0.5" max="5" step="0.05"
            value="${alturaM}" class="mp-slider" ${!podeEditar ? 'disabled' : ''} />
          <input type="number" id="tpAltNum" min="0.5" max="5" step="0.05"
            value="${alturaM}" class="mp-num" style="width:60px" ${!podeEditar ? 'disabled' : ''} />
          <span class="props-unidade">m</span>
        </div>
      </div>

      <div class="props-campo">
        <label class="props-label">Cor da borda</label>
        <input type="color" id="tpCor" value="${t.corBorda || '#ff8ca0'}" ${!podeEditar ? 'disabled' : ''} />
      </div>

      <div class="props-campo">
        <label class="props-label">Textura 2D (vista superior)</label>
        <div class="tp-tex-row">
          <img id="tpImg2dThumb" class="tp-tex-thumb" src="${t.img2d || ''}"
            onerror="this.style.display='none'" style="${t.img2d ? '' : 'display:none'}" />
          ${podeEditar ? `<button class="tp-tex-btn" id="btnUpload2d">📤 Subir</button>` : ''}
        </div>
        <input type="file" id="tpFile2d" accept="image/*" style="display:none" />
      </div>

      <div class="props-campo">
        <label class="props-label">Estados / variações (3D)</label>
        <div id="tpVariacoesList">
          ${variacoes.map((v, i) => this._variacaoHtml(i, v, podeEditar)).join('')}
        </div>
        ${podeEditar ? `<button class="btn-nova-variacao" id="btnAddVariacao">+ Adicionar estado</button>` : ''}
      </div>

      ${this.isGM ? `
        <div class="props-campo">
          <label class="props-label">Ficha controladora (userId)</label>
          <input class="props-input" id="tpFichaId" value="${t.fichaId || ''}" />
        </div>
        <div class="props-campo">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" id="tpBloqueado" ${t.bloqueado ? 'checked' : ''} />
            Bloquear token
          </label>
        </div>
      ` : ''}

      ${podeEditar ? `
        <div class="tp-acoes">
          <button class="btn-primary" id="btnSalvarToken">💾 Salvar</button>
          ${this.isGM ? `<button class="btn-danger" id="btnDeletarToken">🗑 Deletar</button>` : ''}
        </div>
      ` : ''}
    `;

    // Sincroniza slider/num altura
    const syncAltura = (v) => {
      this._editando.alturaMetros = parseFloat(v);
      // Converte para escala (1.0 = 1 célula = 1.5m)
      this._editando.escala = parseFloat(v) / METROS_POR_CELULA;
    };
    document.getElementById('tpAltSlider')?.addEventListener('input', e => {
      document.getElementById('tpAltNum').value = e.target.value;
      syncAltura(e.target.value);
    });
    document.getElementById('tpAltNum')?.addEventListener('input', e => {
      document.getElementById('tpAltSlider').value = e.target.value;
      syncAltura(e.target.value);
    });

    // Upload img2d
    document.getElementById('btnUpload2d')?.addEventListener('click', () =>
      document.getElementById('tpFile2d')?.click()
    );
    document.getElementById('tpFile2d')?.addEventListener('change', e => this._uploadImg2d(e));

    // Adicionar variação
    document.getElementById('btnAddVariacao')?.addEventListener('click', () => {
      this._editando.variacoes = this._editando.variacoes || [];
      this._editando.variacoes.push({ nome: 'Novo estado', img3d_frente: '', img3d_verso: '', img2d: '' });
      this._renderProps();
    });

    // Upload de textura por variação
    this._bindVariacaoEvents(podeEditar);

    // Salvar
    document.getElementById('btnSalvarToken')?.addEventListener('click', () => this._salvar());

    // Deletar
    document.getElementById('btnDeletarToken')?.addEventListener('click', () => {
      if (!confirm('Deletar este token permanentemente?')) return;
      deleteToken(this.campanhaId, this.selecionado);
      this.selecionado = null;
      this._renderProps();
      this._renderLista();
    });

    // Campos simples
    document.getElementById('tpNome')?.addEventListener('input',    e => { this._editando.nome    = e.target.value; });
    document.getElementById('tpCor')?.addEventListener('input',     e => { this._editando.corBorda = e.target.value; });
    document.getElementById('tpFichaId')?.addEventListener('input', e => { this._editando.fichaId = e.target.value; });
    document.getElementById('tpBloqueado')?.addEventListener('change', e => { this._editando.bloqueado = e.target.checked; });
  }

  _variacaoHtml(i, v, podeEditar) {
    return `
      <div class="tp-variacao" data-vi="${i}">
        <div class="tp-var-header">
          <input class="tp-var-nome props-input" data-vi="${i}" value="${v.nome || ''}"
            placeholder="Nome do estado" ${!podeEditar ? 'disabled' : ''} />
          ${podeEditar ? `<button class="tp-var-del" data-vi="${i}" title="Remover">✕</button>` : ''}
        </div>
        <div class="tp-var-imgs">
          <div class="tp-var-img-wrap">
            <span class="tp-var-img-label">3D Frente</span>
            <img class="tp-var-thumb" src="${v.img3d_frente || ''}" data-campo="img3d_frente" data-vi="${i}"
              onerror="this.src=''" style="${v.img3d_frente ? '' : 'display:none'}" />
            ${podeEditar ? `<button class="tp-var-upload" data-campo="img3d_frente" data-vi="${i}">📤</button>` : ''}
          </div>
          <div class="tp-var-img-wrap">
            <span class="tp-var-img-label">3D Verso</span>
            <img class="tp-var-thumb" src="${v.img3d_verso || ''}" data-campo="img3d_verso" data-vi="${i}"
              onerror="this.src=''" style="${v.img3d_verso ? '' : 'display:none'}" />
            ${podeEditar ? `<button class="tp-var-upload" data-campo="img3d_verso" data-vi="${i}">📤</button>` : ''}
          </div>
          <div class="tp-var-img-wrap">
            <span class="tp-var-img-label">2D Estado</span>
            <img class="tp-var-thumb" src="${v.img2d || ''}" data-campo="img2d" data-vi="${i}"
              onerror="this.src=''" style="${v.img2d ? '' : 'display:none'}" />
            ${podeEditar ? `<button class="tp-var-upload" data-campo="img2d" data-vi="${i}">📤</button>` : ''}
          </div>
        </div>
        <input type="file" class="tp-var-file" accept="image/*" data-campo="" data-vi="${i}" style="display:none" />
      </div>
    `;
  }

  _bindVariacaoEvents(podeEditar) {
    if (!podeEditar) return;
    const el = document.getElementById('tpVariacoesList');
    if (!el) return;

    // Deletar variação
    el.querySelectorAll('.tp-var-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const vi = parseInt(btn.dataset.vi);
        this._editando.variacoes.splice(vi, 1);
        if (this._editando.variacaoAtiva >= this._editando.variacoes.length)
          this._editando.variacaoAtiva = 0;
        this._renderProps();
      });
    });

    // Nome variação
    el.querySelectorAll('.tp-var-nome').forEach(inp => {
      inp.addEventListener('input', e => {
        const vi = parseInt(inp.dataset.vi);
        this._editando.variacoes[vi].nome = e.target.value;
      });
    });

    // Botão upload de textura
    el.querySelectorAll('.tp-var-upload').forEach(btn => {
      btn.addEventListener('click', () => {
        const vi    = parseInt(btn.dataset.vi);
        const campo = btn.dataset.campo;
        const file  = btn.closest('.tp-variacao').querySelector('.tp-var-file');
        file.dataset.campo = campo;
        file.dataset.vi    = vi;
        file.click();
      });
    });

    // File input por variação
    el.querySelectorAll('.tp-var-file').forEach(inp => {
      inp.addEventListener('change', e => this._uploadTextura(e));
    });
  }

  async _uploadImg2d(e) {
    const file = e.target.files[0];
    if (!file) return;
    this.onUploadProgress?.(5);
    const blob = await comprimirImagem(file, 512, 0.85);
    const caminho = `tabletop/${this.campanhaId}/tokens/${this.selecionado}/img2d`;
    const url = await uploadFile(caminho, blob, p => this.onUploadProgress?.(5 + p * 0.92));
    this._editando.img2d = url;
    const thumb = document.getElementById('tpImg2dThumb');
    if (thumb) { thumb.src = url; thumb.style.display = ''; }
    this.onUploadProgress?.(100);
    e.target.value = '';
  }

  async _uploadTextura(e) {
    const file  = e.target.files[0];
    if (!file) return;
    const vi    = parseInt(e.target.dataset.vi);
    const campo = e.target.dataset.campo;
    this.onUploadProgress?.(5);
    const blob = await comprimirImagem(file, 512, 0.85);
    const caminho = `tabletop/${this.campanhaId}/tokens/${this.selecionado}/var${vi}_${campo}`;
    const url  = await uploadFile(caminho, blob, p => this.onUploadProgress?.(5 + p * 0.92));
    this._editando.variacoes[vi][campo] = url;
    // Atualiza thumbnail
    const thumb = document.querySelector(`.tp-var-thumb[data-campo="${campo}"][data-vi="${vi}"]`);
    if (thumb) { thumb.src = url; thumb.style.display = ''; }
    this.onUploadProgress?.(100);
    e.target.value = '';
  }

  async _salvar() {
    if (!this.selecionado || !this._editando) return;
    await saveToken(this.campanhaId, this.selecionado, { ...this._editando });
  }

  async _criarNovo() {
    const ref = await pushToken(this.campanhaId, {
      nome: 'Novo Token',
      posX: 3, posY: 3,
      escala: ALTURA_PADRAO_M / METROS_POR_CELULA,
      alturaMetros: ALTURA_PADRAO_M,
      bloqueado: false,
      fichaId: '',
      variacaoAtiva: 0,
      corBorda: '#ff8ca0',
      variacoes: [{ nome: 'Padrão', img3d_frente: '', img3d_verso: '', img2d: '' }],
    });
    this.selecionado = ref.key;
    this._editando = JSON.parse(JSON.stringify(this.tokens[this.selecionado] || {
      nome: 'Novo Token', variacoes: [{ nome: 'Padrão', img3d_frente: '', img3d_verso: '', img2d: '' }],
      alturaMetros: ALTURA_PADRAO_M, escala: ALTURA_PADRAO_M / METROS_POR_CELULA, corBorda: '#ff8ca0',
    }));
    this._renderLista();
    this._renderProps();
  }
}

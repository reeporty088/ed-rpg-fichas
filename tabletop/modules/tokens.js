// Gerenciamento local de tokens e sincronização de posição/variação
import { saveToken, patchToken, deleteToken, pushToken } from './firebase-sync.js';

export class TokenManager {
  constructor(campanhaId, isGM, userId) {
    this.campanhaId = campanhaId;
    this.isGM = isGM;
    this.userId = userId;
    this.tokens = {};         // { [id]: dadosToken }
    this._debounces = {};     // timers de debounce por tokenId
    this.onChange = null;     // callback quando tokens mudam localmente
  }

  // Chamado pelo listener do Firebase com snapshot atualizado
  setTokens(obj) {
    this.tokens = obj || {};
  }

  canMove(id) {
    const t = this.tokens[id];
    if (!t || t.bloqueado) return false;
    return this.isGM || t.fichaId === this.userId;
  }

  canEdit(id) {
    const t = this.tokens[id];
    if (!t) return false;
    return this.isGM || t.fichaId === this.userId;
  }

  // Move token e salva com debounce de 200ms
  moveToken(id, posX, posY) {
    if (!this.canMove(id)) return;
    this.tokens[id].posX = posX;
    this.tokens[id].posY = posY;
    clearTimeout(this._debounces[id]);
    this._debounces[id] = setTimeout(() => {
      patchToken(this.campanhaId, id, { posX, posY });
    }, 200);
  }

  // Troca variação ativa e sincroniza imediatamente
  setVariacao(id, idx) {
    if (!this.canEdit(id)) return;
    if (!this.tokens[id]) return;
    this.tokens[id].variacaoAtiva = idx;
    patchToken(this.campanhaId, id, { variacaoAtiva: idx });
  }

  setEscala(id, escala) {
    if (!this.canEdit(id)) return;
    this.tokens[id].escala = escala;
    patchToken(this.campanhaId, id, { escala });
  }

  setBloqueado(id, bloqueado) {
    if (!this.isGM) return;
    this.tokens[id].bloqueado = bloqueado;
    patchToken(this.campanhaId, id, { bloqueado });
  }

  // Cria novo token (só GM)
  async addToken(extra = {}) {
    if (!this.isGM) return null;
    const dados = {
      nome: 'Novo Token',
      posX: 2,
      posY: 2,
      escala: 1,
      bloqueado: false,
      fichaId: '',
      variacaoAtiva: 0,
      variacoes: [{ nome: 'Padrão', img3d_frente: '', img3d_verso: '', img2d: '' }],
      corBorda: '#ff8ca0',
      ...extra
    };
    const ref = await pushToken(this.campanhaId, dados);
    return ref.key;
  }

  async removeToken(id) {
    if (!this.isGM) return;
    return deleteToken(this.campanhaId, id);
  }

  // Salva objeto completo do token (para edição de variações)
  async saveTokenCompleto(id, data) {
    return saveToken(this.campanhaId, id, data);
  }

  getAll() {
    return Object.entries(this.tokens).map(([id, t]) => ({ id, ...t }));
  }

  getById(id) {
    return this.tokens[id] ? { id, ...this.tokens[id] } : null;
  }
}

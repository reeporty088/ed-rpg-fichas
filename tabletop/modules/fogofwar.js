// Fog of War — renderizado em canvas 2D sobreposto ao mapa
import { saveFog } from './firebase-sync.js';

export class FogOfWar {
  constructor(campanhaId, isGM, larguraCelulas, alturaCelulas) {
    this.campanhaId = campanhaId;
    this.isGM = isGM;
    this.cols = larguraCelulas;   // número de colunas do grid
    this.rows = alturaCelulas;    // número de linhas do grid
    // Mapa de células: true = revelada, false/undefined = coberta
    this.cells = {};
    this._saveTimer = null;
    this.canvas = null;
    this.ctx = null;
    this.tamanhoCelula = 50; // px por célula no canvas de fog
    this.pincelTamanho = 2;  // em células
    this.pincelTipo = 'circle'; // 'circle' | 'square'
  }

  inicializar(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._redraw();
  }

  // Recebe dados do Firebase
  setFog(data) {
    this.cells = data || {};
    this._redraw();
  }

  // GM pinta névoa (esconde)
  pintar(colInicio, linhaInicio) {
    if (!this.isGM) return;
    this._aplicarPincel(colInicio, linhaInicio, false);
    this._redraw();
    this._salvarDebounce();
  }

  // GM apaga névoa (revela)
  revelar(col, linha) {
    if (!this.isGM) return;
    this._aplicarPincel(col, linha, true);
    this._redraw();
    this._salvarDebounce();
  }

  revelarTudo() {
    if (!this.isGM) return;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.cells[`${c}_${r}`] = true;
      }
    }
    this._redraw();
    this._salvarDebounce();
  }

  esconderTudo() {
    if (!this.isGM) return;
    this.cells = {};
    this._redraw();
    this._salvarDebounce();
  }

  _aplicarPincel(col, linha, revelar) {
    const r = this.pincelTamanho;
    if (this.pincelTipo === 'circle') {
      for (let dc = -r; dc <= r; dc++) {
        for (let dl = -r; dl <= r; dl++) {
          if (dc * dc + dl * dl <= r * r) {
            const c = col + dc, l = linha + dl;
            if (c >= 0 && c < this.cols && l >= 0 && l < this.rows) {
              if (revelar) this.cells[`${c}_${l}`] = true;
              else delete this.cells[`${c}_${l}`];
            }
          }
        }
      }
    } else {
      for (let dc = -r; dc <= r; dc++) {
        for (let dl = -r; dl <= r; dl++) {
          const c = col + dc, l = linha + dl;
          if (c >= 0 && c < this.cols && l >= 0 && l < this.rows) {
            if (revelar) this.cells[`${c}_${l}`] = true;
            else delete this.cells[`${c}_${l}`];
          }
        }
      }
    }
  }

  _redraw() {
    if (!this.canvas) return;
    const { ctx, cols, rows, tamanhoCelula } = this;
    const w = cols * tamanhoCelula;
    const h = rows * tamanhoCelula;
    this.canvas.width  = w;
    this.canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const revelada = !!this.cells[`${c}_${r}`];
        if (!revelada) {
          if (this.isGM) {
            // GM vê névoa semi-transparente
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
          } else {
            ctx.fillStyle = 'rgba(0,0,0,1)';
          }
          ctx.fillRect(c * tamanhoCelula, r * tamanhoCelula, tamanhoCelula, tamanhoCelula);
        }
      }
    }
  }

  // Converte coordenada de pixel do canvas de fog para célula do grid
  pixelParaCelula(px, py) {
    return {
      col: Math.floor(px / this.tamanhoCelula),
      linha: Math.floor(py / this.tamanhoCelula)
    };
  }

  _salvarDebounce() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => saveFog(this.campanhaId, this.cells), 400);
  }
}

/**
 * Véu RPG - Módulo Cropper de Capa da Campanha (assets/js/cover-cropper.js)
 * Permite recortar, reposicionar e ajustar zoom de imagens de capa para campanhas
 * em formato 16:9 / banner, exportando em JPEG otimizado para o Cloud Firestore.
 */

const CANVAS_W = 360;
const CANVAS_H = 220;
const CROP_W = 320;
const CROP_H = 180;
const CROP_X = 20;
const CROP_Y = 20;
const CROP_MAX_X = CROP_X + CROP_W; // 340
const CROP_MAX_Y = CROP_Y + CROP_H; // 200

let loadedImg = null;
let minScale = 1;
let currentScale = 1;
let offsetX = 0;
let offsetY = 0;

let isDragging = false;
let startDragX = 0;
let startDragY = 0;
let initialOffsetX = 0;
let initialOffsetY = 0;

let confirmCallback = null;
let isInitialized = false;

// Elementos do DOM
let cropCoverCanvas = null;
let coverZoomSlider = null;
let btnCoverZoomIn = null;
let btnCoverZoomOut = null;
let btnResetCoverCrop = null;
let btnSaveCoverCrop = null;

function queryElements() {
  cropCoverCanvas = document.getElementById("cropCoverCanvas");
  coverZoomSlider = document.getElementById("coverZoomSlider");
  btnCoverZoomIn = document.getElementById("btnCoverZoomIn");
  btnCoverZoomOut = document.getElementById("btnCoverZoomOut");
  btnResetCoverCrop = document.getElementById("btnResetCoverCrop");
  btnSaveCoverCrop = document.getElementById("btnSaveCoverCrop");
}

function clampOffsets() {
  if (!loadedImg) return;
  const w = loadedImg.width * currentScale;
  const h = loadedImg.height * currentScale;

  if (offsetX > CROP_X) offsetX = CROP_X;
  if (offsetX + w < CROP_MAX_X) offsetX = CROP_MAX_X - w;
  if (offsetY > CROP_Y) offsetY = CROP_Y;
  if (offsetY + h < CROP_MAX_Y) offsetY = CROP_MAX_Y - h;
}

function drawCropCoverCanvas() {
  if (!cropCoverCanvas) return;
  const ctx = cropCoverCanvas.getContext("2d");
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Fundo preto
  ctx.fillStyle = "#06070a";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (loadedImg) {
    ctx.drawImage(
      loadedImg,
      offsetX,
      offsetY,
      loadedImg.width * currentScale,
      loadedImg.height * currentScale
    );
  }

  // 1. Máscara semi-transparente fora do retângulo 320x180
  ctx.save();
  ctx.fillStyle = "rgba(6, 7, 10, 0.72)";
  ctx.beginPath();
  ctx.rect(0, 0, CANVAS_W, CANVAS_H);
  ctx.rect(CROP_X, CROP_Y, CROP_W, CROP_H);
  ctx.fill("evenodd");
  ctx.restore();

  // 2. Borda brilhante ao redor da área de corte
  ctx.save();
  ctx.strokeStyle = "rgba(168, 85, 247, 0.95)";
  ctx.lineWidth = 2;
  ctx.strokeRect(CROP_X, CROP_Y, CROP_W, CROP_H);

  // 3. Grade da Regra dos Terços (Rule of Thirds)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Linhas verticais
  ctx.moveTo(CROP_X + CROP_W / 3, CROP_Y);
  ctx.lineTo(CROP_X + CROP_W / 3, CROP_MAX_Y);
  ctx.moveTo(CROP_X + (CROP_W * 2) / 3, CROP_Y);
  ctx.lineTo(CROP_X + (CROP_W * 2) / 3, CROP_MAX_Y);
  // Linhas horizontais
  ctx.moveTo(CROP_X, CROP_Y + CROP_H / 3);
  ctx.lineTo(CROP_MAX_X, CROP_Y + CROP_H / 3);
  ctx.moveTo(CROP_X, CROP_Y + (CROP_H * 2) / 3);
  ctx.lineTo(CROP_MAX_X, CROP_Y + (CROP_H * 2) / 3);
  ctx.stroke();

  // 4. Marcadores dos cantos
  ctx.strokeStyle = "rgba(236, 72, 153, 0.95)";
  ctx.lineWidth = 3;
  const cornerLen = 14;

  // Canto superior esquerdo
  ctx.beginPath();
  ctx.moveTo(CROP_X, CROP_Y + cornerLen);
  ctx.lineTo(CROP_X, CROP_Y);
  ctx.lineTo(CROP_X + cornerLen, CROP_Y);
  ctx.stroke();

  // Canto superior direito
  ctx.beginPath();
  ctx.moveTo(CROP_MAX_X - cornerLen, CROP_Y);
  ctx.lineTo(CROP_MAX_X, CROP_Y);
  ctx.lineTo(CROP_MAX_X, CROP_Y + cornerLen);
  ctx.stroke();

  // Canto inferior esquerdo
  ctx.beginPath();
  ctx.moveTo(CROP_X, CROP_MAX_Y - cornerLen);
  ctx.lineTo(CROP_X, CROP_MAX_Y);
  ctx.lineTo(CROP_X + cornerLen, CROP_MAX_Y);
  ctx.stroke();

  // Canto inferior direito
  ctx.beginPath();
  ctx.moveTo(CROP_MAX_X - cornerLen, CROP_MAX_Y);
  ctx.lineTo(CROP_MAX_X, CROP_MAX_Y);
  ctx.lineTo(CROP_MAX_X, CROP_MAX_Y - cornerLen);
  ctx.stroke();

  ctx.restore();
}

function setupCropper(img) {
  loadedImg = img;
  // Escala mínima para cobrir totalmente o retângulo 320x180
  minScale = Math.max(CROP_W / img.width, CROP_H / img.height);
  currentScale = minScale;

  if (coverZoomSlider) coverZoomSlider.value = "1";

  // Centraliza inicialmente a imagem
  offsetX = CROP_X + (CROP_W - img.width * currentScale) / 2;
  offsetY = CROP_Y + (CROP_H - img.height * currentScale) / 2;

  clampOffsets();
  drawCropCoverCanvas();
}

function applyZoom(newScale) {
  if (!loadedImg) return;
  const maxScale = minScale * 4;
  newScale = Math.max(minScale, Math.min(maxScale, newScale));

  // Ponto central de foco (centro do retângulo 320x180)
  const centerCropX = CROP_X + CROP_W / 2;
  const centerCropY = CROP_Y + CROP_H / 2;

  const imgCenterX = (centerCropX - offsetX) / currentScale;
  const imgCenterY = (centerCropY - offsetY) / currentScale;

  currentScale = newScale;
  offsetX = centerCropX - imgCenterX * currentScale;
  offsetY = centerCropY - imgCenterY * currentScale;

  clampOffsets();
  drawCropCoverCanvas();

  if (coverZoomSlider) {
    const ratio = (currentScale - minScale) / (maxScale - minScale);
    coverZoomSlider.value = String(1 + ratio * 2);
  }
}

function initEvents() {
  if (isInitialized) return;
  isInitialized = true;
  queryElements();

  if (btnResetCoverCrop) {
    btnResetCoverCrop.addEventListener("click", () => {
      if (loadedImg) setupCropper(loadedImg);
    });
  }

  if (cropCoverCanvas) {
    cropCoverCanvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      startDragX = e.clientX;
      startDragY = e.clientY;
      initialOffsetX = offsetX;
      initialOffsetY = offsetY;
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging || !loadedImg) return;
      offsetX = initialOffsetX + (e.clientX - startDragX);
      offsetY = initialOffsetY + (e.clientY - startDragY);
      clampOffsets();
      drawCropCoverCanvas();
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // Suporte a Touch
    cropCoverCanvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1 && loadedImg) {
        isDragging = true;
        startDragX = e.touches[0].clientX;
        startDragY = e.touches[0].clientY;
        initialOffsetX = offsetX;
        initialOffsetY = offsetY;
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (!isDragging || !loadedImg || e.touches.length !== 1) return;
      offsetX = initialOffsetX + (e.touches[0].clientX - startDragX);
      offsetY = initialOffsetY + (e.touches[0].clientY - startDragY);
      clampOffsets();
      drawCropCoverCanvas();
    }, { passive: true });

    window.addEventListener("touchend", () => {
      isDragging = false;
    });

    // Roda do mouse para zoom
    cropCoverCanvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      applyZoom(currentScale * factor);
    }, { passive: false });
  }

  // Controles de Zoom
  if (coverZoomSlider) {
    coverZoomSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      const ratio = (val - 1) / 2;
      const maxScale = minScale * 4;
      const targetScale = minScale + ratio * (maxScale - minScale);
      applyZoom(targetScale);
    });
  }

  if (btnCoverZoomIn) {
    btnCoverZoomIn.addEventListener("click", () => applyZoom(currentScale * 1.15));
  }

  if (btnCoverZoomOut) {
    btnCoverZoomOut.addEventListener("click", () => applyZoom(currentScale / 1.15));
  }

  // Salvar / Confirmar corte da Capa
  if (btnSaveCoverCrop) {
    btnSaveCoverCrop.addEventListener("click", () => {
      if (!loadedImg || !confirmCallback) return;

      btnSaveCoverCrop.disabled = true;
      btnSaveCoverCrop.innerHTML = `<span class="btn-spinner"></span> <span>Processando...</span>`;

      try {
        // Exporta em JPEG otimizado 640x360 (proporção 16:9 nítida e leve)
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = 640;
        exportCanvas.height = 360;
        const expCtx = exportCanvas.getContext("2d");

        const srcX = (CROP_X - offsetX) / currentScale;
        const srcY = (CROP_Y - offsetY) / currentScale;
        const srcW = CROP_W / currentScale;
        const srcH = CROP_H / currentScale;

        expCtx.drawImage(
          loadedImg,
          srcX,
          srcY,
          srcW,
          srcH,
          0,
          0,
          640,
          360
        );

        const dataUrl = exportCanvas.toDataURL("image/jpeg", 0.85);

        confirmCallback(dataUrl);

        const modal = document.getElementById("modalCropCampaignCover");
        if (modal) modal.classList.remove("active");
      } catch (err) {
        console.error("Erro ao recortar imagem de capa:", err);
        const alertEl = document.getElementById("dashboardAlert");
        if (alertEl) {
          alertEl.className = "alert alert-error";
          alertEl.innerHTML = "<span>Não foi possível processar o corte da imagem.</span>";
          alertEl.style.display = "flex";
          setTimeout(() => { alertEl.style.display = "none"; }, 3500);
        }
      } finally {
        btnSaveCoverCrop.disabled = false;
        btnSaveCoverCrop.innerHTML = `<span>Confirmar Capa</span>`;
      }
    });
  }
}

/**
 * Abre o modal de recorte para uma imagem enviada pelo usuário
 * @param {File|Blob} file Arquivo de imagem selecionado
 * @param {Function} onConfirm Callback chamado com o DataURL recortado (JPEG)
 */
export function openCoverCropper(file, onConfirm) {
  initEvents();

  if (!file) return;

  if (!file.type || !file.type.startsWith("image/")) {
    const alertEl = document.getElementById("dashboardAlert");
    if (alertEl) {
      alertEl.className = "alert alert-error";
      alertEl.innerHTML = "<span>Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).</span>";
      alertEl.style.display = "flex";
      setTimeout(() => { alertEl.style.display = "none"; }, 3500);
    }
    return;
  }

  if (file.size > 12 * 1024 * 1024) {
    const alertEl = document.getElementById("dashboardAlert");
    if (alertEl) {
      alertEl.className = "alert alert-error";
      alertEl.innerHTML = "<span>A imagem é muito grande. Escolha um arquivo de até 12MB.</span>";
      alertEl.style.display = "flex";
      setTimeout(() => { alertEl.style.display = "none"; }, 3500);
    }
    return;
  }

  confirmCallback = onConfirm;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      setupCropper(img);
      const modal = document.getElementById("modalCropCampaignCover");
      if (modal) modal.classList.add("active");
    };
    img.onerror = () => {
      const alertEl = document.getElementById("dashboardAlert");
      if (alertEl) {
        alertEl.className = "alert alert-error";
        alertEl.innerHTML = "<span>Não foi possível carregar a imagem. Tente outro arquivo.</span>";
        alertEl.style.display = "flex";
        setTimeout(() => { alertEl.style.display = "none"; }, 3500);
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

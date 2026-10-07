/**
 * Véu RPG - Painel Geral e Gestão de Campanhas (assets/js/app.js)
 * Gerencia navegação SPA, campanhas no Firestore, perfil e configurações
 */

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  arrayUnion,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initCampaignWorkspace, cleanupCampaignListeners } from "./campaign.js";
import { openCoverCropper } from "./cover-cropper.js";

// ==========================================================================
// 1. ESTADO GLOBAL DA APLICAÇÃO
// ==========================================================================
let currentUser = null;
let unsubscribeCampaigns = null;
let currentCampaignDetail = null;

const DEFAULT_COVER_URL = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop";

// ==========================================================================
// 2. CONTROLE DE TEMA (DARK / LIGHT)
// ==========================================================================
const THEME_STORAGE_KEY = "veu-rpg-theme";
const btnThemeDark = document.getElementById("btnThemeDark");
const btnThemeLight = document.getElementById("btnThemeLight");

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  if (btnThemeDark && btnThemeLight) {
    btnThemeDark.classList.toggle("active", theme === "dark");
    btnThemeLight.classList.toggle("active", theme === "light");
  }
}

if (btnThemeDark) btnThemeDark.addEventListener("click", () => applyTheme("dark"));
if (btnThemeLight) btnThemeLight.addEventListener("click", () => applyTheme("light"));

initTheme();

// ==========================================================================
// 3. TOASTS & ALERTAS VISUAIS
// ==========================================================================
const dashboardAlert = document.getElementById("dashboardAlert");
let alertTimeout = null;

function showAlert(message, type = "info", duration = 4000) {
  if (!dashboardAlert) return;

  if (alertTimeout) clearTimeout(alertTimeout);

  const icons = {
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  };

  dashboardAlert.className = `alert alert-${type}`;
  dashboardAlert.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
  dashboardAlert.style.display = "flex";

  alertTimeout = setTimeout(() => {
    dashboardAlert.style.display = "none";
  }, duration);
}

// ==========================================================================
// 4. CONTROLE DE SIDEBAR & NAVEGAÇÃO ENTRE SEÇÕES
// ==========================================================================
const sidebar = document.getElementById("sidebar");
const btnToggleSidebar = document.getElementById("btnToggleSidebar");

// Sidebar Collapse / Expand (PC)
const SIDEBAR_STATE_KEY = "veu-rpg-sidebar-collapsed";
if (sidebar) {
  const isSavedCollapsed = localStorage.getItem(SIDEBAR_STATE_KEY) === "true";
  if (isSavedCollapsed) {
    sidebar.classList.add("collapsed");
  }
}

if (btnToggleSidebar && sidebar) {
  btnToggleSidebar.addEventListener("click", () => {
    const isNowCollapsed = sidebar.classList.toggle("collapsed");
    localStorage.setItem(SIDEBAR_STATE_KEY, isNowCollapsed ? "true" : "false");
  });
}

// Alternância de Seções (Campanhas, Perfil, Configurações, Detalhe)
function switchSection(sectionId) {
  if (sectionId !== "campaign-detail") {
    cleanupCampaignListeners();
  }

  // Esconde todas as seções
  document.querySelectorAll(".dash-section").forEach((sec) => {
    sec.classList.remove("active");
  });

  // Mostra a seção desejada
  const targetSec = document.getElementById(`section-${sectionId}`);
  if (targetSec) {
    targetSec.classList.add("active");
  }

  // Atualiza botões ativos na Sidebar (PC) e Bottom Nav (Mobile)
  document.querySelectorAll("[data-section]").forEach((btn) => {
    const isTarget = btn.getAttribute("data-section") === sectionId;
    btn.classList.toggle("active", isTarget);
  });

  // Rola suavemente para o topo do conteúdo
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Listeners de navegação (PC & Mobile)
document.querySelectorAll("[data-section]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const section = btn.getAttribute("data-section");
    if (section) switchSection(section);
  });
});

// Botão Voltar para Campanhas
const btnBackToCampaigns = document.getElementById("btnBackToCampaigns");
if (btnBackToCampaigns) {
  btnBackToCampaigns.addEventListener("click", () => {
    cleanupCampaignListeners();
    switchSection("campaigns");
  });
}

// ==========================================================================
// 5. CONTROLE DE MODAIS (CRIAR E ENTRAR)
// ==========================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    // Foco no primeiro input
    const input = modal.querySelector("input:not([type=hidden])");
    if (input) input.focus();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    const form = modal.querySelector("form");
    if (form) form.reset();
    // Reseta preview de capa se for modal de criação
    if (modalId === "modalCreateCampaign") {
      resetCoverPreview();
    }
  }
}

// Botões para abrir modais
const btnOpenCreateCampaign = document.getElementById("btnOpenCreateCampaign");
const btnOpenJoinCampaign = document.getElementById("btnOpenJoinCampaign");

if (btnOpenCreateCampaign) {
  btnOpenCreateCampaign.addEventListener("click", () => openModal("modalCreateCampaign"));
}

if (btnOpenJoinCampaign) {
  btnOpenJoinCampaign.addEventListener("click", () => openModal("modalJoinCampaign"));
}

// Botões para fechar modais
document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const modalId = btn.getAttribute("data-close-modal");
    if (modalId) closeModal(modalId);
  });
});

// Fechar ao clicar no overlay escuro fora do box
document.querySelectorAll(".modal-overlay").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal(modal.id);
    }
  });
});

// Fechar com a tecla Escape
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay.active").forEach((m) => closeModal(m.id));
  }
});

// ==========================================================================
// 6. FORMULÁRIO CRIAR CAMPANHA (PREVIEW E SELEÇÃO DE SISTEMA)
// ==========================================================================
const coverInput = document.getElementById("createCampaignCover");
const coverPreviewImg = document.getElementById("coverPreviewImg");
const coverPreviewPlaceholder = document.getElementById("coverPreviewPlaceholder");

function resetCoverPreview() {
  if (coverPreviewImg) {
    coverPreviewImg.src = "";
    coverPreviewImg.style.display = "none";
  }
  if (coverPreviewPlaceholder) {
    coverPreviewPlaceholder.style.display = "block";
  }
}

if (coverInput) {
  coverInput.addEventListener("input", () => {
    const url = coverInput.value.trim();
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      coverPreviewImg.src = url;
      coverPreviewImg.onload = () => {
        coverPreviewImg.style.display = "block";
        coverPreviewPlaceholder.style.display = "none";
      };
      coverPreviewImg.onerror = () => {
        resetCoverPreview();
      };
    } else {
      resetCoverPreview();
    }
  });
}

// Upload de imagem de capa do dispositivo com Cropper
const btnUploadCampaignCover = document.getElementById("btnUploadCampaignCover");
const campaignCoverFileInput = document.getElementById("campaignCoverFileInput");

if (btnUploadCampaignCover && campaignCoverFileInput) {
  btnUploadCampaignCover.addEventListener("click", () => {
    campaignCoverFileInput.value = "";
    campaignCoverFileInput.click();
  });

  campaignCoverFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      openCoverCropper(file, (dataUrl) => {
        if (coverInput) coverInput.value = dataUrl;
        if (coverPreviewImg) {
          coverPreviewImg.src = dataUrl;
          coverPreviewImg.style.display = "block";
        }
        if (coverPreviewPlaceholder) {
          coverPreviewPlaceholder.style.display = "none";
        }
      });
    }
  });
}

// Arrastar e soltar (drag & drop) ou clique direto no preview
if (coverPreviewContainer) {
  coverPreviewContainer.addEventListener("click", () => {
    if (campaignCoverFileInput) {
      campaignCoverFileInput.value = "";
      campaignCoverFileInput.click();
    }
  });

  coverPreviewContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    coverPreviewContainer.style.borderColor = "var(--accent-primary)";
    coverPreviewContainer.style.background = "var(--glass-bg-hover)";
  });

  coverPreviewContainer.addEventListener("dragleave", () => {
    coverPreviewContainer.style.borderColor = "";
    coverPreviewContainer.style.background = "";
  });

  coverPreviewContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    coverPreviewContainer.style.borderColor = "";
    coverPreviewContainer.style.background = "";
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      openCoverCropper(file, (dataUrl) => {
        if (coverInput) coverInput.value = dataUrl;
        if (coverPreviewImg) {
          coverPreviewImg.src = dataUrl;
          coverPreviewImg.style.display = "block";
        }
        if (coverPreviewPlaceholder) {
          coverPreviewPlaceholder.style.display = "none";
        }
      });
    }
  });
}

// Alternância visual dos rádios de Sistema
document.querySelectorAll("input[name='campaignSystem']").forEach((radio) => {
  radio.addEventListener("change", () => {
    document.querySelectorAll(".system-radio-card").forEach((card) => card.classList.remove("selected"));
    const parentLabel = radio.closest(".system-radio-card");
    if (parentLabel) parentLabel.classList.add("selected");
  });
});

/**
 * Gera código único de convite de 6 caracteres alfanuméricos maiúsculos (ex: VEU7K2)
 */
async function generateUniqueInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem letras/números ambíguos
  let isUnique = false;
  let code = "";

  while (!isUnique) {
    code = "VEU";
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Valida se o código já existe no Firestore
    const q = query(collection(db, "campaigns"), where("inviteCode", "==", code));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      isUnique = true;
    }
  }

  return code;
}

// Submit: Criar Campanha
const formCreateCampaign = document.getElementById("formCreateCampaign");
const btnSubmitCreateCampaign = document.getElementById("btnSubmitCreateCampaign");

if (formCreateCampaign) {
  formCreateCampaign.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const name = document.getElementById("createCampaignName").value.trim();
    const systemRadio = document.querySelector("input[name='campaignSystem']:checked");
    const system = systemRadio ? systemRadio.value : "Sistema A";
    let coverUrl = coverInput.value.trim() || DEFAULT_COVER_URL;

    if (!name) {
      showAlert("Por favor, informe o nome da campanha.", "error");
      return;
    }

    try {
      btnSubmitCreateCampaign.disabled = true;
      btnSubmitCreateCampaign.innerHTML = `<span class="btn-spinner"></span> <span>Forjando...</span>`;

      // 1. Gera código único de 6 caracteres
      const inviteCode = await generateUniqueInviteCode();

      // 2. Monta o objeto da campanha
      const newCampaign = {
        name: name,
        system: system,
        coverUrl: coverUrl,
        inviteCode: inviteCode,
        masterId: currentUser.uid,
        masterName: currentUser.displayName || currentUser.email.split("@")[0],
        masterEmail: currentUser.email,
        players: [currentUser.uid],
        playerDetails: [
          {
            uid: currentUser.uid,
            name: currentUser.displayName || currentUser.email.split("@")[0],
            email: currentUser.email,
            role: "master",
            joinedAt: new Date().toISOString()
          }
        ],
        createdAt: serverTimestamp()
      };

      // 3. Salva no Cloud Firestore na coleção "campaigns"
      await addDoc(collection(db, "campaigns"), newCampaign);

      showAlert(`Campanha "${name}" forjada com sucesso! Código: ${inviteCode}`, "success");
      closeModal("modalCreateCampaign");
    } catch (error) {
      console.error("Erro ao criar campanha:", error);
      showAlert("Não foi possível criar a campanha. Tente novamente.", "error");
    } finally {
      btnSubmitCreateCampaign.disabled = false;
      btnSubmitCreateCampaign.innerHTML = `<span>Criar Campanha</span>`;
    }
  });
}

// ==========================================================================
// 7. FORMULÁRIO ENTRAR EM CAMPANHA (VIA CÓDIGO)
// ==========================================================================
const formJoinCampaign = document.getElementById("formJoinCampaign");
const btnSubmitJoinCampaign = document.getElementById("btnSubmitJoinCampaign");

if (formJoinCampaign) {
  formJoinCampaign.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const inputCode = document.getElementById("joinInviteCode").value.trim().toUpperCase();

    if (!inputCode || inputCode.length < 6) {
      showAlert("Digite um código de convite válido de 6 caracteres.", "error");
      return;
    }

    try {
      btnSubmitJoinCampaign.disabled = true;
      btnSubmitJoinCampaign.innerHTML = `<span class="btn-spinner"></span> <span>Buscando...</span>`;

      // 1. Busca campanha pelo código de convite no Firestore
      const q = query(collection(db, "campaigns"), where("inviteCode", "==", inputCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showAlert("Nenhuma crônica encontrada com este código de convite.", "error");
        return;
      }

      const campaignDoc = querySnapshot.docs[0];
      const campaignData = campaignDoc.data();

      // 2. Verifica se o usuário já participa da campanha
      const alreadyIn = Array.isArray(campaignData.players) && campaignData.players.includes(currentUser.uid);
      if (alreadyIn || campaignData.masterId === currentUser.uid) {
        showAlert(`Você já é um membro da campanha "${campaignData.name}"!`, "info");
        closeModal("modalJoinCampaign");
        return;
      }

      // 3. Adiciona o usuário aos players da campanha
      const newPlayerObj = {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email.split("@")[0],
        email: currentUser.email,
        role: "player",
        joinedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, "campaigns", campaignDoc.id), {
        players: arrayUnion(currentUser.uid),
        playerDetails: arrayUnion(newPlayerObj)
      });

      showAlert(`Sucesso! Você ingressou na campanha "${campaignData.name}".`, "success");
      closeModal("modalJoinCampaign");
    } catch (error) {
      console.error("Erro ao entrar na campanha:", error);
      showAlert("Erro ao tentar ingressar na campanha. Verifique sua conexão.", "error");
    } finally {
      btnSubmitJoinCampaign.disabled = false;
      btnSubmitJoinCampaign.innerHTML = `<span>Ingressar</span>`;
    }
  });
}

// ==========================================================================
// 8. LISTAGEM EM TEMPO REAL DAS CAMPANHAS (GRID)
// ==========================================================================
const campaignsGrid = document.getElementById("campaignsGrid");

function listenToUserCampaigns(userId) {
  if (unsubscribeCampaigns) unsubscribeCampaigns();

  // Consulta campanhas onde o usuário participa (master ou player)
  const q = query(
    collection(db, "campaigns"),
    where("players", "array-contains", userId)
  );

  unsubscribeCampaigns = onSnapshot(
    q,
    (snapshot) => {
      renderCampaignsGrid(snapshot.docs);
    },
    (error) => {
      console.error("Erro ao escutar campanhas:", error);
      campaignsGrid.innerHTML = `
        <div class="empty-campaigns glass-panel">
          <p style="color: var(--color-error);">Erro ao carregar campanhas. Verifique suas regras de segurança do Firestore.</p>
        </div>
      `;
    }
  );
}

function renderCampaignsGrid(docs) {
  if (!campaignsGrid) return;

  if (docs.length === 0) {
    campaignsGrid.innerHTML = `
      <div class="empty-campaigns glass-panel">
        <div class="empty-campaigns-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <h3>Nenhuma Crônica Ativa</h3>
        <p>Você ainda não participa de nenhuma campanha no Véu RPG. Comece forjando um novo mundo ou entre com o código de uma mesa.</p>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="document.getElementById('btnOpenCreateCampaign').click()">
            Criar Campanha
          </button>
          <button class="btn btn-ghost" onclick="document.getElementById('btnOpenJoinCampaign').click()">
            Entrar com Código
          </button>
        </div>
      </div>
    `;
    return;
  }

  campaignsGrid.innerHTML = "";

  docs.forEach((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;
    const isMaster = data.masterId === currentUser.uid;
    const roleBadgeText = isMaster ? "Mestre" : "Jogador";
    const roleBadgeClass = isMaster ? "badge-master" : "badge-player";
    const cover = data.coverUrl || DEFAULT_COVER_URL;
    const playerCount = data.players ? data.players.length : 1;

    const card = document.createElement("article");
    card.className = "campaign-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Gerenciar campanha ${data.name}`);

    card.innerHTML = `
      <img src="${cover}" alt="Capa da Campanha" class="campaign-card-bg" onerror="this.src='${DEFAULT_COVER_URL}'">
      <div class="campaign-card-overlay"></div>
      
      <div class="campaign-card-content">
        <div class="campaign-card-top">
          <span class="badge-tag ${roleBadgeClass}">${roleBadgeText}</span>
          <span class="badge-tag badge-system">${data.system || "Sistema A"}</span>
        </div>

        <div class="campaign-card-bottom">
          <h3 class="campaign-card-title">${escapeHtml(data.name)}</h3>
          <div class="campaign-card-meta">
            <span>👥 ${playerCount} ${playerCount === 1 ? "membro" : "membros"}</span>
            <span class="campaign-code-pill" title="Código de convite">🔑 ${data.inviteCode}</span>
          </div>
        </div>
      </div>
    `;

    // Ação: Ao clicar no card, abrir o painel de gerenciamento daquela campanha
    const openDetail = () => {
      openCampaignDetail({ id, ...data });
    };

    card.addEventListener("click", openDetail);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDetail();
      }
    });

    campaignsGrid.appendChild(card);
  });
}

// ==========================================================================
// 9. PAINEL DE GERENCIAMENTO DA CAMPANHA (FASE 3 - WORKSPACE)
// ==========================================================================
function openCampaignDetail(campaign) {
  currentCampaignDetail = campaign;
  initCampaignWorkspace(campaign, currentUser, switchSection, showAlert);
}

// ==========================================================================
// 10. SEÇÃO DE PERFIL & AVATAR CROPPER
// ==========================================================================
const sidebarUserAvatar = document.getElementById("sidebarUserAvatar");
const sidebarUserName = document.getElementById("sidebarUserName");
const sidebarUserEmail = document.getElementById("sidebarUserEmail");

const profileAvatar = document.getElementById("profileAvatar");
const btnChangeAvatar = document.getElementById("btnChangeAvatar");
const btnUploadAvatarText = document.getElementById("btnUploadAvatarText");
const avatarFileInput = document.getElementById("avatarFileInput");

const profileDisplayHeading = document.getElementById("profileDisplayHeading");
const profileEmailSubtitle = document.getElementById("profileEmailSubtitle");
const profileEmail = document.getElementById("profileEmail");
const profileDisplayName = document.getElementById("profileDisplayName");
const formUpdateProfile = document.getElementById("formUpdateProfile");
const btnSaveProfile = document.getElementById("btnSaveProfile");
const btnSendPasswordReset = document.getElementById("btnSendPasswordReset");

// Renderizador unificado de Avatar (com suporte a imagem ou letra inicial)
function renderAvatar(avatarElem, photoUrl, name) {
  if (!avatarElem) return;
  if (photoUrl) {
    avatarElem.innerHTML = `<img src="${photoUrl}" alt="Avatar" class="avatar-img">`;
  } else {
    avatarElem.textContent = (name || "A").charAt(0).toUpperCase();
  }
}

function updateAllAvatars(photoUrl, name) {
  renderAvatar(sidebarUserAvatar, photoUrl, name);
  renderAvatar(profileAvatar, photoUrl, name);
}

function populateProfile(user, customPhotoUrl = null) {
  const name = user.displayName || user.email.split("@")[0];
  const photo = customPhotoUrl || user.photoURL || null;

  // Sidebar
  renderAvatar(sidebarUserAvatar, photo, name);
  if (sidebarUserName) sidebarUserName.textContent = name;
  if (sidebarUserEmail) sidebarUserEmail.textContent = user.email;

  // Profile Section
  renderAvatar(profileAvatar, photo, name);
  if (profileDisplayHeading) profileDisplayHeading.textContent = name;
  if (profileEmailSubtitle) profileEmailSubtitle.textContent = user.email;
  if (profileEmail) profileEmail.value = user.email;
  if (profileDisplayName) profileDisplayName.value = user.displayName || "";
}

// --------------------------------------------------------------------------
// MOTOR DO CROPPER DE AVATAR (VANILLA HTML5 CANVAS)
// --------------------------------------------------------------------------
const cropCanvas = document.getElementById("cropCanvas");
const zoomSlider = document.getElementById("zoomSlider");
const btnZoomIn = document.getElementById("btnZoomIn");
const btnZoomOut = document.getElementById("btnZoomOut");
const btnResetCrop = document.getElementById("btnResetCrop");
const btnSaveCrop = document.getElementById("btnSaveCrop");

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

// O círculo tem diâmetro 220px, centrado no canvas 280x280 (cx: 140, cy: 140, raio: 110)
const CANVAS_SIZE = 280;
const CROP_CENTER = 140;
const CROP_RADIUS = 110;
const CROP_DIAMETER = 220;
const CROP_MIN = CROP_CENTER - CROP_RADIUS; // 30
const CROP_MAX = CROP_CENTER + CROP_RADIUS; // 250

function setupCropper(img) {
  loadedImg = img;
  // A escala mínima garante que a imagem preenche totalmente o círculo de 220px
  minScale = Math.max(CROP_DIAMETER / img.width, CROP_DIAMETER / img.height);
  currentScale = minScale;
  if (zoomSlider) zoomSlider.value = "1";

  // Centraliza inicialmente a imagem
  offsetX = CROP_CENTER - (img.width * currentScale) / 2;
  offsetY = CROP_CENTER - (img.height * currentScale) / 2;

  clampOffsets();
  drawCropCanvas();
}

function clampOffsets() {
  if (!loadedImg) return;
  const w = loadedImg.width * currentScale;
  const h = loadedImg.height * currentScale;

  // Garante que a imagem cobre toda a área útil do círculo (de 30 a 250)
  if (offsetX > CROP_MIN) offsetX = CROP_MIN;
  if (offsetX + w < CROP_MAX) offsetX = CROP_MAX - w;
  if (offsetY > CROP_MIN) offsetY = CROP_MIN;
  if (offsetY + h < CROP_MAX) offsetY = CROP_MAX - h;
}

function drawCropCanvas() {
  if (!cropCanvas) return;
  const ctx = cropCanvas.getContext("2d");
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Fundo escuro
  ctx.fillStyle = "#06070a";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  if (loadedImg) {
    ctx.drawImage(
      loadedImg,
      offsetX,
      offsetY,
      loadedImg.width * currentScale,
      loadedImg.height * currentScale
    );
  }

  // Máscara escura fora do círculo (Liquid Glass Cutout)
  ctx.save();
  ctx.fillStyle = "rgba(6, 8, 14, 0.72)";
  ctx.beginPath();
  ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  // Recorte circular anti-horário
  ctx.arc(CROP_CENTER, CROP_CENTER, CROP_RADIUS, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();

  // Borda brilhante com a cor de destaque (accent-primary)
  ctx.save();
  ctx.strokeStyle = "rgba(139, 92, 246, 0.9)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(CROP_CENTER, CROP_CENTER, CROP_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // Linhas guia de terços
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  const step = CROP_DIAMETER / 3;
  ctx.beginPath();
  ctx.moveTo(CROP_MIN, CROP_MIN + step);
  ctx.lineTo(CROP_MAX, CROP_MIN + step);
  ctx.moveTo(CROP_MIN, CROP_MIN + step * 2);
  ctx.lineTo(CROP_MAX, CROP_MIN + step * 2);
  ctx.moveTo(CROP_MIN + step, CROP_MIN);
  ctx.lineTo(CROP_MIN + step, CROP_MAX);
  ctx.moveTo(CROP_MIN + step * 2, CROP_MIN);
  ctx.lineTo(CROP_MIN + step * 2, CROP_MAX);
  ctx.stroke();
  ctx.restore();
}

function applyZoom(zoomMultiplier) {
  if (!loadedImg) return;
  const clampedZoom = Math.min(Math.max(zoomMultiplier, 1), 3);

  // Mantém o centro do círculo focado ao dar zoom
  const centerImgX = (CROP_CENTER - offsetX) / currentScale;
  const centerImgY = (CROP_CENTER - offsetY) / currentScale;

  currentScale = minScale * clampedZoom;
  offsetX = CROP_CENTER - centerImgX * currentScale;
  offsetY = CROP_CENTER - centerImgY * currentScale;

  clampOffsets();
  drawCropCanvas();

  if (zoomSlider) zoomSlider.value = clampedZoom.toFixed(2);
}

// Eventos de Zoom
if (zoomSlider) {
  zoomSlider.addEventListener("input", () => {
    applyZoom(parseFloat(zoomSlider.value));
  });
}

if (btnZoomIn) {
  btnZoomIn.addEventListener("click", () => {
    const val = parseFloat(zoomSlider.value) + 0.15;
    applyZoom(val);
  });
}

if (btnZoomOut) {
  btnZoomOut.addEventListener("click", () => {
    const val = parseFloat(zoomSlider.value) - 0.15;
    applyZoom(val);
  });
}

if (btnResetCrop) {
  btnResetCrop.addEventListener("click", () => {
    if (loadedImg) setupCropper(loadedImg);
  });
}

// Eventos de Arrastar (Mouse & Touch)
if (cropCanvas) {
  // Mouse
  cropCanvas.addEventListener("mousedown", (e) => {
    if (!loadedImg) return;
    isDragging = true;
    startDragX = e.clientX;
    startDragY = e.clientY;
    initialOffsetX = offsetX;
    initialOffsetY = offsetY;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging || !loadedImg) return;
    const dx = e.clientX - startDragX;
    const dy = e.clientY - startDragY;
    offsetX = initialOffsetX + dx;
    offsetY = initialOffsetY + dy;
    clampOffsets();
    drawCropCanvas();
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Touch
  cropCanvas.addEventListener("touchstart", (e) => {
    if (!loadedImg || e.touches.length === 0) return;
    isDragging = true;
    startDragX = e.touches[0].clientX;
    startDragY = e.touches[0].clientY;
    initialOffsetX = offsetX;
    initialOffsetY = offsetY;
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (!isDragging || !loadedImg || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - startDragX;
    const dy = e.touches[0].clientY - startDragY;
    offsetX = initialOffsetX + dx;
    offsetY = initialOffsetY + dy;
    clampOffsets();
    drawCropCanvas();
  }, { passive: true });

  window.addEventListener("touchend", () => {
    isDragging = false;
  });

  // Roda do mouse para zoom
  cropCanvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (!loadedImg || !zoomSlider) return;
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    applyZoom(parseFloat(zoomSlider.value) + delta);
  }, { passive: false });
}

// Abertura do seletor de arquivos
function triggerAvatarFileInput() {
  if (avatarFileInput) {
    avatarFileInput.value = "";
    avatarFileInput.click();
  }
}

if (btnChangeAvatar) {
  btnChangeAvatar.addEventListener("click", triggerAvatarFileInput);
  btnChangeAvatar.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      triggerAvatarFileInput();
    }
  });
}

if (btnUploadAvatarText) {
  btnUploadAvatarText.addEventListener("click", triggerAvatarFileInput);
}

if (avatarFileInput) {
  avatarFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAlert("Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).", "error");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showAlert("A imagem é muito grande. Escolha uma foto de até 8MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setupCropper(img);
        openModal("modalCropAvatar");
      };
      img.onerror = () => {
        showAlert("Erro ao carregar a imagem. Tente outro arquivo.", "error");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Salvar corte do avatar
if (btnSaveCrop) {
  btnSaveCrop.addEventListener("click", async () => {
    if (!loadedImg || !currentUser) return;

    try {
      btnSaveCrop.disabled = true;
      btnSaveCrop.innerHTML = `<span class="btn-spinner"></span> <span>Processando...</span>`;

      // Exporta em JPEG otimizado (200x200 para avatar nítido e leve)
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = 200;
      exportCanvas.height = 200;
      const expCtx = exportCanvas.getContext("2d");

      // Coordenadas de origem da imagem
      const srcX = (CROP_MIN - offsetX) / currentScale;
      const srcY = (CROP_MIN - offsetY) / currentScale;
      const srcSize = CROP_DIAMETER / currentScale;

      expCtx.drawImage(
        loadedImg,
        srcX,
        srcY,
        srcSize,
        srcSize,
        0,
        0,
        200,
        200
      );

      const dataUrl = exportCanvas.toDataURL("image/jpeg", 0.85);

      // 1. Salva no cache local para carregamento instantâneo
      try {
        localStorage.setItem(`veu_avatar_${currentUser.uid}`, dataUrl);
      } catch (storageErr) {
        console.warn("Aviso ao salvar no storage local:", storageErr);
      }

      // 2. Salva no Cloud Firestore
      try {
        await setDoc(
          doc(db, "users", currentUser.uid),
          { photoURL: dataUrl, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch (firestoreErr) {
        console.warn("Aviso ao salvar foto no Firestore:", firestoreErr);
      }

      // 3. Atualiza na interface imediatamente
      updateAllAvatars(dataUrl, currentUser.displayName || currentUser.email);
      closeModal("modalCropAvatar");
      showAlert("Foto de perfil atualizada com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao processar foto de perfil:", error);
      showAlert("Não foi possível processar a imagem. Tente novamente.", "error");
    } finally {
      btnSaveCrop.disabled = false;
      btnSaveCrop.innerHTML = `<span>Salvar Foto</span>`;
    }
  });
}

// Atualizar nome de exibição
if (formUpdateProfile) {
  formUpdateProfile.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const newName = profileDisplayName.value.trim();
    if (!newName) {
      showAlert("Por favor, digite um nome válido.", "error");
      return;
    }

    try {
      btnSaveProfile.disabled = true;
      btnSaveProfile.innerHTML = `<span class="btn-spinner"></span> <span>Salvando...</span>`;

      // 1. Atualiza no Auth
      await updateProfile(currentUser, { displayName: newName });

      // 2. Atualiza no Firestore (documento do usuário)
      try {
        await setDoc(
          doc(db, "users", currentUser.uid),
          { displayName: newName, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch (err) {
        console.warn("Aviso ao atualizar perfil no Firestore:", err);
      }

      populateProfile(currentUser);
      showAlert("Nome de exibição atualizado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      showAlert("Não foi possível atualizar o nome. Tente novamente.", "error");
    } finally {
      btnSaveProfile.disabled = false;
      btnSaveProfile.innerHTML = `<span>Salvar Alterações</span>`;
    }
  });
}

// Enviar e-mail de redefinição de senha
if (btnSendPasswordReset) {
  btnSendPasswordReset.addEventListener("click", async () => {
    if (!currentUser || !currentUser.email) return;

    try {
      btnSendPasswordReset.disabled = true;
      await sendPasswordResetEmail(auth, currentUser.email);
      showAlert(`Link de redefinição enviado com sucesso para ${currentUser.email}!`, "success");
    } catch (error) {
      console.error("Erro ao enviar redefinição de senha:", error);
      showAlert("Erro ao solicitar redefinição. Tente mais tarde.", "error");
    } finally {
      btnSendPasswordReset.disabled = false;
    }
  });
}

// ==========================================================================
// 11. LOGOUT
// ==========================================================================
async function handleLogout() {
  try {
    if (unsubscribeCampaigns) unsubscribeCampaigns();
    await signOut(auth);
    window.location.href = "index.html?logout=true";
  } catch (error) {
    console.error("Erro ao deslogar:", error);
  }
}

const btnSidebarLogout = document.getElementById("btnSidebarLogout");
const btnMobileLogout = document.getElementById("btnMobileLogout");

if (btnSidebarLogout) btnSidebarLogout.addEventListener("click", handleLogout);
if (btnMobileLogout) btnMobileLogout.addEventListener("click", handleLogout);

// ==========================================================================
// 12. VERIFICAÇÃO DE AUTENTICAÇÃO (AUTH GUARD)
// ==========================================================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Se não houver usuário logado, redireciona para index.html
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  // 1. Carrega do cache local primeiro para renderização instantânea
  let userPhoto = localStorage.getItem(`veu_avatar_${user.uid}`) || user.photoURL || null;
  populateProfile(user, userPhoto);

  // 2. Busca do Firestore para sincronização
  try {
    const userDocSnap = await getDoc(doc(db, "users", user.uid));
    if (userDocSnap.exists() && userDocSnap.data().photoURL) {
      userPhoto = userDocSnap.data().photoURL;
      localStorage.setItem(`veu_avatar_${user.uid}`, userPhoto);
      populateProfile(user, userPhoto);
    }
  } catch (err) {
    console.warn("Aviso ao buscar foto no Firestore:", err);
  }

  listenToUserCampaigns(user.uid);
});

// Helper de escape HTML para evitar injeções
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

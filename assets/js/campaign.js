/**
 * Véu RPG - Módulo da Campanha (assets/js/campaign.js)
 * Gerencia Visão do Mestre, Visão do Jogador, Fichas, Escudo do Mestre,
 * Iniciativa, Compendium, Duplicação e Configurações da Campanha.
 */

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayRemove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { openCoverCropper } from "./cover-cropper.js";

// ==========================================================================
// 1. ESTADO DA CAMPANHA ATIVA
// ==========================================================================
let activeCampaign = null;
let currentAuthUser = null;
let isMasterUser = false;

// Listeners unsubscribe handles
let unsubSheets = null;
let unsubNpcs = null;
let unsubCompendium = null;
let unsubCampaignDoc = null;

// Armazenamento em memória para iniciativa e compendium
let campaignSheetsCache = [];
let campaignNpcsCache = [];
let campaignCompendiumCache = [];
let initiativeList = [];
let currentTurnIndex = 0;

// ==========================================================================
// 2. ELEMENTOS DO DOM (CAMPANHA)
// ==========================================================================
const detailCoverImg = document.getElementById("detailCoverImg");
const detailTitle = document.getElementById("detailTitle");
const detailSystemBadge = document.getElementById("detailSystemBadge");
const detailRoleBadge = document.getElementById("detailRoleBadge");
const detailMasterInfo = document.getElementById("detailMasterInfo");
const detailInviteCode = document.getElementById("detailInviteCode");
const btnCopyInviteCode = document.getElementById("btnCopyInviteCode");

if (btnCopyInviteCode) {
  btnCopyInviteCode.addEventListener("click", () => {
    if (activeCampaign && activeCampaign.inviteCode) {
      navigator.clipboard.writeText(activeCampaign.inviteCode).then(() => {
        showToast(`Código "${activeCampaign.inviteCode}" copiado para a área de transferência!`, "success");
      }).catch(() => {
        showToast(`Código: ${activeCampaign.inviteCode}`, "info");
      });
    }
  });
}

// Abas da Campanha
const campTabButtons = document.querySelectorAll(".camp-tab-btn");
const campTabPanels = document.querySelectorAll(".camp-tab-panel");
const gmOnlyElements = document.querySelectorAll(".gm-only");

// Fichas
const sheetsGrid = document.getElementById("sheetsGrid");
const btnOpenCreateSheet = document.getElementById("btnOpenCreateSheet");
const modalCreateSheet = document.getElementById("modalCreateSheet");
const formCreateSheet = document.getElementById("formCreateSheet");
const sheetAssignPlayerGroup = document.getElementById("sheetAssignPlayerGroup");
const sheetAssignPlayerSelect = document.getElementById("sheetAssignPlayerSelect");

// Jogadores
const campPlayersList = document.getElementById("campPlayersList");

// Escudo do Mestre
const gmVitalsGrid = document.getElementById("gmVitalsGrid");
const npcsGrid = document.getElementById("npcsGrid");
const btnOpenCreateNPC = document.getElementById("btnOpenCreateNPC");
const formCreateNPC = document.getElementById("formCreateNPC");

// Iniciativa
const initiativeItemsList = document.getElementById("initiativeItemsList");
const btnRollAllInitiatives = document.getElementById("btnRollAllInitiatives");
const btnNextTurn = document.getElementById("btnNextTurn");
const btnPrevTurn = document.getElementById("btnPrevTurn");
const btnClearInitiative = document.getElementById("btnClearInitiative");
const btnAddCombatant = document.getElementById("btnAddCombatant");
const formAddCombatant = document.getElementById("formAddCombatant");
const currentTurnBadge = document.getElementById("currentTurnBadge");

// Compendium
const compendiumGrid = document.getElementById("compendiumGrid");
const compendiumSearch = document.getElementById("compendiumSearch");
const compendiumFilters = document.querySelectorAll(".filter-pill");
const btnOpenCreateCompendium = document.getElementById("btnOpenCreateCompendium");
const formCreateCompendium = document.getElementById("formCreateCompendium");
let currentCompendiumFilter = "todos";

// Configurações e Duplicação
const formCampaignSettings = document.getElementById("formCampaignSettings");
const campSettingsName = document.getElementById("campSettingsName");
const campSettingsCover = document.getElementById("campSettingsCover");
const btnUploadCampSettingsCover = document.getElementById("btnUploadCampSettingsCover");
const campSettingsCoverFileInput = document.getElementById("campSettingsCoverFileInput");
const campSettingsSystemA = document.getElementById("campSettingsSystemA");
const campSettingsSystemB = document.getElementById("campSettingsSystemB");
const btnOpenDuplicate = document.getElementById("btnOpenDuplicate");
const formDuplicateCampaign = document.getElementById("formDuplicateCampaign");
const duplicateCampaignName = document.getElementById("duplicateCampaignName");
const btnOpenDeleteCampaign = document.getElementById("btnOpenDeleteCampaign");
const formDeleteCampaign = document.getElementById("formDeleteCampaign");
const confirmCampaignNameInput = document.getElementById("confirmCampaignNameInput");

// ==========================================================================
// 3. INICIALIZAÇÃO DO WORKSPACE DA CAMPANHA
// ==========================================================================
export function initCampaignWorkspace(campaign, user, switchSectionCallback, showAlertCallback) {
  // Limpa ouvintes anteriores
  cleanupCampaignListeners();

  activeCampaign = campaign;
  currentAuthUser = user;
  isMasterUser = campaign.masterId === user.uid;

  // Atualiza banner superior da campanha
  if (detailCoverImg) detailCoverImg.src = campaign.coverUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop";
  if (detailTitle) detailTitle.textContent = campaign.name;
  if (detailSystemBadge) detailSystemBadge.textContent = campaign.system || "Sistema A";

  if (detailRoleBadge) {
    detailRoleBadge.textContent = isMasterUser ? "Mestre" : "Jogador";
    detailRoleBadge.className = `badge-tag ${isMasterUser ? "badge-master" : "badge-player"}`;
  }

  if (detailMasterInfo) {
    detailMasterInfo.textContent = `Mestre da Mesa: ${campaign.masterName || "Mestre"} (${campaign.masterEmail || ""})`;
  }

  if (detailInviteCode) {
    detailInviteCode.textContent = campaign.inviteCode || "------";
  }

  // Controle de permissão de abas: mostra/oculta recursos exclusivos do Mestre
  gmOnlyElements.forEach((el) => {
    el.style.display = isMasterUser ? "" : "none";
  });

  // Ativa a primeira aba disponível (Fichas)
  switchCampTab("sheets");

  // Inicia escutas em tempo real das subcoleções
  listenCampaignDoc(campaign.id);
  listenSheets(campaign.id);
  listenPlayers();
  if (isMasterUser) {
    listenNpcs(campaign.id);
  }
  listenCompendium(campaign.id);
  populateCampaignSettings(campaign);

  // Alterna a tela para a visão de detalhes
  if (switchSectionCallback) {
    switchSectionCallback("campaign-detail");
  }
}

export function cleanupCampaignListeners() {
  if (unsubSheets) unsubSheets();
  if (unsubNpcs) unsubNpcs();
  if (unsubCompendium) unsubCompendium();
  if (unsubCampaignDoc) unsubCampaignDoc();

  campaignSheetsCache = [];
  campaignNpcsCache = [];
  campaignCompendiumCache = [];
  initiativeList = [];
  currentTurnIndex = 0;
}

// Escuta atualizações do documento pai da campanha em tempo real
function listenCampaignDoc(campaignId) {
  unsubCampaignDoc = onSnapshot(doc(db, "campaigns", campaignId), (docSnap) => {
    if (!docSnap.exists()) return;
    activeCampaign = { id: docSnap.id, ...docSnap.data() };
    if (detailTitle) detailTitle.textContent = activeCampaign.name;
    if (detailSystemBadge) detailSystemBadge.textContent = activeCampaign.system;
    if (detailCoverImg) detailCoverImg.src = activeCampaign.coverUrl;
    listenPlayers();
  });
}

// ==========================================================================
// 4. CONTROLE DE ABAS INTERNAS DA CAMPANHA
// ==========================================================================
function switchCampTab(tabId) {
  campTabButtons.forEach((btn) => {
    const isTarget = btn.getAttribute("data-camptab") === tabId;
    btn.classList.toggle("active", isTarget);
  });

  campTabPanels.forEach((panel) => {
    const isTarget = panel.id === `campTab-${tabId}`;
    panel.classList.toggle("active", isTarget);
  });
}

campTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-camptab");
    if (target) switchCampTab(target);
  });
});

// ==========================================================================
// 5. ABA 1: FICHAS (SHEETS)
// ==========================================================================
function listenSheets(campaignId) {
  const q = query(
    collection(db, "campaigns", campaignId, "sheets"),
    orderBy("createdAt", "desc")
  );

  unsubSheets = onSnapshot(q, (snapshot) => {
    campaignSheetsCache = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderSheets();
    if (isMasterUser) {
      renderGmVitalsHud();
    }
  }, (err) => {
    console.warn("Aviso ao escutar fichas:", err);
  });
}

function renderSheets() {
  if (!sheetsGrid) return;
  sheetsGrid.innerHTML = "";

  // Filtra por permissão: Mestre vê todas; Jogador vê as suas ou não atribuídas
  const visibleSheets = isMasterUser
    ? campaignSheetsCache
    : campaignSheetsCache.filter((s) => s.ownerId === currentAuthUser.uid);

  if (visibleSheets.length === 0) {
    sheetsGrid.innerHTML = `
      <div class="empty-campaigns glass-panel" style="grid-column: 1 / -1; padding: 40px 20px;">
        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 12px;">
          ${isMasterUser ? "Nenhuma ficha cadastrada nesta campanha ainda." : "Você ainda não possui nenhuma ficha forjada nesta crônica."}
        </p>
        <button class="btn btn-primary" onclick="document.getElementById('btnOpenCreateSheet').click()">
          Forjar Primeira Ficha
        </button>
      </div>
    `;
    return;
  }

  visibleSheets.forEach((sheet) => {
    const card = document.createElement("article");
    card.className = "sheet-card";

    const hpPercent = sheet.maxHp > 0 ? Math.round((sheet.currentHp / sheet.maxHp) * 100) : 100;
    const isOwner = sheet.ownerId === currentAuthUser.uid;

    card.innerHTML = `
      <div>
        <div class="sheet-card-header">
          <div class="sheet-avatar">
            ${(sheet.name || "P").charAt(0).toUpperCase()}
          </div>
          <div class="sheet-title-info">
            <h4 class="sheet-name" title="${escapeHtml(sheet.name)}">${escapeHtml(sheet.name)}</h4>
            <span class="sheet-class-level">${escapeHtml(sheet.race || "Humano")} &bull; ${escapeHtml(sheet.characterClass || "Guerreiro")} Nív. ${sheet.level || 1}</span>
          </div>
        </div>

        <div class="sheet-vitals-row" style="margin-top: 14px;">
          <div class="vital-stat">
            <span class="vital-stat-label">Vida (HP)</span>
            <span class="vital-stat-val vital-hp">${sheet.currentHp || 0}/${sheet.maxHp || 0}</span>
          </div>
          <div class="vital-stat">
            <span class="vital-stat-label">Mana (PM)</span>
            <span class="vital-stat-val vital-mp">${sheet.currentMp || 0}/${sheet.maxMp || 0}</span>
          </div>
          <div class="vital-stat">
            <span class="vital-stat-label">Defesa (CA)</span>
            <span class="vital-stat-val vital-ac">${sheet.ac || 10}</span>
          </div>
        </div>
      </div>

      <div class="sheet-card-footer">
        <div class="sheet-owner-badge" title="Jogador responsável">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>${escapeHtml(sheet.ownerName || "Não atribuída")}</span>
        </div>

        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn btn-ghost btn-view-sheet" data-id="${sheet.id}" style="padding: 4px 8px; font-size: 0.76rem;" title="Abrir ficha completa">
            Abrir
          </button>
          ${isMasterUser ? `
            <button type="button" class="btn btn-ghost btn-assign-sheet" data-id="${sheet.id}" style="padding: 4px 8px; font-size: 0.76rem;" title="Atribuir jogador">
              Atribuir
            </button>
          ` : ""}
          ${(isMasterUser || isOwner) ? `
            <button type="button" class="btn btn-ghost btn-delete-sheet" data-id="${sheet.id}" data-name="${escapeHtml(sheet.name)}" style="padding: 4px 8px; font-size: 0.76rem; color: var(--color-error);" title="Excluir ficha">
              Excluir
            </button>
          ` : ""}
        </div>
      </div>
    `;

    // Ações
    const header = card.querySelector(".sheet-card-header");
    if (header) {
      header.style.cursor = "pointer";
      header.addEventListener("click", () => openViewSheetModal(sheet));
    }

    const vitals = card.querySelector(".sheet-vitals-row");
    if (vitals) {
      vitals.style.cursor = "pointer";
      vitals.addEventListener("click", () => openViewSheetModal(sheet));
    }

    const btnView = card.querySelector(".btn-view-sheet");
    if (btnView) {
      btnView.addEventListener("click", () => openViewSheetModal(sheet));
    }

    const btnAssign = card.querySelector(".btn-assign-sheet");
    if (btnAssign) {
      btnAssign.addEventListener("click", () => openAssignSheetModal(sheet));
    }

    const btnDelete = card.querySelector(".btn-delete-sheet");
    if (btnDelete) {
      btnDelete.addEventListener("click", () => openConfirmDeleteSheetModal(sheet));
    }

    sheetsGrid.appendChild(card);
  });
}

// Modal Criar Ficha
if (btnOpenCreateSheet) {
  btnOpenCreateSheet.addEventListener("click", () => {
    // Popula o dropdown de jogadores caso seja Mestre
    if (sheetAssignPlayerGroup && sheetAssignPlayerSelect) {
      if (isMasterUser) {
        sheetAssignPlayerGroup.style.display = "block";
        sheetAssignPlayerSelect.innerHTML = `<option value="">Não atribuída (Mestre)</option>`;
        (activeCampaign.playerDetails || []).forEach((p) => {
          sheetAssignPlayerSelect.innerHTML += `<option value="${p.uid}|${escapeHtml(p.name)}">${escapeHtml(p.name)} (${escapeHtml(p.role)})</option>`;
        });
      } else {
        sheetAssignPlayerGroup.style.display = "none";
      }
    }
    openModalById("modalCreateSheet");
  });
}

if (formCreateSheet) {
  formCreateSheet.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeCampaign || !currentAuthUser) return;

    const name = document.getElementById("sheetName").value.trim();
    const race = document.getElementById("sheetRace").value.trim();
    const characterClass = document.getElementById("sheetClass").value.trim();
    const level = parseInt(document.getElementById("sheetLevel").value, 10) || 1;
    const maxHp = parseInt(document.getElementById("sheetMaxHp").value, 10) || 10;
    const maxMp = parseInt(document.getElementById("sheetMaxMp").value, 10) || 5;
    const ac = parseInt(document.getElementById("sheetAc").value, 10) || 10;

    let assignedUid = currentAuthUser.uid;
    let assignedName = currentAuthUser.displayName || currentAuthUser.email.split("@")[0];

    if (isMasterUser && sheetAssignPlayerSelect && sheetAssignPlayerSelect.value) {
      const [uid, pName] = sheetAssignPlayerSelect.value.split("|");
      assignedUid = uid;
      assignedName = pName;
    }

    if (!name) return;

    try {
      const btn = document.getElementById("btnSubmitCreateSheet");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="btn-spinner"></span> <span>Salvando...</span>`;
      }

      await addDoc(collection(db, "campaigns", activeCampaign.id, "sheets"), {
        name,
        race,
        characterClass,
        level,
        currentHp: maxHp,
        maxHp,
        currentMp: maxMp,
        maxMp,
        ac,
        ownerId: assignedUid,
        ownerName: assignedName,
        createdAt: serverTimestamp()
      });

      closeModalById("modalCreateSheet");
      formCreateSheet.reset();
      showToast("Ficha forjada com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao criar ficha:", err);
      showToast("Não foi possível salvar a ficha.", "error");
    } finally {
      const btn = document.getElementById("btnSubmitCreateSheet");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Criar Ficha</span>`;
      }
    }
  });
}

// Modal Atribuir Ficha
let sheetToAssign = null;
const modalAssignSheet = document.getElementById("modalAssignSheet");
const formAssignSheet = document.getElementById("formAssignSheet");
const assignTargetPlayerSelect = document.getElementById("assignTargetPlayerSelect");

function openAssignSheetModal(sheet) {
  sheetToAssign = sheet;
  if (!assignTargetPlayerSelect) return;
  assignTargetPlayerSelect.innerHTML = `<option value="">Não atribuída (Mestre)</option>`;
  (activeCampaign.playerDetails || []).forEach((p) => {
    const selected = sheet.ownerId === p.uid ? "selected" : "";
    assignTargetPlayerSelect.innerHTML += `<option value="${p.uid}|${escapeHtml(p.name)}" ${selected}>${escapeHtml(p.name)}</option>`;
  });
  openModalById("modalAssignSheet");
}

if (formAssignSheet) {
  formAssignSheet.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!sheetToAssign || !activeCampaign) return;

    let targetUid = null;
    let targetName = "Não atribuída";

    if (assignTargetPlayerSelect.value) {
      const [uid, name] = assignTargetPlayerSelect.value.split("|");
      targetUid = uid;
      targetName = name;
    }

    try {
      await updateDoc(doc(db, "campaigns", activeCampaign.id, "sheets", sheetToAssign.id), {
        ownerId: targetUid,
        ownerName: targetName
      });
      closeModalById("modalAssignSheet");
      showToast("Ficha reatribuída com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao atribuir ficha:", err);
      showToast("Erro ao atribuir ficha.", "error");
    }
  });
}

// Modal Confirmar Exclusão de Ficha
let sheetToDelete = null;
const modalConfirmDeleteSheet = document.getElementById("modalConfirmDeleteSheet");
const deleteSheetTargetName = document.getElementById("deleteSheetTargetName");
const btnConfirmDeleteSheet = document.getElementById("btnConfirmDeleteSheet");

function openConfirmDeleteSheetModal(sheet) {
  sheetToDelete = sheet;
  if (deleteSheetTargetName) deleteSheetTargetName.textContent = sheet.name;
  openModalById("modalConfirmDeleteSheet");
}

if (btnConfirmDeleteSheet) {
  btnConfirmDeleteSheet.addEventListener("click", async () => {
    if (!sheetToDelete || !activeCampaign) return;
    try {
      btnConfirmDeleteSheet.disabled = true;
      await deleteDoc(doc(db, "campaigns", activeCampaign.id, "sheets", sheetToDelete.id));
      closeModalById("modalConfirmDeleteSheet");
      showToast(`Ficha "${sheetToDelete.name}" foi destruída.`, "info");
    } catch (err) {
      console.error("Erro ao deletar ficha:", err);
      showToast("Erro ao excluir ficha.", "error");
    } finally {
      btnConfirmDeleteSheet.disabled = false;
    }
  });
}

// Modal Detalhes e Edição da Ficha Completa
let currentViewingSheet = null;
const formEditSheet = document.getElementById("formEditSheet");

function openViewSheetModal(sheet) {
  currentViewingSheet = sheet;
  const isOwner = sheet.ownerId === currentAuthUser.uid;
  const canEdit = isMasterUser || isOwner;

  const idInput = document.getElementById("viewSheetId");
  const title = document.getElementById("viewSheetTitle");
  const subtitle = document.getElementById("viewSheetSubtitle");
  const avatar = document.getElementById("viewSheetAvatar");
  const owner = document.getElementById("viewSheetOwner");
  const levelInput = document.getElementById("viewSheetLevel");
  const acInput = document.getElementById("viewSheetAc");
  const currentHpInput = document.getElementById("viewSheetCurrentHp");
  const maxHpInput = document.getElementById("viewSheetMaxHp");
  const currentMpInput = document.getElementById("viewSheetCurrentMp");
  const maxMpInput = document.getElementById("viewSheetMaxMp");
  const notesInput = document.getElementById("viewSheetNotes");
  const hpBadge = document.getElementById("viewSheetHpBadge");
  const btnSave = document.getElementById("btnSaveSheetChanges");

  if (idInput) idInput.value = sheet.id;
  if (title) title.textContent = sheet.name || "Sem Nome";
  if (subtitle) subtitle.textContent = `${sheet.race || "Humano"} • ${sheet.characterClass || "Guerreiro"}`;
  if (avatar) avatar.textContent = (sheet.name || "P").charAt(0).toUpperCase();
  if (owner) owner.textContent = sheet.ownerName || "Não atribuída (Mestre)";

  if (levelInput) {
    levelInput.value = sheet.level || 1;
    levelInput.disabled = !canEdit;
  }
  if (acInput) {
    acInput.value = sheet.ac || 10;
    acInput.disabled = !canEdit;
  }
  if (currentHpInput) {
    currentHpInput.value = sheet.currentHp ?? 10;
    currentHpInput.disabled = !canEdit;
  }
  if (maxHpInput) {
    maxHpInput.value = sheet.maxHp ?? 10;
    maxHpInput.disabled = !canEdit;
  }
  if (currentMpInput) {
    currentMpInput.value = sheet.currentMp ?? 5;
    currentMpInput.disabled = !canEdit;
  }
  if (maxMpInput) {
    maxMpInput.value = sheet.maxMp ?? 5;
    maxMpInput.disabled = !canEdit;
  }
  if (notesInput) {
    notesInput.value = sheet.notes || "";
    notesInput.disabled = !canEdit;
  }

  const hpPercent = sheet.maxHp > 0 ? Math.round(((sheet.currentHp || 0) / sheet.maxHp) * 100) : 100;
  if (hpBadge) hpBadge.textContent = `${hpPercent}%`;

  if (btnSave) {
    btnSave.style.display = canEdit ? "inline-flex" : "none";
  }

  openModalById("modalViewSheet");
}

if (formEditSheet) {
  formEditSheet.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentViewingSheet || !activeCampaign) return;

    const level = parseInt(document.getElementById("viewSheetLevel").value, 10) || 1;
    const ac = parseInt(document.getElementById("viewSheetAc").value, 10) || 10;
    const currentHp = parseInt(document.getElementById("viewSheetCurrentHp").value, 10) || 0;
    const maxHp = parseInt(document.getElementById("viewSheetMaxHp").value, 10) || 1;
    const currentMp = parseInt(document.getElementById("viewSheetCurrentMp").value, 10) || 0;
    const maxMp = parseInt(document.getElementById("viewSheetMaxMp").value, 10) || 0;
    const notes = document.getElementById("viewSheetNotes").value.trim();

    try {
      const btn = document.getElementById("btnSaveSheetChanges");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="btn-spinner"></span> <span>Salvando...</span>`;
      }

      await updateDoc(doc(db, "campaigns", activeCampaign.id, "sheets", currentViewingSheet.id), {
        level,
        ac,
        currentHp,
        maxHp,
        currentMp,
        maxMp,
        notes
      });

      closeModalById("modalViewSheet");
      showToast("Ficha atualizada com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao atualizar ficha:", err);
      showToast("Não foi possível salvar alterações da ficha.", "error");
    } finally {
      const btn = document.getElementById("btnSaveSheetChanges");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Salvar Alterações</span>`;
      }
    }
  });
}

// ==========================================================================
// 6. ABA 2: JOGADORES (PLAYERS)
// ==========================================================================
function listenPlayers() {
  if (!campPlayersList || !activeCampaign) return;
  campPlayersList.innerHTML = "";

  const players = activeCampaign.playerDetails || [];

  players.forEach((p) => {
    const isThisMaster = p.uid === activeCampaign.masterId;
    const isSelf = p.uid === currentAuthUser.uid;
    const item = document.createElement("div");
    item.className = "player-item";

    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="user-avatar" style="width: 36px; height: 36px; font-size: 0.9rem; overflow: hidden;">
          ${(p.name || "A").charAt(0).toUpperCase()}
        </div>
        <div>
          <div style="font-weight: 600; font-size: 0.92rem;">${escapeHtml(p.name)} ${isSelf ? '<span style="font-size: 0.72rem; color: var(--accent-primary);">(Você)</span>' : ""}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(p.email || "")}</div>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 10px;">
        <span class="badge-tag ${isThisMaster ? "badge-master" : "badge-player"}" style="font-size: 0.72rem;">
          ${isThisMaster ? "Mestre" : "Jogador"}
        </span>
        ${(isMasterUser && !isThisMaster) ? `
          <button type="button" class="btn btn-ghost btn-remove-player" data-uid="${p.uid}" data-name="${escapeHtml(p.name)}" style="padding: 4px 8px; font-size: 0.76rem; color: var(--color-error);" title="Remover jogador">
            Remover
          </button>
        ` : ""}
      </div>
    `;

    const btnRemove = item.querySelector(".btn-remove-player");
    if (btnRemove) {
      btnRemove.addEventListener("click", () => openRemovePlayerModal(p));
    }

    campPlayersList.appendChild(item);
  });
}

// Modal Remover Jogador
let playerToRemove = null;
const modalRemovePlayer = document.getElementById("modalRemovePlayer");
const removePlayerTargetName = document.getElementById("removePlayerTargetName");
const btnConfirmRemovePlayer = document.getElementById("btnConfirmRemovePlayer");

function openRemovePlayerModal(player) {
  playerToRemove = player;
  if (removePlayerTargetName) removePlayerTargetName.textContent = player.name;
  openModalById("modalRemovePlayer");
}

if (btnConfirmRemovePlayer) {
  btnConfirmRemovePlayer.addEventListener("click", async () => {
    if (!playerToRemove || !activeCampaign) return;
    try {
      btnConfirmRemovePlayer.disabled = true;

      // Remove dos arrays players e playerDetails
      const updatedPlayers = (activeCampaign.players || []).filter((uid) => uid !== playerToRemove.uid);
      const updatedDetails = (activeCampaign.playerDetails || []).filter((p) => p.uid !== playerToRemove.uid);

      await updateDoc(doc(db, "campaigns", activeCampaign.id), {
        players: updatedPlayers,
        playerDetails: updatedDetails
      });

      closeModalById("modalRemovePlayer");
      showToast(`Jogador "${playerToRemove.name}" foi removido da mesa.`, "info");
    } catch (err) {
      console.error("Erro ao remover jogador:", err);
      showToast("Não foi possível remover o jogador.", "error");
    } finally {
      btnConfirmRemovePlayer.disabled = false;
    }
  });
}

// ==========================================================================
// 7. ABA 3: ESCUDO DO MESTRE (GM SCREEN)
// ==========================================================================

// Resumo dos Players (HUD Vital)
function renderGmVitalsHud() {
  if (!gmVitalsGrid) return;
  gmVitalsGrid.innerHTML = "";

  if (campaignSheetsCache.length === 0) {
    gmVitalsGrid.innerHTML = `<p style="color: var(--text-muted); font-size: 0.88rem;">Nenhuma ficha disponível para monitorar.</p>`;
    return;
  }

  campaignSheetsCache.forEach((sheet) => {
    const card = document.createElement("div");
    card.className = "gm-vital-card";
    const hpPercent = sheet.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((sheet.currentHp / sheet.maxHp) * 100))) : 100;

    card.innerHTML = `
      <div class="gm-vital-card-header" style="cursor: pointer;" title="Clique para abrir ficha completa">
        <div>
          <strong style="font-size: 0.95rem;">${escapeHtml(sheet.name)}</strong>
          <div style="font-size: 0.76rem; color: var(--text-muted);">${escapeHtml(sheet.ownerName || "Sem jogador")}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="badge-tag badge-system" style="font-size: 0.72rem;">CA ${sheet.ac || 10}</span>
          <button type="button" class="btn btn-ghost btn-view-sheet-hud" style="padding: 2px 6px; font-size: 0.75rem;" title="Abrir ficha completa">
            👁️
          </button>
        </div>
      </div>

      <div>
        <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
          <span>Vida (HP)</span>
          <strong class="vital-hp">${sheet.currentHp}/${sheet.maxHp}</strong>
        </div>
        <div class="hp-bar-container">
          <div class="hp-bar-fill" style="width: ${hpPercent}%;"></div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 4px;">
        <div class="gm-hp-controls">
          <button type="button" class="btn-vital-step btn-hp-minus" data-id="${sheet.id}" title="-1 HP">-1</button>
          <button type="button" class="btn-vital-step btn-hp-plus" data-id="${sheet.id}" title="+1 HP">+1</button>
        </div>
        <button type="button" class="btn btn-ghost btn-add-to-init" style="padding: 4px 8px; font-size: 0.75rem;" title="Adicionar ao combate">
          + Iniciativa
        </button>
      </div>
    `;

    const hudHeader = card.querySelector(".gm-vital-card-header");
    if (hudHeader) {
      hudHeader.addEventListener("click", () => openViewSheetModal(sheet));
    }
    const btnHudView = card.querySelector(".btn-view-sheet-hud");
    if (btnHudView) {
      btnHudView.addEventListener("click", (e) => {
        e.stopPropagation();
        openViewSheetModal(sheet);
      });
    }

    card.querySelector(".btn-hp-minus").addEventListener("click", () => adjustSheetHp(sheet, -1));
    card.querySelector(".btn-hp-plus").addEventListener("click", () => adjustSheetHp(sheet, 1));
    card.querySelector(".btn-add-to-init").addEventListener("click", () => {
      addCombatantToInitiative({
        name: sheet.name,
        type: "player",
        currentHp: sheet.currentHp,
        maxHp: sheet.maxHp
      });
    });

    gmVitalsGrid.appendChild(card);
  });
}

async function adjustSheetHp(sheet, delta) {
  const newHp = Math.max(0, Math.min(sheet.maxHp, (sheet.currentHp || 0) + delta));
  try {
    await updateDoc(doc(db, "campaigns", activeCampaign.id, "sheets", sheet.id), {
      currentHp: newHp
    });
  } catch (err) {
    console.warn("Erro ao ajustar HP:", err);
  }
}

// NPCs e Inimigos Rápidos
function listenNpcs(campaignId) {
  const q = query(
    collection(db, "campaigns", campaignId, "npcs"),
    orderBy("createdAt", "desc")
  );

  unsubNpcs = onSnapshot(q, (snapshot) => {
    campaignNpcsCache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderNpcs();
  }, (err) => {
    console.warn("Aviso ao escutar NPCs:", err);
  });
}

function renderNpcs() {
  if (!npcsGrid) return;
  npcsGrid.innerHTML = "";

  if (campaignNpcsCache.length === 0) {
    npcsGrid.innerHTML = `<p style="color: var(--text-muted); font-size: 0.88rem;">Nenhum NPC ou monstro rápido criado ainda.</p>`;
    return;
  }

  campaignNpcsCache.forEach((npc) => {
    const card = document.createElement("div");
    card.className = "gm-vital-card";
    const hpPercent = npc.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((npc.currentHp / npc.maxHp) * 100))) : 100;

    card.innerHTML = `
      <div class="gm-vital-card-header">
        <div>
          <strong style="font-size: 0.95rem;">${escapeHtml(npc.name)}</strong>
          <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(npc.npcType || "Inimigo")}</div>
        </div>
        <span class="badge-tag badge-master" style="font-size: 0.72rem;">CA ${npc.ac || 10}</span>
      </div>

      <div>
        <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
          <span>Vida</span>
          <strong class="vital-hp">${npc.currentHp}/${npc.maxHp}</strong>
        </div>
        <div class="hp-bar-container">
          <div class="hp-bar-fill" style="width: ${hpPercent}%;"></div>
        </div>
      </div>

      ${npc.notes ? `<p style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">${escapeHtml(npc.notes)}</p>` : ""}

      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="gm-hp-controls">
          <button type="button" class="btn-vital-step btn-npc-hp-minus">-1</button>
          <button type="button" class="btn-vital-step btn-npc-hp-plus">+1</button>
        </div>
        <div style="display: flex; gap: 4px;">
          <button type="button" class="btn btn-ghost btn-npc-init" style="padding: 4px 8px; font-size: 0.75rem;">+ Combate</button>
          <button type="button" class="btn btn-ghost btn-npc-del" style="padding: 4px 8px; font-size: 0.75rem; color: var(--color-error);">&times;</button>
        </div>
      </div>
    `;

    card.querySelector(".btn-npc-hp-minus").addEventListener("click", () => adjustNpcHp(npc, -1));
    card.querySelector(".btn-npc-hp-plus").addEventListener("click", () => adjustNpcHp(npc, 1));
    card.querySelector(".btn-npc-init").addEventListener("click", () => {
      addCombatantToInitiative({
        name: npc.name,
        type: "npc",
        currentHp: npc.currentHp,
        maxHp: npc.maxHp
      });
    });
    card.querySelector(".btn-npc-del").addEventListener("click", async () => {
      if (confirm(`Excluir NPC "${npc.name}"?`)) {
        await deleteDoc(doc(db, "campaigns", activeCampaign.id, "npcs", npc.id));
      }
    });

    npcsGrid.appendChild(card);
  });
}

async function adjustNpcHp(npc, delta) {
  const newHp = Math.max(0, Math.min(npc.maxHp, (npc.currentHp || 0) + delta));
  try {
    await updateDoc(doc(db, "campaigns", activeCampaign.id, "npcs", npc.id), {
      currentHp: newHp
    });
  } catch (err) {
    console.warn("Erro ao ajustar HP do NPC:", err);
  }
}

// Modal Criar NPC
if (btnOpenCreateNPC) {
  btnOpenCreateNPC.addEventListener("click", () => openModalById("modalCreateNPC"));
}

if (formCreateNPC) {
  formCreateNPC.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeCampaign) return;

    const name = document.getElementById("npcName").value.trim();
    const npcType = document.getElementById("npcType").value;
    const maxHp = parseInt(document.getElementById("npcMaxHp").value, 10) || 10;
    const ac = parseInt(document.getElementById("npcAc").value, 10) || 10;
    const notes = document.getElementById("npcNotes").value.trim();

    if (!name) return;

    try {
      await addDoc(collection(db, "campaigns", activeCampaign.id, "npcs"), {
        name,
        npcType,
        maxHp,
        currentHp: maxHp,
        ac,
        notes,
        createdAt: serverTimestamp()
      });

      closeModalById("modalCreateNPC");
      formCreateNPC.reset();
      showToast("NPC registrado no grimório!", "success");
    } catch (err) {
      console.error("Erro ao criar NPC:", err);
      showToast("Erro ao criar NPC.", "error");
    }
  });
}

// Gerenciador de Iniciativa
function renderInitiative() {
  if (!initiativeItemsList) return;
  initiativeItemsList.innerHTML = "";

  if (initiativeList.length === 0) {
    initiativeItemsList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.88rem; text-align: center; padding: 14px;">Nenhum participante adicionado ao combate.</p>`;
    if (currentTurnBadge) currentTurnBadge.textContent = "Combate parado";
    return;
  }

  // Ordena por iniciativa decrescente
  initiativeList.sort((a, b) => b.score - a.score);

  if (currentTurnBadge) {
    const active = initiativeList[currentTurnIndex];
    currentTurnBadge.textContent = active ? `Turno de: ${active.name}` : "Turno";
  }

  initiativeList.forEach((c, idx) => {
    const isCurrent = idx === currentTurnIndex;
    const item = document.createElement("div");
    item.className = `initiative-item ${isCurrent ? "current-turn" : ""}`;

    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span class="initiative-score-badge">${c.score}</span>
        <div>
          <strong>${escapeHtml(c.name)}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 6px;">(${c.type === "player" ? "Jogador" : "NPC"})</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 10px;">
        <button type="button" class="btn btn-ghost btn-init-del" style="padding: 2px 6px; font-size: 0.8rem; color: var(--color-error);">&times;</button>
      </div>
    `;

    item.querySelector(".btn-init-del").addEventListener("click", () => {
      initiativeList.splice(idx, 1);
      if (currentTurnIndex >= initiativeList.length) currentTurnIndex = 0;
      renderInitiative();
    });

    initiativeItemsList.appendChild(item);
  });
}

function addCombatantToInitiative(data) {
  const score = Math.floor(Math.random() * 20) + 1; // Rola d20 automático inicial
  initiativeList.push({
    id: "init_" + Date.now() + Math.random(),
    name: data.name,
    type: data.type || "npc",
    score: data.score || score
  });
  renderInitiative();
  showToast(`"${data.name}" adicionado à iniciativa com ${score}!`, "info");
}

if (btnRollAllInitiatives) {
  btnRollAllInitiatives.addEventListener("click", () => {
    initiativeList.forEach((c) => {
      c.score = Math.floor(Math.random() * 20) + 1;
    });
    currentTurnIndex = 0;
    renderInitiative();
    showToast("Iniciativas roladas com sucesso!", "success");
  });
}

if (btnNextTurn) {
  btnNextTurn.addEventListener("click", () => {
    if (initiativeList.length === 0) return;
    currentTurnIndex = (currentTurnIndex + 1) % initiativeList.length;
    renderInitiative();
  });
}

if (btnPrevTurn) {
  btnPrevTurn.addEventListener("click", () => {
    if (initiativeList.length === 0) return;
    currentTurnIndex = (currentTurnIndex - 1 + initiativeList.length) % initiativeList.length;
    renderInitiative();
  });
}

if (btnClearInitiative) {
  btnClearInitiative.addEventListener("click", () => {
    initiativeList = [];
    currentTurnIndex = 0;
    renderInitiative();
  });
}

if (btnAddCombatant) {
  btnAddCombatant.addEventListener("click", () => openModalById("modalAddCombatant"));
}

if (formAddCombatant) {
  formAddCombatant.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("combatantName").value.trim();
    const manualScore = parseInt(document.getElementById("combatantScore").value, 10);
    const score = isNaN(manualScore) ? (Math.floor(Math.random() * 20) + 1) : manualScore;

    if (!name) return;
    addCombatantToInitiative({ name, score, type: "npc" });
    closeModalById("modalAddCombatant");
    formAddCombatant.reset();
  });
}

// ==========================================================================
// 8. ABA 4: COMPENDIUM
// ==========================================================================
function listenCompendium(campaignId) {
  const q = query(
    collection(db, "campaigns", campaignId, "compendium"),
    orderBy("createdAt", "desc")
  );

  unsubCompendium = onSnapshot(q, (snapshot) => {
    campaignCompendiumCache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderCompendium();
  }, (err) => {
    console.warn("Aviso ao escutar compendium:", err);
  });
}

function renderCompendium() {
  if (!compendiumGrid) return;
  compendiumGrid.innerHTML = "";

  const term = (compendiumSearch ? compendiumSearch.value : "").trim().toLowerCase();

  const filtered = campaignCompendiumCache.filter((item) => {
    const matchFilter = currentCompendiumFilter === "todos" || item.category === currentCompendiumFilter;
    const matchTerm = !term || item.title.toLowerCase().includes(term) || (item.description || "").toLowerCase().includes(term);
    return matchFilter && matchTerm;
  });

  if (filtered.length === 0) {
    compendiumGrid.innerHTML = `
      <div class="empty-campaigns glass-panel" style="grid-column: 1 / -1; padding: 32px 20px;">
        <p style="color: var(--text-muted); font-size: 0.9rem;">Nenhum registro encontrado no Compendium.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((item) => {
    const card = document.createElement("div");
    card.className = "compendium-card";

    card.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span class="comp-tag">${escapeHtml(item.category)}</span>
          ${isMasterUser ? `
            <button type="button" class="btn btn-ghost btn-comp-del" style="padding: 2px 6px; font-size: 0.75rem; color: var(--color-error);">&times;</button>
          ` : ""}
        </div>
        <h4 style="font-family: var(--font-heading); font-size: 1.15rem; margin-bottom: 6px;">${escapeHtml(item.title)}</h4>
        ${item.properties ? `<p style="font-size: 0.8rem; color: var(--accent-primary); margin-bottom: 6px; font-weight: 600;">${escapeHtml(item.properties)}</p>` : ""}
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.45;">${escapeHtml(item.description || "")}</p>
      </div>
    `;

    if (isMasterUser) {
      card.querySelector(".btn-comp-del").addEventListener("click", async () => {
        if (confirm(`Excluir "${item.title}" do compendium?`)) {
          await deleteDoc(doc(db, "campaigns", activeCampaign.id, "compendium", item.id));
        }
      });
    }

    compendiumGrid.appendChild(card);
  });
}

// Filtros do Compendium
compendiumFilters.forEach((pill) => {
  pill.addEventListener("click", () => {
    compendiumFilters.forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    currentCompendiumFilter = pill.getAttribute("data-filter") || "todos";
    renderCompendium();
  });
});

if (compendiumSearch) {
  compendiumSearch.addEventListener("input", () => renderCompendium());
}

if (btnOpenCreateCompendium) {
  btnOpenCreateCompendium.addEventListener("click", () => openModalById("modalCreateCompendium"));
}

if (formCreateCompendium) {
  formCreateCompendium.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeCampaign) return;

    const category = document.getElementById("compCategory").value;
    const title = document.getElementById("compTitle").value.trim();
    const properties = document.getElementById("compProperties").value.trim();
    const description = document.getElementById("compDescription").value.trim();

    if (!title) return;

    try {
      await addDoc(collection(db, "campaigns", activeCampaign.id, "compendium"), {
        category,
        title,
        properties,
        description,
        createdAt: serverTimestamp()
      });

      closeModalById("modalCreateCompendium");
      formCreateCompendium.reset();
      showToast("Registro adicionado ao Compendium!", "success");
    } catch (err) {
      console.error("Erro ao salvar compendium:", err);
      showToast("Erro ao adicionar registro.", "error");
    }
  });
}

// ==========================================================================
// 9. ABA 5: CONFIGURAÇÕES E DUPLICAÇÃO DA CAMPANHA
// ==========================================================================
function populateCampaignSettings(campaign) {
  if (campSettingsName) campSettingsName.value = campaign.name || "";
  if (campSettingsCover) campSettingsCover.value = campaign.coverUrl || "";
  if (campSettingsSystemA && campSettingsSystemB) {
    if (campaign.system === "Sistema B") {
      campSettingsSystemB.checked = true;
    } else {
      campSettingsSystemA.checked = true;
    }
  }
}

if (formCampaignSettings) {
  formCampaignSettings.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeCampaign || !isMasterUser) return;

    const name = campSettingsName.value.trim();
    const coverUrl = campSettingsCover.value.trim();
    const system = campSettingsSystemB.checked ? "Sistema B" : "Sistema A";

    if (!name) return;

    try {
      await updateDoc(doc(db, "campaigns", activeCampaign.id), {
        name,
        coverUrl,
        system
      });

      showToast("Configurações da campanha atualizadas!", "success");
    } catch (err) {
      console.error("Erro ao atualizar configurações:", err);
      showToast("Erro ao atualizar campanha.", "error");
    }
  });
}

// Upload de nova capa da campanha a partir do dispositivo
if (btnUploadCampSettingsCover && campSettingsCoverFileInput) {
  btnUploadCampSettingsCover.addEventListener("click", () => {
    campSettingsCoverFileInput.value = "";
    campSettingsCoverFileInput.click();
  });

  campSettingsCoverFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      openCoverCropper(file, async (dataUrl) => {
        if (campSettingsCover) {
          campSettingsCover.value = dataUrl;
        }
        if (detailCoverImg) {
          detailCoverImg.src = dataUrl;
        }
        if (activeCampaign && isMasterUser) {
          try {
            await updateDoc(doc(db, "campaigns", activeCampaign.id), {
              coverUrl: dataUrl
            });
            showToast("Nova capa da campanha salva com sucesso!", "success");
          } catch (err) {
            console.error("Erro ao salvar capa no Firestore:", err);
            showToast("Não foi possível salvar a capa.", "error");
          }
        }
      });
    }
  });
}

// Modal Duplicar Campanha
if (btnOpenDuplicate) {
  btnOpenDuplicate.addEventListener("click", () => {
    if (duplicateCampaignName && activeCampaign) {
      duplicateCampaignName.value = `Cópia de ${activeCampaign.name}`;
    }
    openModalById("modalDuplicateCampaign");
  });
}

if (formDuplicateCampaign) {
  formDuplicateCampaign.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeCampaign || !currentAuthUser) return;

    const newName = duplicateCampaignName.value.trim();
    const copyComp = document.getElementById("dupCopyCompendium").checked;
    const copyGMScreen = document.getElementById("dupCopyGMScreen").checked;
    const copyPlayers = document.getElementById("dupCopyPlayers").checked;

    if (!newName) return;

    try {
      const btn = document.getElementById("btnSubmitDuplicate");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="btn-spinner"></span> <span>Duplicando...</span>`;
      }

      // Gera código de convite novo
      const newCode = "VEU" + Math.random().toString(36).substring(2, 5).toUpperCase();

      // 1. Cria nova campanha
      const newCampaignDoc = await addDoc(collection(db, "campaigns"), {
        name: newName,
        system: activeCampaign.system || "Sistema A",
        coverUrl: activeCampaign.coverUrl || "",
        inviteCode: newCode,
        masterId: currentAuthUser.uid,
        masterName: currentAuthUser.displayName || currentAuthUser.email.split("@")[0],
        masterEmail: currentAuthUser.email,
        players: [currentAuthUser.uid],
        playerDetails: [
          {
            uid: currentAuthUser.uid,
            name: currentAuthUser.displayName || currentAuthUser.email.split("@")[0],
            email: currentAuthUser.email,
            role: "master",
            joinedAt: new Date().toISOString()
          }
        ],
        createdAt: serverTimestamp()
      });

      // 2. Copia Compendium se selecionado
      if (copyComp) {
        const compSnap = await getDocs(collection(db, "campaigns", activeCampaign.id, "compendium"));
        for (const d of compSnap.docs) {
          const data = d.data();
          await addDoc(collection(db, "campaigns", newCampaignDoc.id, "compendium"), {
            ...data,
            createdAt: serverTimestamp()
          });
        }
      }

      // 3. Copia NPCs do Escudo do Mestre se selecionado
      if (copyGMScreen) {
        const npcsSnap = await getDocs(collection(db, "campaigns", activeCampaign.id, "npcs"));
        for (const d of npcsSnap.docs) {
          const data = d.data();
          await addDoc(collection(db, "campaigns", newCampaignDoc.id, "npcs"), {
            ...data,
            createdAt: serverTimestamp()
          });
        }
      }

      // 4. Copia Fichas se selecionado
      if (copyPlayers) {
        const sheetsSnap = await getDocs(collection(db, "campaigns", activeCampaign.id, "sheets"));
        for (const d of sheetsSnap.docs) {
          const data = d.data();
          await addDoc(collection(db, "campaigns", newCampaignDoc.id, "sheets"), {
            ...data,
            createdAt: serverTimestamp()
          });
        }
      }

      closeModalById("modalDuplicateCampaign");
      showToast(`Campanha duplicada com sucesso! Código: ${newCode}`, "success");
    } catch (err) {
      console.error("Erro ao duplicar campanha:", err);
      showToast("Não foi possível duplicar a campanha.", "error");
    } finally {
      const btn = document.getElementById("btnSubmitDuplicate");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Duplicar Campanha</span>`;
      }
    }
  });
}

// Modal Excluir Campanha (Dupla Confirmação)
if (btnOpenDeleteCampaign) {
  btnOpenDeleteCampaign.addEventListener("click", () => {
    if (confirmCampaignNameInput) confirmCampaignNameInput.value = "";
    const targetLabel = document.getElementById("deleteCampTargetName");
    if (targetLabel && activeCampaign) targetLabel.textContent = activeCampaign.name;
    openModalById("modalDeleteCampaign");
  });
}

if (formDeleteCampaign) {
  formDeleteCampaign.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeCampaign || !isMasterUser) return;

    const typedName = confirmCampaignNameInput.value.trim();
    if (typedName !== activeCampaign.name) {
      showToast("O nome digitado não corresponde ao nome da campanha.", "error");
      return;
    }

    try {
      await deleteDoc(doc(db, "campaigns", activeCampaign.id));
      closeModalById("modalDeleteCampaign");
      cleanupCampaignListeners();
      showToast("A campanha foi excluída permanentemente.", "info");

      // Volta para a lista de campanhas
      const btnBack = document.getElementById("btnBackToCampaigns");
      if (btnBack) btnBack.click();
    } catch (err) {
      console.error("Erro ao excluir campanha:", err);
      showToast("Erro ao excluir campanha.", "error");
    }
  });
}

// ==========================================================================
// 10. HELPERS
// ==========================================================================
function openModalById(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("active");
}

function closeModalById(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("active");
}

function showToast(msg, type = "info") {
  const alertEl = document.getElementById("dashboardAlert");
  if (!alertEl) return;
  alertEl.className = `alert alert-${type}`;
  alertEl.innerHTML = `<span>${msg}</span>`;
  alertEl.style.display = "flex";
  setTimeout(() => { alertEl.style.display = "none"; }, 3500);
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

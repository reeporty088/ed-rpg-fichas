/**
 * Véu RPG - Módulo de Autenticação e Interface
 * Gerencia Login, Cadastro, Recuperação de Senha e Alternância de Temas
 */

import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================================================
// 1. GERENCIAMENTO DE TEMA (DARK / LIGHT)
// ==========================================================================
const THEME_STORAGE_KEY = "veu-rpg-theme";
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeToggleLabel = document.getElementById("themeToggleLabel");

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    // Detecta preferência do sistema operacional
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  if (themeToggleLabel) {
    themeToggleLabel.textContent = theme === "dark" ? "Claro" : "Escuro";
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", toggleTheme);
}

// Inicializa o tema imediatamente
initTheme();

// ==========================================================================
// 2. CONTROLE DE ABAS (LOGIN, CADASTRO, RECUPERAR)
// ==========================================================================
const tabs = {
  login: {
    btn: document.getElementById("tabLogin"),
    panel: document.getElementById("panelLogin")
  },
  register: {
    btn: document.getElementById("tabRegister"),
    panel: document.getElementById("panelRegister")
  },
  forgot: {
    btn: document.getElementById("tabForgot"),
    panel: document.getElementById("panelForgot")
  }
};

const linkToForgot = document.getElementById("linkToForgot");
const btnBackToLogin = document.getElementById("btnBackToLogin");

function switchTab(targetTab) {
  hideAlert();

  Object.entries(tabs).forEach(([key, tab]) => {
    const isActive = key === targetTab;
    if (tab.btn) {
      tab.btn.classList.toggle("active", isActive);
      tab.btn.setAttribute("aria-selected", isActive ? "true" : "false");
    }
    if (tab.panel) {
      tab.panel.classList.toggle("active", isActive);
    }
  });
}

if (tabs.login.btn) tabs.login.btn.addEventListener("click", () => switchTab("login"));
if (tabs.register.btn) tabs.register.btn.addEventListener("click", () => switchTab("register"));
if (tabs.forgot.btn) tabs.forgot.btn.addEventListener("click", () => switchTab("forgot"));

if (linkToForgot) {
  linkToForgot.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("forgot");
  });
}

if (btnBackToLogin) {
  btnBackToLogin.addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("login");
  });
}

// Alternância de visibilidade de senha (mostrar/ocultar)
document.querySelectorAll(".password-toggle-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const targetInputId = button.getAttribute("data-target");
    const input = document.getElementById(targetInputId);
    if (!input) return;

    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";

    // Atualiza ícone
    button.innerHTML = isPassword
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  });
});

// ==========================================================================
// 3. ALERTAS E MENSAGENS EM PORTUGUÊS
// ==========================================================================
const authAlert = document.getElementById("authAlert");

function showAlert(message, type = "error") {
  if (!authAlert) return;

  const icons = {
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  };

  authAlert.className = `alert alert-${type}`;
  authAlert.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
  authAlert.style.display = "flex";
  authAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideAlert() {
  if (!authAlert) return;
  authAlert.style.display = "none";
  authAlert.innerHTML = "";
}

/**
 * Tradução amigável dos códigos de erro do Firebase Auth
 */
function translateFirebaseError(error) {
  if (!error) return "Ocorreu um erro desconhecido.";

  const code = error.code || "";

  switch (code) {
    case "auth/invalid-email":
      return "O formato do e-mail inserido é inválido.";
    case "auth/user-disabled":
      return "Esta conta foi suspensa ou desativada pelo administrador.";
    case "auth/user-not-found":
      return "Nenhum aventureiro encontrado com este e-mail.";
    case "auth/wrong-password":
      return "Senha incorreta. Verifique suas credenciais e tente novamente.";
    case "auth/invalid-credential":
      return "E-mail ou senha incorretos. Verifique suas credenciais.";
    case "auth/email-already-in-use":
      return "Este e-mail já está em uso por outro aventureiro.";
    case "auth/weak-password":
      return "A senha deve conter no mínimo 6 caracteres.";
    case "auth/missing-password":
      return "Por favor, digite sua senha de acesso.";
    case "auth/missing-email":
      return "Por favor, informe seu endereço de e-mail.";
    case "auth/operation-not-allowed":
      return "O login por e-mail e senha não está ativado no Firebase.";
    case "auth/too-many-requests":
      return "Muitas tentativas sem sucesso. Por segurança, aguarde alguns instantes e tente novamente.";
    case "auth/network-request-failed":
      return "Falha de conexão com a rede. Verifique sua conexão com a internet.";
    case "auth/popup-closed-by-user":
      return "A janela de autenticação foi encerrada antes do término.";
    default:
      if (error.message && error.message.includes("network")) {
        return "Erro de conexão com o servidor. Verifique sua internet.";
      }
      return error.message || "Ocorreu um erro ao processar sua solicitação. Tente novamente.";
  }
}

// ==========================================================================
// 4. FEEDBACK DE CARREGAMENTO NOS BOTÕES
// ==========================================================================
function setButtonLoading(button, isLoading, defaultText) {
  if (!button) return;
  button.disabled = isLoading;

  if (isLoading) {
    button.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span> <span>Carregando...</span>`;
  } else {
    button.innerHTML = `<span class="btn-text">${defaultText}</span>`;
  }
}

// ==========================================================================
// 5. OBSERVAÇÃO DO ESTADO DE AUTENTICAÇÃO
// ==========================================================================
let isAuthActionInProgress = false;

// Se o usuário já estiver autenticado e não estiver vindo de logout, direciona para app.html
const urlParams = new URLSearchParams(window.location.search);
const isLogout = urlParams.get("logout") === "true";

onAuthStateChanged(auth, (user) => {
  if (user && !isLogout && !isAuthActionInProgress) {
    window.location.href = "app.html";
  }
});

// ==========================================================================
// 6. PROCESSAMENTO DOS FORMULÁRIOS
// ==========================================================================

// Form Login
const formLogin = document.getElementById("formLogin");
const btnLoginSubmit = document.getElementById("btnLoginSubmit");

if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      showAlert("Por favor, preencha todos os campos para entrar.", "error");
      return;
    }

    try {
      isAuthActionInProgress = true;
      setButtonLoading(btnLoginSubmit, true, "Entrar no Véu");

      await signInWithEmailAndPassword(auth, email, password);

      showAlert("Autenticado com sucesso! Entrando no Véu...", "success");

      setTimeout(() => {
        window.location.href = "app.html";
      }, 700);
    } catch (error) {
      isAuthActionInProgress = false;
      setButtonLoading(btnLoginSubmit, false, "Entrar no Véu");
      showAlert(translateFirebaseError(error), "error");
    }
  });
}

// Form Cadastro
const formRegister = document.getElementById("formRegister");
const btnRegisterSubmit = document.getElementById("btnRegisterSubmit");

if (formRegister) {
  formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const passwordConfirm = document.getElementById("registerPasswordConfirm").value;

    if (!name || !email || !password || !passwordConfirm) {
      showAlert("Por favor, preencha todos os campos do formulário.", "error");
      return;
    }

    if (password.length < 6) {
      showAlert("A senha deve ter no mínimo 6 caracteres.", "error");
      return;
    }

    if (password !== passwordConfirm) {
      showAlert("As senhas não coincidem. Digite novamente com atenção.", "error");
      return;
    }

    try {
      isAuthActionInProgress = true;
      setButtonLoading(btnRegisterSubmit, true, "Criar Nova Conta");

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Atualiza o Display Name
      await updateProfile(user, { displayName: name });

      // Salva documento do usuário no Firestore (com fallback seguro caso regras restrinjam)
      try {
        await setDoc(doc(db, "users", user.uid), {
          displayName: name,
          email: email,
          createdAt: serverTimestamp(),
          role: "player"
        });
      } catch (firestoreError) {
        console.warn("Aviso ao salvar perfil no Firestore:", firestoreError);
      }

      showAlert("Conta criada com sucesso! Preparando o Véu...", "success");

      setTimeout(() => {
        window.location.href = "app.html";
      }, 900);
    } catch (error) {
      isAuthActionInProgress = false;
      setButtonLoading(btnRegisterSubmit, false, "Criar Nova Conta");
      showAlert(translateFirebaseError(error), "error");
    }
  });
}

// Form Recuperação de Senha
const formForgot = document.getElementById("formForgot");
const btnForgotSubmit = document.getElementById("btnForgotSubmit");

if (formForgot) {
  formForgot.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById("forgotEmail").value.trim();

    if (!email) {
      showAlert("Por favor, informe seu e-mail cadastrado.", "error");
      return;
    }

    try {
      setButtonLoading(btnForgotSubmit, true, "Enviar Link de Recuperação");

      await sendPasswordResetEmail(auth, email);

      showAlert(
        "Link de recuperação enviado! Verifique sua caixa de entrada e pasta de spam.",
        "success"
      );
      formForgot.reset();
    } catch (error) {
      showAlert(translateFirebaseError(error), "error");
    } finally {
      setButtonLoading(btnForgotSubmit, false, "Enviar Link de Recuperação");
    }
  });
}

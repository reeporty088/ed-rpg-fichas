import { appConfig } from './app-config.js';

const themeKey = 'ed-v5-theme';
export function getTheme() { return localStorage.getItem(themeKey) || appConfig.defaultTheme; }
export function setTheme(theme) {
  if (!appConfig.themes.includes(theme)) throw new Error(`Tema não suportado: ${theme}`);
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(themeKey, theme);
}

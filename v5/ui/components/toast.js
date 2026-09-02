import { element } from './elements.js';
export function createToastRegion() { return element('div', { className: 'toast-region', attributes: { 'aria-live': 'polite' } }); }
export function showToast(region, message) { const toast = element('div', { className: 'toast', text: message }); region.append(toast); setTimeout(() => toast.remove(), 4000); }

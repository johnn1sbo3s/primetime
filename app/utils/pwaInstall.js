// Helpers da instalação PWA (mobile only). Funções puras, testáveis — padrão
// do repo (ex.: scanner.js). Toda leitura/escrita de storage com try/catch.
export const INSTALL_DISMISS_KEY = 'jonebet:pwa-install-dismissed'
export const AGE_GATE_KEY = 'jonebet:gambling-alert-dismissed'

// Client-only: modo standalone (app instalado) — display-mode ou iOS.
export function isStandalone() {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) return true
  return navigator.standalone === true
}

export function isAgeGateDismissed(storage = globalThis.localStorage) {
  try {
    return storage.getItem(AGE_GATE_KEY) === '1'
  } catch {
    return true // storage bloqueado: não segura o drawer refém do age-gate
  }
}

export function wasDismissed(storage = globalThis.localStorage) {
  try {
    return storage.getItem(INSTALL_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissInstall(storage = globalThis.localStorage) {
  try {
    storage.setItem(INSTALL_DISMISS_KEY, '1')
  } catch {
    // storage indisponível — segue sem persistir
  }
}

export function shouldShowDrawer({ isMobileOrTablet, standalone, dismissed, ageGateDismissed }) {
  return isMobileOrTablet && !standalone && !dismissed && ageGateDismissed
}

export function platform({ canPrompt }) {
  return canPrompt ? 'android' : 'ios'
}

// Sprint 3 — persistence helper for the signup persona ('leader' | 'hr_admin').
//
// Why sessionStorage (with localStorage fallback for back-compat):
// - sessionStorage survives same-tab redirects (Google OAuth round-trip) and is
//   automatically cleared when the tab closes, so a stale persona from an old
//   signup attempt can't leak into a new session on the same machine.
// - We still read from localStorage as a fallback so anyone with an in-flight
//   signup at deploy time doesn't lose their persona.

export type SignupPersona = 'leader' | 'hr_admin';

const KEY = 'signup_persona';

function isPersona(v: unknown): v is SignupPersona {
  return v === 'leader' || v === 'hr_admin';
}

export function setSignupPersona(persona: SignupPersona): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY, persona);
  } catch {
    /* ignore */
  }
  // Keep localStorage mirror so legacy readers (and any pre-deploy tab) keep working.
  try {
    window.localStorage.setItem(KEY, persona);
  } catch {
    /* ignore */
  }
}

export function getSignupPersona(): SignupPersona | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = window.sessionStorage.getItem(KEY);
    if (isPersona(s)) return s;
  } catch {
    /* ignore */
  }
  try {
    const l = window.localStorage.getItem(KEY);
    if (isPersona(l)) return l;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearSignupPersona(): void {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}

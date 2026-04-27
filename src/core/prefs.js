// Lightweight preferences store backed by localStorage.
// Each pref has a getter/setter pair and a default value.

const COACH_KEY = 'findthealien:coach';

export function getCoachOn() {
  try {
    const v = localStorage.getItem(COACH_KEY);
    if (v === 'off') return false;
    return true; // default ON
  } catch {
    return true;
  }
}

export function setCoachOn(on) {
  try {
    localStorage.setItem(COACH_KEY, on ? 'on' : 'off');
  } catch { /* ignore */ }
}

// Tema claro/escuro por classe "dark" no <html> (compatível com darkMode:'class' do Tailwind).
// Rode antes do primeiro paint (script inline no <head>) para não piscar.
const KEY = 'obras-theme' // 'light' | 'dark' | ausente = segue o sistema

export function applyTheme(mode = readStored()) {
  const dark = mode ? mode === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', dark)
  return dark ? 'dark' : 'light'
}
export function setTheme(mode) {
  try { mode ? localStorage.setItem(KEY, mode) : localStorage.removeItem(KEY) } catch {}
  return applyTheme(mode)
}
export function toggleTheme() {
  return setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark')
}
function readStored() { try { return localStorage.getItem(KEY) } catch { return null } }

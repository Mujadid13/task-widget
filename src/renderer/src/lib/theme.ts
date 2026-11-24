// Accent color. One hex value drives the whole palette: main.css derives the lighter
// and translucent shades from --accent with color-mix().

export const presets = [
  { name: 'Turquoise', color: '#2dd4bf' },
  { name: 'Red', color: '#f87171' },
  { name: 'Orange', color: '#fb923c' },
  { name: 'Yellow', color: '#facc15' },
  { name: 'Green', color: '#4ade80' },
  { name: 'Blue', color: '#60a5fa' },
  { name: 'Purple', color: '#a78bfa' },
  { name: 'Pink', color: '#f472b6' }
]

export const DEFAULT_ACCENT = presets[0].color
const KEY = 'accent'
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

const DARK = 0.0016 // relative luminance of #020617 (slate-950), the card's background

const channels = (hex: string): number[] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)

// WCAG relative luminance.
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrastWithDark = (hex: string): number => (luminance(hex) + 0.05) / (DARK + 0.05)

/** Text color for accent-filled buttons: near-black or white, whichever contrasts more. */
export function inkFor(hex: string): string {
  const vsWhite = 1.05 / (luminance(hex) + 0.05)
  return contrastWithDark(hex) >= vsWhite ? '#020617' : '#ffffff'
}

/** The accent, mixed with just enough white to be readable as text on the dark card (4.5:1). */
export function readableOnDark(hex: string): string {
  for (let white = 0; white < 1; white += 0.05) {
    const mixed =
      '#' +
      channels(hex)
        .map((c) =>
          Math.round((c + (1 - c) * white) * 255)
            .toString(16)
            .padStart(2, '0')
        )
        .join('')
    if (contrastWithDark(mixed) >= 4.5) return mixed
  }
  return '#ffffff'
}

export function applyAccent(hex: string): void {
  const root = document.documentElement.style
  root.setProperty('--accent', hex)
  root.setProperty('--accent-ink', inkFor(hex))
  root.setProperty('--accent-text', readableOnDark(hex))
}

// localStorage lives in the app's data folder, so the choice survives restarts.
export function loadAccent(): string {
  try {
    const saved = localStorage.getItem(KEY)
    return isHex(saved) ? saved : DEFAULT_ACCENT
  } catch {
    return DEFAULT_ACCENT
  }
}

export function saveAccent(hex: string): void {
  try {
    localStorage.setItem(KEY, hex)
  } catch {
    // Storage unavailable: the color still applies for this session.
  }
}

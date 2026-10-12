import type { Cultivation, EditLot, SpeciesSummary } from './types'

// Stesse formule del backend (Services/Agronomy.cs), qui per i calcoli in tempo reale nell'editor.

export const spacingArea = (s: SpeciesSummary) => Math.max(0.0025, (s.spacingRowCm / 100) * (s.spacingPlantCm / 100))
export const defaultDepth = (s: SpeciesSummary) => Math.max(15, s.container.minDepthCm)
export const area = (l: { w: number; h: number }) => Math.round(l.w * l.h * 1000) / 1000

export function plantsInLot(s: SpeciesSummary, l: EditLot, c: Cultivation) {
  const a = area(l)
  if (c === 'Terra') return Math.max(1, Math.floor(a / spacingArea(s) + 1e-6))
  const liters = a * ((l.depthCm ?? defaultDepth(s)) / 100) * 1000
  const byVolume = Math.floor(liters / Math.max(1, s.container.minLiters) + 1e-6)
  const bySpace = Math.floor(a / (spacingArea(s) * 0.6) + 1e-6)
  return Math.max(1, Math.min(byVolume, Math.max(1, bySpace)))
}

/** kg per ciclo: superficie × resa media × fattore climatico (0,4 → 1 con l'idoneità 0 → 100). */
export const estimatedYield = (s: SpeciesSummary, areaM2: number, fitness: number) =>
  Math.round(areaM2 * s.yieldKgM2 * (0.4 + 0.6 * Math.min(100, Math.max(0, fitness)) / 100) * 10) / 10

export const potLiters = (l: EditLot) => area(l) * ((l.depthCm ?? 30) / 100) * 1000

export const categoryColor: Record<string, string> = {
  Frutto: '#d9654b',
  Foglia: '#5e9e4f',
  Radice: '#e39a3b',
  Tubero: '#b38a5a',
  Bulbo: '#a57bc4',
  Legume: '#3f9b8f',
  Aromatica: '#7fa63a',
  Infiorescenza: '#4f8a6b',
  Grumolo: '#9db86a',
}

type Rect = { x: number; y: number; w: number; h: number }

export const overlaps = (a: Rect, b: Rect, eps = 0.001) =>
  a.x < b.x + b.w - eps && b.x < a.x + a.w - eps && a.y < b.y + b.h - eps && b.y < a.y + a.h - eps

export const round2 = (n: number) => Math.round(n * 100) / 100

/** Cerca il primo spazio libero per un rettangolo w×h (scansione a passi di 5 cm). */
export function findFreeSpot(W: number, L: number, lots: Rect[], w: number, h: number, step = 0.05): Rect | null {
  for (let y = 0; y + h <= L + 1e-6; y += step)
    for (let x = 0; x + w <= W + 1e-6; x += step) {
      const r = { x: round2(x), y: round2(y), w, h }
      if (!lots.some(l => overlaps(l, r))) return r
    }
  return null
}

/** Dimensione di un vaso/fioriera adatta alla specie: 1 pianta se grande, 2 se media, 4 se piccola. */
export function potSize(p: SpeciesSummary) {
  const ml = p.container.minLiters
  const plants = ml >= 15 ? 1 : ml >= 8 ? 2 : 4
  const depthCm = Math.max(15, p.container.minDepthCm)
  const a = (plants * ml) / 1000 / (depthCm / 100)
  let w = Math.sqrt(a), h = w
  if (w > 0.5) { h = 0.4; w = a / h }
  return { w: Math.max(0.2, Math.ceil(w * 20) / 20), h: Math.max(0.2, Math.ceil(h * 20) / 20), depthCm }
}

/**
 * Lotto proposto quando si aggiunge una coltura: in terra ~4 piante per le specie grandi, ~1 m² per le piccole
 * (tra 1 e 4 m²), con dimensioni ridotte progressivamente se non c'è spazio libero.
 */
export function proposeLot(p: SpeciesSummary, c: Cultivation, W: number, L: number, lots: Rect[]): (Rect & { depthCm?: number }) | null {
  if (c === 'Vaso') {
    const ps = potSize(p)
    for (const k of [1, 0.85, 0.7]) {
      const w = Math.max(0.2, Math.round(ps.w * k * 20) / 20), h = Math.max(0.2, Math.round(ps.h * k * 20) / 20)
      const r = findFreeSpot(W, L, lots, w, h)
      if (r) return { ...r, depthCm: ps.depthCm }
    }
    return null
  }
  const target = Math.min(4, Math.max(1, spacingArea(p) * 4))
  let side = Math.ceil(Math.sqrt(target) * 20) / 20
  while (side >= 0.3) {
    const w = Math.min(side * 1.2, W), h = Math.min(target / Math.max(w, 0.1), L)
    for (const [a, b] of [[w, h], [h, w], [side, side]]) {
      const ww = Math.max(0.3, Math.round(a * 20) / 20), hh = Math.max(0.3, Math.round(b * 20) / 20)
      const r = findFreeSpot(W, L, lots, ww, hh)
      if (r) return r
    }
    side = Math.round(side * 0.75 * 20) / 20
  }
  return null
}

let tmp = 0
export const newKey = () => `new-${Date.now().toString(36)}-${tmp++}`

/**
 * Disposizione iniziale proposta dal wizard.
 * Terra: strisce parallele al lato corto, con camminamenti di 30 cm quando c'è spazio.
 * Vaso: un contenitore per specie, dimensionato sul volume minimo per pianta, disposti a scaffale.
 */
export function autoLayout(W: number, L: number, picks: SpeciesSummary[], c: Cultivation, plantedOn: string): { lots: EditLot[]; skipped: string[] } {
  const lots: EditLot[] = []
  const skipped: string[] = []
  if (picks.length === 0) return { lots, skipped }

  if (c === 'Terra') {
    const vertical = W >= L // strisce che attraversano il lato corto
    const span = vertical ? W : L
    const depth = vertical ? L : W
    const n = picks.length
    let path = 0.3
    if (span - path * (n - 1) < n * 0.4) path = 0
    const usable = span - path * (n - 1)
    const each = Math.floor((usable / n) * 20) / 20
    if (each < 0.1) return { lots, skipped: picks.map(p => p.name) }
    picks.forEach((p, i) => {
      const pos = round2(i * (each + path))
      lots.push({
        key: newKey(), name: p.name, speciesId: p.id, plantedOn,
        x: vertical ? pos : 0, y: vertical ? 0 : pos,
        w: vertical ? each : round2(depth), h: vertical ? round2(depth) : each,
      })
    })
    return { lots, skipped }
  }

  const gap = 0.15
  let x = 0, y = 0, rowH = 0
  for (const p of picks) {
    const { w, h, depthCm } = potSize(p)
    if (x + w > W + 1e-6) { x = 0; y = round2(y + rowH + gap); rowH = 0 }
    if (w > W + 1e-6 || y + h > L + 1e-6) { skipped.push(p.name); continue }
    lots.push({ key: newKey(), name: `Vaso ${p.name.toLowerCase()}`, speciesId: p.id, plantedOn, x: round2(x), y: round2(y), w, h, depthCm })
    x = round2(x + w + gap); rowH = Math.max(rowH, h)
  }
  return { lots, skipped }
}

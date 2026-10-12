import { useLayoutEffect, useRef, useState } from 'react'
import { area, categoryColor, round2 } from '../agro'
import { fmtNum } from '../api'
import type { Cultivation, EditLot, SpeciesSummary } from '../types'

export interface LotInfo {
  species?: SpeciesSummary
  plants?: number
  kg?: number
  invalid?: boolean
  /** 0–1: avanzamento verso il raccolto (vista cruscotto). */
  progress?: number
  badges?: string[]
  dim?: boolean
}

type Mode = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
type Rect = { x: number; y: number; w: number; h: number }

const MIN = 0.1      // lato minimo di un lotto (m)
const SNAP = 0.05    // passo di aggancio (5 cm)
const PAD_L = 36, PAD_T = 26, PAD_R = 10, PAD_B = 10

const snap = (v: number) => Math.round(v / SNAP) * SNAP
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

interface Props {
  widthM: number
  lengthM: number
  cultivation: Cultivation
  lots: EditLot[]
  info: Record<string, LotInfo>
  selected?: string | null
  onSelect?: (key: string | null) => void
  /** Se presente la mappa è modificabile. */
  onChangeLot?: (key: string, r: Rect) => void
  maxHeight?: number
  label?: string
}

export default function GardenMap({ widthM: W, lengthM: L, cultivation, lots, info, selected, onSelect, onChangeLot, maxHeight, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [cw, setCw] = useState(600)
  const drag = useRef<{ key: string; mode: Mode; sx: number; sy: number; orig: Rect; id: number } | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const editable = !!onChangeLot

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(e => setCw(e[0].contentRect.width))
    ro.observe(el)
    setCw(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  const maxH = maxHeight ?? Math.max(260, Math.min(typeof window !== 'undefined' ? window.innerHeight * 0.62 : 520, 640))
  const Ws = Math.max(W, 0.2), Ls = Math.max(L, 0.2)
  const s = Math.max(4, Math.min((cw - PAD_L - PAD_R) / Ws, (maxH - PAD_T - PAD_B) / Ls))
  const svgW = PAD_L + Ws * s + PAD_R, svgH = PAD_T + Ls * s + PAD_B

  const toM = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left - PAD_L) / s, y: (e.clientY - r.top - PAD_T) / s }
  }

  const start = (e: React.PointerEvent, key: string, mode: Mode) => {
    e.stopPropagation()
    onSelect?.(key)
    if (!editable || e.button !== 0) return
    e.preventDefault()
    const lot = lots.find(l => l.key === key)!
    const p = toM(e)
    svgRef.current!.setPointerCapture(e.pointerId)
    drag.current = { key, mode, sx: p.x, sy: p.y, orig: { x: lot.x, y: lot.y, w: lot.w, h: lot.h }, id: e.pointerId }
    setDragging(key)
  }

  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const p = toM(e)
    const dx = p.x - d.sx, dy = p.y - d.sy
    const o = d.orig
    let { x, y, w, h } = o
    if (d.mode === 'move') {
      x = clamp(snap(o.x + dx), 0, Math.max(0, W - o.w))
      y = clamp(snap(o.y + dy), 0, Math.max(0, L - o.h))
    } else {
      if (d.mode.includes('e')) w = clamp(snap(o.x + o.w + dx) - o.x, MIN, W - o.x)
      if (d.mode.includes('s')) h = clamp(snap(o.y + o.h + dy) - o.y, MIN, L - o.y)
      if (d.mode.includes('w')) { const nx = clamp(snap(o.x + dx), 0, o.x + o.w - MIN); w = o.x + o.w - nx; x = nx }
      if (d.mode.includes('n')) { const ny = clamp(snap(o.y + dy), 0, o.y + o.h - MIN); h = o.y + o.h - ny; y = ny }
    }
    onChangeLot!(d.key, { x: round2(x), y: round2(y), w: round2(w), h: round2(h) })
  }

  const end = (e: React.PointerEvent) => {
    if (drag.current?.id === e.pointerId) { drag.current = null; setDragging(null) }
  }

  const onKey = (e: React.KeyboardEvent, lot: EditLot) => {
    if (e.key === 'Escape') { onSelect?.(null); return }
    if (!editable) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(lot.key) } return }
    const step = e.shiftKey ? 0.5 : SNAP
    const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const dv = dirs[e.key]
    if (!dv) return
    e.preventDefault()
    if (e.altKey) {
      const w = clamp(round2(lot.w + dv[0] * step), MIN, W - lot.x)
      const h = clamp(round2(lot.h + dv[1] * step), MIN, L - lot.y)
      onChangeLot!(lot.key, { x: lot.x, y: lot.y, w, h })
    } else {
      onChangeLot!(lot.key, { x: clamp(round2(lot.x + dv[0] * step), 0, W - lot.w), y: clamp(round2(lot.y + dv[1] * step), 0, L - lot.h), w: lot.w, h: lot.h })
    }
  }

  // Griglia: passo adattato alla scala
  const major = s >= 28 ? 1 : s >= 12 ? 2 : s >= 6 ? 5 : 10
  const minor = s >= 90 ? 0.25 : s >= 45 ? 0.5 : null
  const ticks = (len: number, step: number) => Array.from({ length: Math.floor(len / step + 1e-6) + 1 }, (_, i) => round2(i * step))

  const pot = cultivation === 'Vaso'
  const hs = editable && typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 16 : 10

  return (
    <div ref={wrapRef} className="map-wrap">
      <svg ref={svgRef} width={svgW} height={svgH} className={`map${editable ? ' editable' : ''}`}
        role="group" aria-label={label ?? `Vista dall'alto, ${fmtNum(W, 2)} × ${fmtNum(L, 2)} m`}
        onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        onPointerDown={() => onSelect?.(null)}>
        <defs>
          <pattern id="soil" width="14" height="14" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill="var(--soil)" />
            <circle cx="3" cy="4" r="1" fill="var(--soil-dot)" /><circle cx="10" cy="10" r="1.2" fill="var(--soil-dot)" /><circle cx="11" cy="2" r="0.7" fill="var(--soil-dot)" />
          </pattern>
          <pattern id="tiles" width={Math.max(8, s * 0.33)} height={Math.max(8, s * 0.33)} patternUnits="userSpaceOnUse">
            <rect width="100%" height="100%" fill="var(--tile)" />
            <path d={`M0 0H${Math.max(8, s * 0.33)}M0 0V${Math.max(8, s * 0.33)}`} stroke="var(--tile-line)" strokeWidth="1" />
          </pattern>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="rgb(179 38 30 / 0.12)" /><line x1="0" y1="0" x2="0" y2="8" stroke="var(--danger)" strokeWidth="2" />
          </pattern>
        </defs>

        {/* righelli */}
        {ticks(W, major).map(t => (
          <text key={'tx' + t} x={PAD_L + t * s} y={PAD_T - 9} className="ruler" textAnchor={t === 0 ? 'start' : 'middle'}>{fmtNum(t)}{t === 0 ? ' m' : ''}</text>
        ))}
        {ticks(L, major).filter(t => t > 0).map(t => (
          <text key={'ty' + t} x={PAD_L - 6} y={PAD_T + t * s + 4} className="ruler" textAnchor="end">{fmtNum(t)}</text>
        ))}

        <g transform={`translate(${PAD_L} ${PAD_T})`}>
          <rect width={W * s} height={L * s} fill={pot ? 'url(#tiles)' : 'url(#soil)'} rx={pot ? 2 : 6} />
          {minor && ticks(W, minor).map(t => <line key={'mx' + t} x1={t * s} x2={t * s} y1={0} y2={L * s} className="grid minor" />)}
          {minor && ticks(L, minor).map(t => <line key={'my' + t} y1={t * s} y2={t * s} x1={0} x2={W * s} className="grid minor" />)}
          {ticks(W, major).map(t => <line key={'gx' + t} x1={t * s} x2={t * s} y1={0} y2={L * s} className="grid" />)}
          {ticks(L, major).map(t => <line key={'gy' + t} y1={t * s} y2={t * s} x1={0} x2={W * s} className="grid" />)}
          <rect width={W * s} height={L * s} fill="none" className="border" rx={pot ? 2 : 6} />

          {lots.map(l => {
            const i = info[l.key] ?? {}
            const sel = selected === l.key
            const pw = l.w * s, ph = l.h * s
            const color = i.species ? categoryColor[i.species.category] ?? '#6b9c5a' : 'transparent'
            const out = l.x + l.w > W + 0.001 || l.y + l.h > L + 0.001
            const bad = i.invalid || out
            const big = Math.min(pw, ph)
            const ring = i.progress != null && !!i.species
            const emojiSize = ring ? clamp(big * 0.24, 12, 32) : clamp(big * 0.32, 12, 40)
            const r = ring ? emojiSize * 0.78 : emojiSize * 0.5          // raggio del cerchio di avanzamento
            const showText = pw >= 74 && ph >= (ring ? 70 : 52)
            const showStats = pw >= 96 && ph >= (ring ? 96 : 74)
            // blocco centrato verticalmente: cerchio/emoji, nome, dati
            const blockH = 2 * r + (showText ? 16 : 0) + (showStats ? 14 : 0)
            const cy = ph / 2 - blockH / 2 + r
            const pct = ring ? Math.round((i.progress ?? 0) * 100) : 0
            // testi adattati alla larghezza del lotto (stima ~6,5 px per carattere)
            const fits = (t: string, px: number) => t.length * px <= pw - 10
            const statsFull = `${ring ? `${pct}% · ` : ''}${fmtNum(area(l), 2)} m²${i.kg != null ? ` · ~${fmtNum(i.kg)} kg` : ''}`
            const statsShort = ring ? `${pct}%${i.kg != null ? ` · ~${fmtNum(i.kg)} kg` : ''}` : `${fmtNum(area(l), 2)} m²`
            const stats = fits(statsFull, 6.2) ? statsFull : fits(statsShort, 6.2) ? statsShort : ring ? `${pct}%` : ''
            const nameLine = ring && !showStats && fits(`${l.name} · ${pct}%`, 7.3) ? `${l.name} · ${pct}%` : fits(l.name, 7.3) ? l.name : ring && !showStats ? `${pct}%` : ''
            return (
              <g key={l.key} transform={`translate(${l.x * s} ${l.y * s})`} className={`lot${sel ? ' sel' : ''}${i.dim ? ' dim' : ''}`}
                tabIndex={0} role="button"
                aria-label={`${l.name}${i.species ? `, ${i.species.name}` : ', libero'}${ring ? `, ${pct}% verso il raccolto` : ''}, ${fmtNum(l.w, 2)} per ${fmtNum(l.h, 2)} metri, ${fmtNum(area(l), 2)} metri quadrati${i.kg != null ? `, resa stimata ${fmtNum(i.kg)} chili` : ''}`}
                aria-pressed={sel}
                onKeyDown={e => onKey(e, l)}
                onFocus={() => !dragging && onSelect?.(l.key)}
                onPointerDown={e => start(e, l.key, 'move')}>
                <clipPath id={`clip-${l.key}`}><rect width={pw} height={ph} rx={pot ? 8 : 3} /></clipPath>
                <rect width={pw} height={ph} rx={pot ? 8 : 3}
                  fill={i.species ? color : 'rgb(255 255 255 / 0.14)'} fillOpacity={i.species ? 0.88 : 1}
                  className={`lot-body${i.species ? '' : ' empty'}${pot ? ' pot' : ''}`} />
                {i.species && i.plants != null && i.plants <= 60 && <PlantDots n={i.plants} w={pw} h={ph} big={big} />}
                {bad && <rect width={pw} height={ph} rx={pot ? 8 : 3} fill="url(#hatch)" />}
                <g clipPath={`url(#clip-${l.key})`} pointerEvents="none">
                  {ring && <ProgressRing cx={pw / 2} cy={cy} r={r} value={i.progress!} />}
                  <text x={pw / 2} y={cy + emojiSize * 0.35} textAnchor="middle" fontSize={emojiSize}>{i.species?.emoji ?? (pw > 26 && ph > 26 ? '＋' : '')}</text>
                  {showText && nameLine && <text x={pw / 2} y={cy + r + 14} textAnchor="middle" className="lot-name">{nameLine}</text>}
                  {showStats && stats && <text x={pw / 2} y={cy + r + 28} textAnchor="middle" className="lot-stats">{stats}</text>}
                  {i.badges && i.badges.length > 0 && (
                    <text x={pw - 6} y={16} textAnchor="end" fontSize="13">{i.badges.join('')}</text>
                  )}
                </g>
                <rect width={pw} height={ph} rx={pot ? 8 : 3} fill="none" className={`lot-outline${bad ? ' bad' : ''}`} />
                {sel && editable && (['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as Mode[]).map(m => {
                  const hx = m.includes('w') ? 0 : m.includes('e') ? pw : pw / 2
                  const hy = m.includes('n') ? 0 : m.includes('s') ? ph : ph / 2
                  if ((m === 'n' || m === 's') && pw < 40) return null
                  if ((m === 'e' || m === 'w') && ph < 40) return null
                  return <rect key={m} x={hx - hs / 2} y={hy - hs / 2} width={hs} height={hs} rx={2} className={`handle h-${m}`}
                    onPointerDown={e => start(e, l.key, m)} />
                })}
                {dragging === l.key && (
                  <g pointerEvents="none" transform={`translate(${pw / 2} ${l.y * s > 30 ? -10 : Math.min(ph - 8, 24)})`}>
                    <rect x={-70} y={-15} width={140} height={22} rx={11} className="dim-tip" />
                    <text textAnchor="middle" y={0} className="dim-tip-text">{fmtNum(l.w, 2)} × {fmtNum(l.h, 2)} m · {fmtNum(area(l), 2)} m²</text>
                  </g>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

/** Cerchio di avanzamento verso il raccolto attorno all'icona dell'ortaggio (completo e colorato quando è pronto). */
function ProgressRing({ cx, cy, r, value }: { cx: number; cy: number; r: number; value: number }) {
  const v = Math.max(0, Math.min(1, value))
  const sw = Math.max(3, r * 0.2)
  const c = 2 * Math.PI * r
  const done = v >= 1
  return (
    <g className={`pring${done ? ' done' : ''}`}>
      <title>{done ? 'Pronto da raccogliere' : `${Math.round(v * 100)}% verso il raccolto`}</title>
      <circle cx={cx} cy={cy} r={r} className="pring-bg" />
      <circle cx={cx} cy={cy} r={r} className="pring-track" strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r} className="pring-val" strokeWidth={sw}
        strokeDasharray={`${v * c} ${c}`} transform={`rotate(-90 ${cx} ${cy})`} />
    </g>
  )
}

/** Disposizione indicativa delle piante nel lotto (una per pianta, fino a 60). */
function PlantDots({ n, w, h, big }: { n: number; w: number; h: number; big: number }) {
  const nx = Math.max(1, Math.round(Math.sqrt((n * w) / h)))
  const ny = Math.max(1, Math.ceil(n / nx))
  const r = Math.max(1.5, Math.min(5, big / Math.max(nx, ny) / 5))
  const dots = []
  for (let i = 0; i < n; i++) {
    const cx = ((i % nx) + 0.5) * (w / nx), cy = (Math.floor(i / nx) + 0.5) * (h / ny)
    dots.push(<circle key={i} cx={cx} cy={cy} r={r} />)
  }
  return <g className="dots" pointerEvents="none">{dots}</g>
}

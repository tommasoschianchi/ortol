import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api, MONTHS } from '../api'
import type { ClimateProfile, GeoResult, MonthWindow, WaterPoint } from '../types'

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="var(--sprout)" />
      <path d="M16 26V14" stroke="var(--leaf)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 17c-5 0-7-4-7-7 4 0 7 2 7 7zM16 15c0-5 3-8 8-8 0 4-3 8-8 8z" fill="var(--leaf)" />
    </svg>
  )
}

export function Loading({ text = 'Carico i dati…' }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <svg className="sprout-anim" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 36V18M20 22c-6 0-9-5-9-9 5 0 9 3 9 9zM20 19c0-6 4-10 10-10 0 5-4 10-10 10z" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {text}
    </div>
  )
}

export function scoreColor(score: number) {
  if (score >= 80) return 'var(--s-ideale)'
  if (score >= 60) return '#7ea94a'
  if (score >= 40) return '#d1a63a'
  if (score >= 20) return '#d97a3a'
  return 'var(--danger)'
}

/** Indicatore circolare di idoneità (0–100) per una messa a dimora in una data precisa (di norma oggi). */
export function FitnessDial({ score, label, size = 64, showLabel = true, note }: { score: number; label?: string; size?: number; showLabel?: boolean; note?: string }) {
  const stroke = Math.max(5, size / 10)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="dial" style={{ width: size, height: size }} title={`Idoneità: ${score}/100${label ? ` (${label})` : ''}${note ? `\n${note}` : ''}`}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={stroke}
          strokeDasharray={`${(score / 100) * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="val" style={{ fontSize: size * 0.3 }}>
        <span>{score}{showLabel && label && size >= 80 && <small>{label}</small>}</span>
      </div>
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        Idoneità {score} su 100
      </span>
    </div>
  )
}

/** Calendario a 12 mesi delle finestre di messa a dimora. */
export function SeasonStrip({ calendar, big = false, labels = false }: { calendar: MonthWindow[]; big?: boolean; labels?: boolean }) {
  const now = new Date().getMonth() + 1
  const name = (s: string) => ({ Ideale: 'ideale', Possibile: 'possibile', ConProtezione: 'con protezione', NonAdatto: 'non adatto' }[s] ?? s)
  return (
    <div>
      <div className={`season${big ? ' big' : ''}`} role="img"
        aria-label={'Calendario di messa a dimora: ' + calendar.map(w => `${MONTHS[w.month - 1]} ${name(w.status)}`).join(', ')}>
        {calendar.map(w => <span key={w.month} className={`${w.status}${w.month === now ? ' now' : ''}`} title={`${MONTHS[w.month - 1]}: ${name(w.status)}`} />)}
      </div>
      {labels && <div className="season-labels">{MONTHS.map(m => <span key={m}>{m}</span>)}</div>}
    </div>
  )
}

export function SeasonLegend() {
  return (
    <div className="legend">
      <span><i style={{ background: 'var(--s-ideale)' }} />Ideale</span>
      <span><i style={{ background: 'var(--s-possibile)' }} />Possibile</span>
      <span><i style={{ background: 'var(--s-protezione)' }} />Con protezione</span>
      <span><i style={{ background: 'var(--s-no)', border: '1px solid var(--line)' }} />Non adatto</span>
    </div>
  )
}

export function CitySearch({ onPick, initial = '' }: { onPick: (g: GeoResult) => void; initial?: string }) {
  const [q, setQ] = useState(initial)
  const [res, setRes] = useState<GeoResult[]>([])
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState<string>()
  const skip = useRef(false)

  useEffect(() => {
    if (skip.current) { skip.current = false; return }
    if (q.trim().length < 2) { setRes([]); return }
    const t = setTimeout(() => {
      api.searchCity(q).then(r => { setRes(r); setOpen(true); setErr(undefined) }).catch(e => setErr(e.message))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="city-search">
      <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Es. Bologna"
        aria-autocomplete="list" aria-expanded={open} onFocus={() => res.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {err && <div className="small" style={{ color: 'var(--danger)', marginTop: 6 }}>{err}</div>}
      {open && res.length > 0 && (
        <ul className="city-results" role="listbox">
          {res.map(r => (
            <li key={`${r.latitude},${r.longitude}`}>
              <button type="button" onClick={() => { skip.current = true; setQ(r.name); setOpen(false); onPick(r) }}>
                <b>{r.name}</b> <span className="muted small">{[r.region, r.country].filter(Boolean).join(', ')}{r.elevation != null ? ` · ${Math.round(r.elevation)} m` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && q.trim().length >= 2 && res.length === 0 && !err && (
        <ul className="city-results"><li className="small muted" style={{ padding: 10 }}>Nessuna località trovata. Prova con il nome ufficiale del comune.</li></ul>
      )}
    </div>
  )
}

/** Grafico climatico: barre di pioggia mensile + fascia minima/massima. */
export function ClimateChart({ climate, light = false }: { climate: ClimateProfile; light?: boolean }) {
  const W = 520, H = 200, padL = 30, padR = 30, padT = 14, padB = 22
  const ms = climate.months
  const tMin = Math.min(-5, ...ms.map(m => m.tMin)), tMax = Math.max(35, ...ms.map(m => m.tMax))
  const pMax = Math.max(120, ...ms.map(m => m.precipitation))
  const x = (i: number) => padL + ((W - padL - padR) / 12) * (i + 0.5)
  const yT = (t: number) => padT + (H - padT - padB) * (1 - (t - tMin) / (tMax - tMin))
  const yP = (p: number) => padT + (H - padT - padB) * (1 - p / pMax)
  const bw = (W - padL - padR) / 12 * 0.55
  const ink = light ? 'var(--leaf-ink)' : 'var(--ink)'
  const top = ms.map((m, i) => `${x(i)},${yT(m.tMax)}`).join(' ')
  const bottom = ms.map((m, i) => `${x(i)},${yT(m.tMin)}`).reverse().join(' ')
  return (
    <svg className="climate-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Temperature medie minime e massime e piogge mensili">
      {[0, 10, 20, 30].filter(t => t >= tMin && t <= tMax).map(t => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={yT(t)} y2={yT(t)} stroke={ink} strokeOpacity={t === 0 ? 0.35 : 0.12} strokeDasharray={t === 0 ? '4 3' : undefined} />
          <text x={padL - 6} y={yT(t) + 4} fontSize="10" textAnchor="end" fill={ink} opacity="0.7">{t}°</text>
        </g>
      ))}
      {ms.map((m, i) => (
        <rect key={i} x={x(i) - bw / 2} y={yP(m.precipitation)} width={bw} height={H - padB - yP(m.precipitation)} fill="var(--water)" opacity={light ? 0.55 : 0.35} rx="2">
          <title>{`${MONTHS[i]}: ${m.precipitation} mm`}</title>
        </rect>
      ))}
      <polygon points={`${top} ${bottom}`} fill={light ? 'var(--sprout)' : 'var(--s-possibile)'} opacity="0.35" />
      <polyline points={top} fill="none" stroke="#e0603f" strokeWidth="2.5" />
      <polyline points={ms.map((m, i) => `${x(i)},${yT(m.tMin)}`).join(' ')} fill="none" stroke={light ? '#9fd0ff' : 'var(--water)'} strokeWidth="2.5" />
      {ms.map((_, i) => (
        <text key={i} x={x(i)} y={H - 6} fontSize="10" textAnchor="middle" fill={ink} opacity="0.75">{MONTHS[i]}</text>
      ))}
      <text x={W - padR + 6} y={yP(pMax) + 10} fontSize="10" fill={ink} opacity="0.7">{pMax} mm</text>
    </svg>
  )
}

/** Andamento della riserva idrica del suolo: barra = deficit, linea = soglia d'intervento. */
export function WaterChart({ points }: { points: WaterPoint[] }) {
  if (points.length === 0) return null
  const W = 300, H = 90, pad = 4
  const max = Math.max(...points.map(p => Math.max(p.depletion, p.raw)), 5) * 1.1
  const bw = (W - pad * 2) / points.length
  const y = (v: number) => H - 14 - (H - 20) * (v / max)
  return (
    <svg className="waterchart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Acqua mancante nel suolo negli ultimi giorni e nei prossimi">
      {points.map((p, i) => (
        <g key={p.date}>
          <rect x={pad + i * bw + 1} y={y(p.depletion)} width={bw - 2} height={H - 14 - y(p.depletion)}
            fill={p.depletion >= p.raw ? 'var(--harvest)' : 'var(--water)'} opacity={p.forecast ? 0.35 : 0.8} rx="1.5">
            <title>{`${p.date}: mancano ${p.depletion} mm${p.rain ? ` · pioggia ${p.rain} mm` : ''}${p.irrigation ? ' · irrigato' : ''}`}</title>
          </rect>
          {p.irrigation > 0 && <circle cx={pad + i * bw + bw / 2} cy={H - 6} r="3" fill="var(--water)" />}
          {p.rain >= 2 && <text x={pad + i * bw + bw / 2} y={H - 3} fontSize="8" textAnchor="middle" fill="var(--water)">●</text>}
        </g>
      ))}
      <polyline points={points.map((p, i) => `${pad + i * bw + bw / 2},${y(p.raw)}`).join(' ')} fill="none" stroke="var(--ink)" strokeWidth="1.2" strokeDasharray="3 2" />
    </svg>
  )
}

export function weatherIcon(code?: number, rain = 0) {
  if (code == null) return rain >= 2 ? '🌧️' : '🌤️'
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤️'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 67 || (code >= 80 && code <= 82)) return '🌧️'
  if (code <= 77 || code === 85 || code === 86) return '🌨️'
  return '⛈️'
}

export function Modal({ onClose, children, label }: { onClose: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  // Portale sul body: la finestra resta sopra a tutto anche se aperta da un pannello "sticky"
  return createPortal(
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()}>{children}</div>
    </div>,
    document.body,
  )
}

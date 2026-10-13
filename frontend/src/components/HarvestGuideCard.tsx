import { useMemo } from 'react'
import { todayIso } from '../api'
import type { EditLot, SpeciesSummary } from '../types'

/** Raccolto stimato di un lotto: etichetta per la lista, data (ISO) e se è già in raccolta. */
export interface HarvestEstimate { label: string; iso?: string; now?: boolean }

const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000)

/** Card "Quando raccogliere": per ogni coltura sulla mappa, data stimata, segni di maturazione e come raccogliere. */
export default function HarvestGuideCard({ lots, species, harvest }: {
  lots: EditLot[]; species: Map<string, SpeciesSummary>; harvest: Record<string, HarvestEstimate>
}) {
  const rows = useMemo(() => lots
    .filter(l => l.speciesId && species.has(l.speciesId))
    .map(l => ({ l, sp: species.get(l.speciesId!)!, h: harvest[l.key] ?? { label: 'raccolto incerto' } }))
    // prima chi è in raccolta, poi per data, in fondo le date incerte
    .sort((a, b) => Number(!!b.h.now) - Number(!!a.h.now) || (a.h.iso ?? '9999').localeCompare(b.h.iso ?? '9999')), [lots, species, harvest])

  if (rows.length === 0) return null
  const today = todayIso()
  return (
    <section className="howto harvest-guide" aria-label="Quando raccogliere">
      <div className="assoc-head">
        <b>Quando raccogliere</b>
        <span className="small muted">date stimate e segni da controllare</span>
      </div>
      {rows.map(({ l, sp, h }, i) => {
        const left = h.iso && !h.now ? daysBetween(today, h.iso) : undefined
        const when = h.now ? 'in raccolta ora'
          : left == null ? 'data non stimabile con il clima previsto'
          : left <= 0 ? 'pronta o quasi: controlla i segni'
          : left <= 10 ? `${h.label.replace('raccolto ', '')} · tra ${left} giorni`
          : `${h.label.replace('raccolto ', '')} · tra ${left < 60 ? `${left} giorni` : `circa ${Math.round(left / 30)} mesi`}`
        return (
          <details key={l.key} open={i === 0}>
            <summary>
              <span aria-hidden="true">{sp.emoji}</span> <b>{sp.name}</b>
              {l.name !== sp.name && <span className="muted small"> ({l.name})</span>}
              <span className={`chip${h.now || (left != null && left <= 10) ? ' ok' : ''}`} style={{ marginLeft: 8 }}>{when}</span>
            </summary>
            {sp.harvestSigns && <p className="small"><b>Come riconoscerla:</b> {sp.harvestSigns}</p>}
            {sp.harvestTips && <p className="small"><b>Come raccogliere:</b> {sp.harvestTips}</p>}
            {sp.harvestChecks && sp.harvestChecks.length > 0 && (
              <>
                <p className="small" style={{ marginBottom: 2 }}><b>Per capire se è matura:</b></p>
                <ul className="small howto-checks">{sp.harvestChecks.map(c => <li key={c}>{c}</li>)}</ul>
              </>
            )}
          </details>
        )
      })}
      <p className="small muted" style={{ marginTop: 8 }}>
        Le date sono stime dai gradi-giorno: il meteo reale può anticiparle o ritardarle. Decidono i segni sulla pianta.
      </p>
    </section>
  )
}

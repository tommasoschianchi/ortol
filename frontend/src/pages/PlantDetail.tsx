import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { FitnessDial, Loading, SeasonLegend, SeasonStrip, scoreColor } from '../components/ui'
import type { FitnessResult, PlantSpecies } from '../types'

export default function PlantDetail() {
  const { id, speciesId = '' } = useParams()
  const [data, setData] = useState<{ species: PlantSpecies; fitness?: FitnessResult }>()
  const [err, setErr] = useState<string>()
  useEffect(() => { setData(undefined); api.plant(speciesId, id).then(setData).catch(e => setErr(e.message)) }, [speciesId, id])

  if (err) return <div className="wrap" style={{ paddingTop: 40 }}><div className="error">{err}</div></div>
  if (!data) return <Loading />
  const { species: s, fitness: f } = data
  const t = s.temperature
  const back = id ? `/orto/${id}/piante` : '/piante'
  const link = (pid: string) => id ? `/orto/${id}/piante/${pid}` : `/piante/${pid}`

  // scala termica da -15 a 40 °C
  const pos = (v: number) => `${((Math.max(-15, Math.min(40, v)) + 15) / 55) * 100}%`

  return (
    <div className="wrap">
      <div className="detail-head">
        <div>
          <Link to={back} className="linkbtn">Tutte le piante</Link>
          <div className="row" style={{ marginTop: 14, gap: 18 }}>
            <span className="big-emoji" aria-hidden="true">{s.emoji}</span>
            <div>
              <h1>{s.name}</h1>
              <em className="sci">{s.scientificName}</em> <span className="muted">· {s.family} · {s.lifecycle}</span>
            </div>
          </div>
          <p style={{ maxWidth: '68ch', marginTop: 16 }}>{s.description}</p>
        </div>
        {f && <FitnessDial score={f.score} label={f.label} size={120} />}
      </div>

      <div className="detail-grid">
        {f && (
          <div className="panel full">
            <div className="row"><h3>Idoneità al clima del tuo orto</h3><span className="spacer" /><SeasonLegend /></div>
            <p className="small muted" style={{ marginTop: 4 }}>{f.summary}</p>
            <div style={{ margin: '14px 0 22px' }}><SeasonStrip calendar={f.calendar} big labels /></div>
            {f.components.map(c => (
              <div className="comp" key={c.key}>
                <span><b>{c.label}</b> <span className="muted small">{c.weight > 0 ? `peso ${Math.round(c.weight * 100)}%` : 'moltiplicatore'}</span></span>
                <span className="meter" aria-label={`${Math.round(c.score * 100)}%`}><i style={{ width: `${c.score * 100}%`, background: scoreColor(c.score * 100) }} /></span>
                <small>{c.detail}</small>
              </div>
            ))}
          </div>
        )}

        <div className="panel full">
          <h3>Esigenze termiche</h3>
          <div className="tempscale" aria-hidden="true">
            <span className="opt" style={{ left: pos(t.optMin), width: `calc(${pos(t.optMax)} - ${pos(t.optMin)})` }}><span>ottimo {t.optMin}–{t.optMax} °C</span></span>
            <span className="mark" style={{ left: pos(t.minSurvival) }}><span>danni {t.minSurvival}°</span></span>
            <span className="mark" style={{ left: pos(t.growthMin) }}><span>crescita da {t.growthMin}°</span></span>
            <span className="mark" style={{ left: pos(t.growthMax) }}><span>stress {t.growthMax}°</span></span>
          </div>
          <dl className="facts">
            <dt>Germinazione</dt><dd>minima {t.germMin} °C, ottimale {t.germOpt} °C</dd>
            <dt>Gelo</dt><dd>{t.frostTender ? 'sensibile: non sopporta gelate' : `tollera fino a circa ${t.minSurvival} °C`}</dd>
            <dt>Gradi-giorno</dt><dd>{s.gddToMaturity} GDD sopra {t.baseGdd} °C (≈ {s.daysToMaturity} giorni) fino al raccolto</dd>
            {s.needsVernalization && <><dt>Vernalizzazione</dt><dd>richiede un periodo di freddo per completare il ciclo</dd></>}
          </dl>
        </div>

        <div className="panel">
          <h3>Messa a dimora</h3>
          <dl className="facts" style={{ marginTop: 10 }}>
            <dt>Metodo</dt><dd>{s.planting.method}</dd>
            <dt>Temperatura</dt><dd>media del periodo tra {s.planting.tempMinMean} e {s.planting.tempMaxMean} °C</dd>
            {s.planting.depthCm != null && <><dt>Profondità</dt><dd>{s.planting.depthCm} cm</dd></>}
            <dt>Sesto</dt><dd>{s.planting.spacingRowCm} cm tra le file, {s.planting.spacingPlantCm} cm sulla fila</dd>
            <dt>Esposizione</dt><dd>{s.soil.sun}</dd>
            <dt>Terreno</dt><dd>pH {s.soil.phMin}–{s.soil.phMax}. {s.soil.notes}</dd>
          </dl>
        </div>

        <div className="panel">
          <h3>Acqua</h3>
          <p className="small" style={{ marginTop: 10 }}>{s.water.notes}</p>
          <dl className="facts">
            <dt>Coefficiente colturale</dt><dd>Kc {s.water.kcIni} → {s.water.kcMid} → {s.water.kcEnd} (iniziale, pieno sviluppo, fine ciclo)</dd>
            <dt>Profondità radici</dt><dd>{s.water.rootDepthMin}–{s.water.rootDepthMax} m</dd>
            <dt>Tolleranza allo stress</dt><dd>p = {s.water.depletionFraction}: si interviene quando è consumato il {Math.round(s.water.depletionFraction * 100)}% dell'acqua disponibile</dd>
          </dl>
        </div>

        <div className="panel">
          <h3>Concimazione</h3>
          <dl className="facts" style={{ marginTop: 10 }}>
            <dt>Fabbisogno</dt><dd>{s.nutrition.demand}</dd>
            <dt>Frequenza</dt><dd>{s.nutrition.intervalDays ? `ogni ${s.nutrition.intervalDays} giorni, a partire da ${s.nutrition.startAfterDays} giorni dall'impianto` : 'nessuna concimazione di routine'}</dd>
            <dt>Fase vegetativa</dt><dd>{s.nutrition.vegetative}</dd>
            {s.nutrition.reproductive !== '—' && <><dt>Fase produttiva</dt><dd>{s.nutrition.reproductive}</dd></>}
            <dt>Biologico</dt><dd>{s.nutrition.organic}</dd>
          </dl>
        </div>

        <div className="panel">
          <h3>Resa e coltivazione in vaso</h3>
          <dl className="facts" style={{ marginTop: 10 }}>
            <dt>Resa media</dt><dd>{s.yieldKgM2.toLocaleString('it-IT')} kg/m² per ciclo in un orto familiare</dd>
            <dt>In vaso</dt><dd>{s.container.suitability}</dd>
            <dt>Contenitore</dt><dd>almeno {s.container.minLiters} L di terriccio e {s.container.minDepthCm} cm di profondità per pianta</dd>
          </dl>
          <p className="small" style={{ marginTop: 8 }}>{s.container.notes}</p>
          <p className="small muted">La stima di raccolto nella mappa moltiplica la superficie per questa resa e per un fattore climatico tra 0,4 e 1 legato all'idoneità.</p>
        </div>

        <div className="panel">
          <h3>Raccolta</h3>
          <p className="small" style={{ marginTop: 10 }}><b>Segnali:</b> {s.harvest.signs}</p>
          <p className="small">{s.harvest.tips}</p>
          <p className="small muted">{s.continuousHarvest ? `Raccolta scalare per circa ${s.harvestWindowDays} giorni.` : `Finestra di raccolta di circa ${s.harvestWindowDays} giorni.`}</p>
        </div>

        <div className="panel">
          <h3>Consociazioni</h3>
          <p className="small" style={{ marginTop: 10 }}><b>Vicine favorevoli:</b> <Names ids={s.companions} link={link} /></p>
          <p className="small"><b>Da tenere lontane:</b> <Names ids={s.antagonists} link={link} /></p>
        </div>

        <div className="panel">
          <h3>Avversità e consigli</h3>
          <ul className="plain small" style={{ marginTop: 10 }}>{s.pests.map(p => <li key={p}>{p}</li>)}</ul>
          <ul className="plain small" style={{ marginTop: 10 }}>{s.tips.map(p => <li key={p}>{p}</li>)}</ul>
        </div>
      </div>
    </div>
  )
}

const KNOWN = new Set(['pomodoro','zucchina','peperone','melanzana','lattuga','basilico','carota','cipolla','aglio','patata','fagiolo','pisello','cetriolo','spinacio','bietola','cavolfiore','broccolo','cavolo','rucola','prezzemolo','fragola','zucca','ravanello','finocchio','fava','melone','radicchio'])

function Names({ ids, link }: { ids: string[]; link: (id: string) => string }) {
  if (ids.length === 0) return <span className="muted">nessuna in particolare</span>
  return <>{ids.map((n, i) => (
    <span key={n}>{i > 0 && ', '}{KNOWN.has(n) ? <Link to={link(n)}>{n}</Link> : n}</span>
  ))}</>
}

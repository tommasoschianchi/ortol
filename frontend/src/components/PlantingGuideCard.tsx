import { useMemo } from 'react'
import { fmtNum } from '../api'
import type { EditLot, SpeciesSummary } from '../types'

/** Tecniche di messa a dimora: i metodi del catalogo ("Semina o trapianto"…) si scompongono in queste. */
type Technique = 'semina' | 'trapianto' | 'bulbilli' | 'spicchi' | 'tuberi' | 'piantine'

const ORDER: Technique[] = ['semina', 'trapianto', 'bulbilli', 'spicchi', 'tuberi', 'piantine']

export function techniquesOf(method: string): Technique[] {
  const m = method.toLowerCase()
  const out: Technique[] = []
  if (m.includes('semina')) out.push('semina')
  if (m.includes('trapianto')) out.push('trapianto')
  if (m.includes('bulbill')) out.push('bulbilli')
  if (m.includes('spicch')) out.push('spicchi')
  if (m.includes('tuber')) out.push('tuberi')
  if (m.includes('piantine')) out.push('piantine')
  return out
}

const GUIDE: Record<Technique, { icon: string; title: string; when: string; steps: string[]; pot: string }> = {
  semina: {
    icon: '🌰', title: 'Semina diretta',
    when: 'Il seme va direttamente nel punto in cui la pianta crescerà.',
    steps: [
      'Lavora il terreno a 20–30 cm, togli sassi e radici, poi affina e livella la superficie con il rastrello.',
      'Traccia un solco dritto alla profondità indicata (in genere 2–3 volte il diametro del seme); per le file usa uno spago teso.',
      'Distribuisci i semi radi nel solco, oppure 2–3 semi per buchetta alla distanza sulla fila.',
      'Ricopri con terra fine, premi leggermente con il dorso del rastrello perché il seme aderisca al terreno.',
      'Annaffia a pioggia fine e tieni il terreno sempre umido fino alla nascita: una crosta secca blocca le piantine.',
      'Quando le piantine hanno 2–4 foglie vere, dirada lasciando la più robusta alla distanza indicata.',
    ],
    pot: 'In vaso semina direttamente nel terriccio umido, poi dirada lasciando una pianta ogni volume indicato.',
  },
  trapianto: {
    icon: '🌿', title: 'Trapianto',
    when: 'La pianta cresce prima in semenzaio o in vivaio, poi va a dimora come piantina.',
    steps: [
      'Semina in alveoli o vasetti 4–8 settimane prima (6–8 per pomodoro, peperone e melanzana), oppure compra piantine sane e compatte.',
      'Abitua le piantine all\'aperto 7–10 giorni (indurimento): fuori di giorno, al riparo la notte, aumentando le ore.',
      'Trapianta di sera o in una giornata nuvolosa, con il terreno umido; il pane di terra della piantina va bagnato prima.',
      'Scava una buca poco più grande del pane di terra, posa la piantina al livello del colletto (il pomodoro si può interrare di più: radica anche dal fusto).',
      'Richiudi, premi bene la terra attorno e annaffia subito al piede (circa 1 L per pianta).',
      'Nei primi giorni ripara dal sole forte e annaffia spesso finché la pianta non riprende a crescere (attecchimento).',
    ],
    pot: 'In vaso: prima uno strato drenante, terriccio fino a 2–3 cm dal bordo, piantina al centro alla stessa profondità del vasetto.',
  },
  bulbilli: {
    icon: '🧅', title: 'Bulbilli',
    when: 'Piccoli bulbi (1–2 cm) già pronti, che anticipano il raccolto rispetto al seme.',
    steps: [
      'Scegli bulbilli sodi e senza germogli lunghi; scarta quelli molli o ammuffiti.',
      'In terreno sciolto e ben drenato, senza letame fresco (favorisce marciumi).',
      'Infila ogni bulbillo con la punta verso l\'alto, appena coperto di terra (la punta può restare a filo).',
      'Distanzia 8–10 cm sulla fila; annaffia leggermente e poi solo se il terreno è asciutto.',
    ],
    pot: 'In vaso funzionano bene in cassette profonde almeno 20 cm.',
  },
  spicchi: {
    icon: '🧄', title: 'Spicchi',
    when: 'Ogni spicchio di una testa sana diventa una nuova testa.',
    steps: [
      'Separa gli spicchi solo il giorno della piantagione e usa i più grossi, quelli esterni.',
      'Pianta in ottobre–novembre (o a febbraio) in terreno drenato: i ristagni fanno marcire lo spicchio.',
      'Interra ogni spicchio con la punta in alto, a 3–5 cm di profondità.',
      'Distanzia 10–15 cm sulla fila; dopo l\'impianto annaffia poco, l\'aglio teme l\'eccesso d\'acqua.',
    ],
    pot: 'In vaso servono almeno 20 cm di terriccio; lascia 10 cm tra gli spicchi.',
  },
  tuberi: {
    icon: '🥔', title: 'Tuberi seme',
    when: 'Si pianta il tubero (o un suo pezzo con gemme): è la parte che germoglia.',
    steps: [
      'Usa tuberi da seme certificati di 40–60 g; quelli grandi tagliali a pezzi con almeno 2 gemme ("occhi") e lasciali asciugare 1–2 giorni.',
      'Pre-germoglia 2–3 settimane in un luogo luminoso e fresco, finché le gemme hanno germogli corti e verdi.',
      'Apri un solco profondo circa 10 cm, posa i tuberi con i germogli verso l\'alto e ricopri.',
      'Quando le piante sono alte 15–20 cm, rincalza: accumula terra attorno al fusto, così i nuovi tuberi restano coperti e non inverdiscono.',
    ],
    pot: 'In vaso o sacco da 30–40 L: parti con 15 cm di terriccio e aggiungine man mano che la pianta cresce.',
  },
  piantine: {
    icon: '🍓', title: 'Piantine (stoloni)',
    when: 'Piantine già radicate, per la fragola spesso nate dagli stoloni della pianta madre.',
    steps: [
      'Accorcia le radici troppo lunghe a circa 10 cm e immergile qualche minuto in acqua.',
      'Scava una buca profonda abbastanza da tenere le radici distese verso il basso, senza piegarle.',
      'Il colletto (la corona da cui escono le foglie) va esattamente a livello del terreno: se interrato marcisce, se scoperto la pianta secca.',
      'Premi la terra, annaffia e pacciama con paglia o telo: tiene puliti i frutti e conserva l\'umidità.',
    ],
    pot: 'In vaso o fioriera: 2–3 L di terriccio per pianta, colletto sempre a filo.',
  },
}

/** Card che spiega come si mettono a dimora, in pratica, le colture presenti sulla mappa (per tecnica). */
export default function PlantingGuideCard({ lots, species, pot }: { lots: EditLot[]; species: Map<string, SpeciesSummary>; pot: boolean }) {
  const groups = useMemo(() => {
    const seen = new Set<string>()
    const map = new Map<Technique, SpeciesSummary[]>()
    for (const l of lots) {
      const sp = l.speciesId ? species.get(l.speciesId) : undefined
      if (!sp || seen.has(sp.id)) continue
      seen.add(sp.id)
      for (const t of techniquesOf(sp.plantingMethod)) map.set(t, [...(map.get(t) ?? []), sp])
    }
    return ORDER.filter(t => map.has(t)).map(t => ({ t, crops: map.get(t)! }))
  }, [lots, species])

  if (groups.length === 0) return null
  return (
    <section className="howto" aria-label="Come mettere a dimora le colture">
      <div className="assoc-head">
        <b>Come mettere a dimora</b>
        <span className="small muted">le colture sulla mappa, per tecnica</span>
      </div>
      {groups.map(({ t, crops }, i) => {
        const g = GUIDE[t]
        return (
          <details key={t} open={i === 0}>
            <summary>
              <span aria-hidden="true">{g.icon}</span> <b>{g.title}</b>
              <span className="muted small"> · {crops.map(c => c.name).join(', ')}</span>
            </summary>
            <p className="small muted">{g.when}</p>
            <ol className="small">
              {g.steps.map(s => <li key={s}>{s}</li>)}
            </ol>
            {pot && <p className="small"><b>In vaso.</b> {g.pot}</p>}
            <ul className="howto-crops small">
              {crops.map(c => (
                <li key={c.id}>
                  <span aria-hidden="true">{c.emoji}</span> <b>{c.name}</b>
                  {c.plantingDepthCm != null && c.plantingDepthCm > 0 && t !== 'trapianto' && t !== 'piantine'
                    ? <> · profondità {fmtNum(c.plantingDepthCm)} cm</> : null}
                  {' · '}{pot ? `almeno ${fmtNum(c.container.minLiters)} L per pianta` : `file a ${c.spacingRowCm} cm, ${c.spacingPlantCm} cm sulla fila`}
                  {techniquesOf(c.plantingMethod).length > 1 && <span className="muted"> · {c.plantingMethod.toLowerCase()}</span>}
                </li>
              ))}
            </ul>
          </details>
        )
      })}
    </section>
  )
}

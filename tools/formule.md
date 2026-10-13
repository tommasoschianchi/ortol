## Formule e modelli del programma

Questa parte descrive come Ortol trasforma clima, meteo e dati delle piante in consigli. Tra parentesi è indicato il file del codice in cui si trova ogni calcolo.

Simboli usati: **T** temperatura (°C), **Tmed** media giornaliera = (Tmax + Tmin) / 2, **ET0** evapotraspirazione di riferimento (mm/giorno), **P** pioggia (mm), **GDD** gradi-giorno.

### 1. Clima e meteo

**Medie climatiche** (`ClimateService.ComputeNormals`). Per ogni orto si scaricano da Open-Meteo i dati giornalieri ERA5 dal 2015 al 2024 (Tmax, Tmin, pioggia, ET0 FAO Penman-Monteith) e si calcolano per ogni mese:

- Tmax, Tmin e Tmed medie;
- pioggia ed ET0 totali medie del mese (somma ÷ numero di anni);
- giorni di gelo (Tmin < 0 °C) e giorni caldi (Tmax ≥ 32 °C) medi per anno;
- ultima gelata primaverile e prima autunnale: mediana degli anni, calcolata solo se almeno metà degli anni ha gelate;
- giorni senza gelo = prima gelata autunnale − ultima primaverile (365 se gela meno di un anno su due).

**Stima di ripiego** (`ClimateService.EstimateFromLocation`), usata solo se l'archivio non risponde:

```
Tmedia annua   = 30 − 0,38 × |latitudine| − 0,0065 × quota(m)
Ampiezza       = 1,5 + 0,21 × |latitudine|            (limitata tra 1 e 16)
Tmed(mese)     = Tmedia annua + Ampiezza × cos(2π × (mese − 7) / 12)     (mese più caldo: luglio a nord, gennaio a sud)
Tmax / Tmin    = Tmed ± 4,5
ET0 (mm/mese)  = max(0,5 ; 0,18 × Tmed + 0,3) × giorni del mese
Pioggia        = 60 mm/mese
```

**Giorno climatico** (`ClimateService.Daily`). I valori mensili si riferiscono a metà mese; per un giorno qualsiasi si interpola linearmente tra i due mesi vicini:

```
posizione = (giorno dell'anno − 15,2) / 30,44
valore    = mese_a + (mese_b − mese_a) × parte decimale di posizione
```

**Pioggia nei giorni climatici** (`ClimateService.AsWeather`). Distribuire la pioggia media su tutti i giorni (2–3 mm al giorno) coprirebbe sempre i consumi. Per questo cade un evento ogni 4 giorni con 4 volte la pioggia media giornaliera.

**Meteo reale** (`WeatherService`). Gli ultimi 30 giorni e i prossimi 10 vengono dalle previsioni Open-Meteo; i giorni più vecchi dall'archivio. I giorni mancanti vengono ricostruiti dalle medie e marcati come stimati.

**Rischio di gelo e minima estrema** (`DayNormal`, `SeasonSimulator.DayFor`):

```
Probabilità di gelata = Φ(−Tmin / σ)            Φ = funzione di ripartizione normale
Minima estrema        = Tmin − scarto
```

| Tipo di giorno | σ (°C) | scarto (°C) |
|---|---|---|
| Media climatica | 3,5 | 6 |
| Meteo osservato | 0,7 | 0 |
| Previsione a *n* giorni | 1,2 + 0,15 × *n* | min(3 ; 0,5 + 0,25 × *n*) |

### 2. Gradi-giorno e fasi

```
GDD del giorno = max(0 ; min(Tmed, T ottimo max) − T base)
Progresso      = GDD accumulati dalla messa a dimora / GDD al raccolto      (0 → 1)
```

Il tetto all'ottimo massimo evita che i giorni molto caldi accelerino lo sviluppo oltre il reale. Il progresso è l'anello attorno all'ortaggio nella mappa.

Le **fasi** dividono il ciclo in proporzione alle durate FAO-56 della pianta (`CareService.StageOf`). Con *f*ini = fase iniziale / totale e *f*dev = (iniziale + sviluppo) / totale:

| Progresso | Fase mostrata |
|---|---|
| < min(0,08 ; *f*ini) | Germinazione (semina) o Attecchimento (trapianto) |
| < *f*dev | Sviluppo vegetativo |
| < 1 | Fioritura e allegagione (frutti, legumi, infiorescenze); Ingrossamento della radice/tubero; Bulbificazione; Ingrossamento del grumolo; Accrescimento fogliare |
| ≥ 1 | In raccolta |

### 3. Data di raccolta

(`CareService.Evaluate`, `HarvestAdviceFor`)

1. Si sommano i GDD giorno per giorno dalla messa a dimora con il meteo osservato e previsto.
2. Oltre la previsione si proseguono con le medie climatiche, al massimo per 330 giorni. Per le piante sensibili al gelo la proiezione si ferma se la probabilità di gelata supera il 25%.
3. La **maturazione** è il giorno in cui i GDD raggiungono quelli richiesti; la **fine della raccolta** è la maturazione + finestra di raccolta.

| Stato | Condizione |
|---|---|
| In crescita | più di 10 giorni alla maturazione |
| Raccolto vicino | 10 giorni o meno |
| Pronto | maturazione raggiunta, entro la finestra |
| In ritardo | finestra superata (piante a raccolta unica) |
| Fine ciclo | finestra superata (piante a raccolta continua) |
| Incerto | il clima non permette di arrivare a maturazione |

### 4. Simulazione del ciclo

(`SeasonSimulator.Simulate`) È il cuore del calendario di semina e dell'idoneità. Partendo da una data di messa a dimora, si avanza giorno per giorno (al massimo 330), usando il meteo reale quando c'è e le medie climatiche per il resto.

**Condizione di messa a dimora:** la media dei primi 3 giorni deve stare nella fascia di messa a dimora della pianta; per le piante sensibili al gelo la probabilità di gelata il primo giorno deve essere ≤ 5%.

**Ogni giorno:**

| Evento | Regola | Esito |
|---|---|---|
| Gelata (piante sensibili) | probabilità > 15% | ciclo fermo per "gelate" (recuperabile con protezione se < 35% e non è il primo giorno) |
| Freddo letale (piante rustiche) | minima estrema < minima sopportata | ciclo fermo per "freddo eccessivo" (recuperabile se lo scarto è ≤ 4 °C) |
| Salita a seme (piante da clima fresco: crescita max ≤ 30 °C, raccolta non continua) | 3 giorni di fila con Tmax > crescita max + 2, dopo il 10° giorno | ciclo fermo per "caldo" |
| Freddo prolungato (piante sensibili) | 3 giorni di fila con Tmed < crescita min − 2 | ciclo fermo, recuperabile con protezione |
| Vernalizzazione | conta i giorni con Tmed < 13 °C | serve ≥ 30 giorni alla maturazione se la pianta la richiede |
| Stress da caldo | Tmax > crescita max | +1 giorno di stress |
| Giorno di crescita | Tmed ≥ crescita min | +1; se Tmed è nella fascia ottimale, +1 giorno ottimale |

Il ciclo **arriva al raccolto** quando i GDD raggiungono quelli richiesti. Una pianta sensibile al gelo che impiega più di 1,6 volte i giorni tipici, o con più di 20 giorni troppo freddi, è considerata non affidabile in piena aria ("crescita troppo lenta con il freddo").

**Stato della messa a dimora:**

| Stato | Condizione |
|---|---|
| Ideale | arriva al raccolto, quota di giorni ottimali ≥ 45% e ≤ 15 giorni di stress da caldo |
| Possibile | arriva al raccolto |
| Solo con protezione | non arriva, ma per un freddo recuperabile e con almeno il 70% dei GDD |
| Non adatto | condizioni di messa a dimora non rispettate, o ciclo non recuperabile |

**Calendario di semina** (`FitnessService.Calendar`): la simulazione ripetuta con messa a dimora il 15 di ogni mese, sulle sole medie climatiche.

### 5. Idoneità (0–100)

(`FitnessService.Evaluate`) Valuta la simulazione del ciclo che parte **oggi**, oppure, per una coltura già piantata, dal giorno della sua messa a dimora.

| Componente | Peso | Punteggio (0–1) |
|---|---|---|
| Arrivo al raccolto | 35% | 1 se arriva; altrimenti min(0,95 ; GDD accumulati / GDD richiesti) |
| Temperature ottimali | 30% | giorni nella fascia ottimale / giorni di crescita |
| Stress da caldo | 15% | 1 − min(1 ; 3 × giorni di stress / giorni del ciclo) |
| Rischio gelate (sensibili) | 20% | 1 − (probabilità di gelata massima nel ciclo − 0,02) / 0,30, tra 0 e 1 |
| Resistenza al freddo (rustiche) | 20% | margine = minima estrema più bassa − minima sopportata; 1 se margine ≥ 2, altrimenti (margine + 6) / 8, tra 0 e 1 |

```
Punteggio base  = Σ peso × punteggio × 100
Distanza        = di quanto la media dei giorni di messa a dimora esce dalla fascia adatta (°C)
Fattore semina  = 0,4 + 0,6 × (1 − min(1 ; distanza / 4))
Idoneità        = Punteggio base × Fattore semina
```

Poi si applicano dei tetti:

- fuori dal periodo di messa a dimora: massimo 50;
- ciclo che non arriva al raccolto: massimo 55 se recuperabile con protezione, altrimenti 35;
- in vaso: × fattore vaso (Ottima 1, Buona 0,9, Discreta 0,7, Sconsigliata 0,4).

Giudizio: ≥ 80 Ottima, ≥ 60 Buona, ≥ 40 Discreta, ≥ 20 Scarsa, sotto Inadatta.

### 6. Consigli di semina

(`FitnessService.Recommend`)

- **Da piantare ora:** la simulazione da oggi è almeno "Solo con protezione". Le specie sconsigliate in vaso non vengono proposte per gli orti in vaso.
- **Fino a quando:** si ripete la simulazione per ognuno dei 120 giorni successivi. L'ultimo giorno ancora "Possibile" o "Ideale" è la chiusura della finestra; l'ultimo giorno consecutivo "Ideale" è la fine del periodo ideale. Con 10 giorni o meno alla chiusura compare l'avviso "la finestra si sta chiudendo".
- **Ciclo lento:** giorni simulati al raccolto / giorni tipici. Oltre 1,5 compare l'avviso.
- **Semina autunnale:** se il raccolto cade nell'anno successivo tra febbraio e luglio.
- **Tra poche settimane:** se oggi non si può, si prova tra 1, 2, 3, 4 e 5 settimane; la prima data "Possibile" o migliore viene proposta.
- **Ordine nella finestra "Aggiungi coltura":** ideale ora → possibile ora → con protezione → tra poche settimane → fuori stagione; a parità, idoneità più alta prima.

### 7. Acqua: bilancio idrico del suolo

(`CareService.Evaluate`, metodo FAO-56, capitolo 8) Il programma segue ogni giorno quanta acqua manca nella zona delle radici (**Dr**, deficit in mm).

**Coefficiente colturale per fase** (*f* = progresso):

```
f < f_ini                → Kc = Kc_ini
f_ini ≤ f < f_dev        → Kc cresce linearmente da Kc_ini a Kc_mid
f_dev ≤ f < f_mid        → Kc = Kc_mid          (anche oltre, se la raccolta è continua)
f_mid ≤ f < 1            → Kc scende linearmente da Kc_mid a Kc_end
f ≥ 1                    → Kc = Kc_end
```

**Consumo, radici e riserva:**

```
ETc            = Kc × ET0 × (1,1 in vaso, 1 in terra)
Radici Zr      = 0,15 m + (Zr max − 0,15) × min(1 ; f / f_dev)
Zr max         = in terra min(0,8 ; media delle profondità radicali) — in vaso 0,9 × profondità del vaso
TAW (mm)       = acqua disponibile del suolo (mm/m) × Zr
p              = p della pianta + 0,04 × (5 − ETc), tra 0,1 e 0,8; dimezzato nei primi 10 giorni (piantine)
RAW (mm)       = p × TAW                               ← soglia di irrigazione
```

| Suolo | Acqua disponibile (mm per metro) |
|---|---|
| Sabbioso | 80 |
| Medio impasto | 140 |
| Argilloso | 180 |
| Terriccio in vaso | 300 |

**Bilancio giornaliero:**

```
Pioggia utile  = P × 0,9 in terra (0,7 in vaso) se P ≥ 2 mm, altrimenti 0
Dr(oggi)       = Dr(ieri) − Pioggia utile − Irrigazione + ETc          (tra 0 e TAW)
```

Il bilancio parte dalla messa a dimora, al massimo 60 giorni fa, con il suolo pieno d'acqua. Un'annaffiatura registrata in litri vale litri / superficie della coltura (1 L/m² = 1 mm); senza quantità si considera che il suolo torni pieno.

**Quando e quanto annaffiare:**

- Si annaffia quando **Dr ≥ RAW**.
- Dose = Dr (minimo max(RAW ; 5 mm)), al massimo 40 mm in terra (oltre si ripete il giorno dopo) o la TAW del vaso.
- Litri = mm × m² (totale sul lotto e per pianta).
- **Aspetta la pioggia:** se servirebbe acqua ma nei prossimi 3 giorni sono previsti almeno 5 mm e almeno l'80% del deficit.
- **Riposo vegetativo:** se la media degli ultimi 7 giorni è sotto la crescita minima, i consumi sono bassi e il programma lo segnala.

**Annaffiature dei prossimi 30 giorni:** si proietta lo stesso bilancio con le previsioni e poi con le medie climatiche, ipotizzando di annaffiare ogni volta che si raggiunge la soglia. Oltre le previsioni si conta solo il 60% della pioggia media (scelta prudente per programmare un'assenza); quelle date sono indicate come stimate.

### 8. Concimazione

(`CareService.FertilizeAdviceFor`)

```
Intervallo     = intervallo della pianta (in vaso × 0,6, minimo 7 giorni: poco terriccio e nutrienti dilavati)
Prima          = messa a dimora + giorni di attesa della pianta
Successive     = ultima concimazione registrata + intervallo
Sospensione    = da (maturazione − giorni di stop) in poi, solo per le piante a raccolta unica
```

Se la pianta è in riposo per il freddo la concimazione viene rimandata. Il consiglio usa il testo "fase vegetativa" fino a *f*dev e "fase produttiva" dopo. Nei 30 giorni le concimazioni sono ripetute a intervalli regolari fino alla sospensione.

### 9. Avvisi e protezioni

(`CareService.AlertsFor` e pianificazione) Sui prossimi 7 giorni di previsione:

| Avviso | Condizione |
|---|---|
| Rischio gelo | pianta sensibile e minima < 3 °C (attività "Coprire" se < 2 °C) |
| Freddo intenso | pianta rustica e minima < minima sopportata + 2 °C |
| Notti fredde | pianta sensibile e minima < crescita min − 5 °C |
| Caldo eccessivo | massima > crescita max |
| Piogge abbondanti | ≥ 40 mm in 3 giorni |
| Coprire: temporale forte | temporale (codice meteo ≥ 95) con ≥ 10 mm, oppure ≥ 25 mm, oppure rovesci violenti (codice 82) con ≥ 15 mm, quando il raccolto è a più di 10 giorni |
| Coprire: grandine | come sopra con codice 96 o 99 |

L'attività di protezione è proposta il giorno prima dell'evento; non viene ripetuta se è stata registrata una protezione da ieri.

**Calendario "Vedi tutto"**: colori per giorno (blu acqua, verde concime, rosso raccolta, nero grandine). Il periodo più lungo senza annaffiature indica quanto si può stare via. Le attività sono ordinate per data, poi priorità (oggi: acqua e protezioni alta, concime media; giorni futuri bassa), poi tipo.

### 10. Lotti, piante e resa

(`Agronomy`, `frontend/src/agro.ts`)

```
m² per pianta        = max(0,0025 ; distanza tra file × distanza sulla fila)
Piante (in terra)    = parte intera di (superficie / m² per pianta), minimo 1
Litri del vaso       = superficie × profondità × 1000
Piante (in vaso)     = min(parte intera di litri / litri minimi ; parte intera di superficie / (0,6 × m² per pianta)), minimo 1
Resa stimata (kg)    = superficie × resa della pianta × (0,4 + 0,6 × idoneità / 100)
```

La profondità predefinita di un vaso è il massimo tra 15 cm e la profondità minima della pianta. L'idoneità usata per la resa è quella da oggi per le nuove colture e quella dalla messa a dimora per le colture già piantate.

**Lotto proposto da "Aggiungi coltura":**

- in terra: superficie obiettivo = 4 × m² per pianta, tra 1 e 4 m²; se non c'è spazio libero si riduce del 25% alla volta;
- in vaso: 1 pianta se servono ≥ 15 L, 2 se ≥ 8 L, altrimenti 4; superficie = piante × litri minimi / profondità;
- il primo spazio libero si cerca a passi di 5 cm.

**Disposizione automatica del primo orto:** in terra strisce parallele al lato corto con camminamenti di 30 cm (se c'è spazio); in vaso un contenitore per specie, a scaffale, con 15 cm tra i vasi.

### 11. Consociazioni nella disposizione

(`frontend/src/agro.ts`)

- Due lotti sono **vicini** se la distanza tra i loro bordi è ≤ 1 m.
- Coppia **sfavorevole** se una delle due schede la indica tale; **favorevole** se una la indica favorevole e nessuna sfavorevole.
- Punteggio della disposizione = +1 per ogni coppia favorevole vicina, −3 per ogni sfavorevole.
- Il suggerimento "Sposta/Scambia" prova tutti gli scambi di coltura tra due lotti (anche verso un lotto vuoto), escludendo le colture già in terra, e propone quello che aumenta di più il punteggio.

## Origine dei dati

I dati delle piante sono stati scritti come stime da letteratura orticola generale, poi confrontati (ottobre 2026) con fonti verificabili. I valori che non coincidevano sono stati corretti.

| Dati | Fonte di confronto | Specie |
|---|---|---|
| Kc, durate delle fasi, profondità radicali, p | FAO Irrigation and Drainage Paper 56 (Allen et al., 1998), Tab. 11, 12, 22 | tutte quelle presenti nel manuale |
| Temperature di germinazione | California Master Gardener Handbook (Univ. of California, pub. 3382), Tab. 5.2 | tutte quelle presenti |
| Fascia ottimale di crescita | Knott's Handbook for Vegetable Growers (4ª ed.), via Utah State University Extension, "Temperature Management in High Tunnels" (2010) | tutte quelle presenti |
| Cavolfiore: soglie di caldo, epoche, sesti, avversità, durata | Queensland DAF "Cauliflower – Critical Temperature Thresholds"; Regione Emilia-Romagna, disciplinare di produzione integrata Cavoli (2014); University of Maryland Extension; Purdue Extension | cavolfiore |
| Clima e meteo | Open-Meteo (rianalisi ERA5 di Copernicus/ECMWF; previsioni) | — |

Non sono stati verificati su fonti: basilico, rucola, finocchio, radicchio (tutti i dati) e, per tutte le specie, gradi-giorno e temperatura base, giorni tipici, sesti, rese, minime sopportate, concimazione, pH, dati per il vaso, consociazioni e avversità (salvo il cavolfiore). Le formule del programma sono semplificazioni: forniscono ordini di grandezza utili, non previsioni agronomiche certificate.

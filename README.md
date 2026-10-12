# Ortol — monitoraggio scientifico dell'orto

Web app per gestire il proprio orto: suggerisce cosa piantare in base a **stagione e città**, calcola **quando annaffiare, concimare e raccogliere** e mostra per ogni pianta un **indice di idoneità al clima** (0–100) della località.

- **Frontend**: React 18 + TypeScript + Vite (`frontend/`)
- **Backend**: ASP.NET Core 10 Web API (`backend/Ortol.Api/`), nessun pacchetto NuGet esterno
- **Dati meteo**: [Open-Meteo](https://open-meteo.com) (gratuito, senza API key) — geocodifica, archivio storico ERA5, previsioni
- **Persistenza**: file JSON in `backend/Ortol.Api/App_Data/` (`users.json`, `gardens.json`, chiavi di sessione in `keys/`), adatto a uso personale o familiare

## Account

- **Amministratore iniziale**: se in `backend/Ortol.Api/.env` sono impostati `ORTOL_ADMIN_USERNAME` e `ORTOL_ADMIN_PASSWORD` (vedi `.env.example`), al primo avvio Ortol crea quell'amministratore. Altrimenti l'app chiede di crearlo dalla pagina di accesso. La password viene salvata solo come hash; dopo il primo avvio il valore nel `.env` non è più usato e la si cambia dall'app. Il `.env` è escluso da git: tienilo con permessi `600` (`chmod 600 .env`).
- L'amministratore, dalla pagina **Utenti**, crea gli altri account, reimposta le password, assegna o toglie il ruolo di amministratore, disattiva o elimina utenti (eliminare un utente elimina anche i suoi orti). Resta sempre almeno un amministratore attivo.
- Ogni utente vede solo i propri orti. Dopo l'accesso l'app riapre l'ultimo orto usato; se l'utente non ne ha, parte la creazione guidata.
- Sicurezza: password con PBKDF2-SHA256 (600.000 iterazioni), cookie di sessione HttpOnly + SameSite=Strict valido 30 giorni, blocco di 5 minuti dopo 5 tentativi falliti, sessioni invalidate quando si cambia password, ruolo o si disattiva l'account.

## Avvio in sviluppo

Prerequisiti: .NET 10 SDK, Node.js 18+.

```bash
# 1) backend → http://localhost:5080
cd backend/Ortol.Api
dotnet run

# 2) frontend → http://localhost:5173 (le chiamate /api sono inoltrate al backend)
cd frontend
npm install
npm run dev
```

## Build unica di produzione

```bash
cd frontend && npm run build          # scrive la build in backend/Ortol.Api/wwwroot
cd ../backend/Ortol.Api && dotnet publish -c Release -o ../../publish
cd ../../publish && dotnet Ortol.Api.dll --urls http://0.0.0.0:5080
```
Il backend serve anche l'app React. Per cambiare la cartella dei dati: `Storage__Directory=/percorso`.

## Come funzionano i calcoli

| Funzione | Modello |
|---|---|
| **Clima della città** | 10 anni di dati giornalieri (2015–2024) → normali mensili di Tmax/Tmin, pioggia, ET0, giorni di gelo, date mediane di ultima/prima gelata. Se l'archivio non è raggiungibile si usa una stima da latitudine e quota, ricalcolata appena possibile. |
| **Cosa piantare ora** | Per ogni specie si simula giorno per giorno la stagione a partire da oggi sulle normali climatiche: temperatura di messa a dimora, accumulo di **gradi-giorno** (soglia inferiore = zero di vegetazione, superiore = ottimo massimo), stop per gelo/freddo letale, salita a seme col caldo, vernalizzazione. Esito: *Ideale*, *Possibile*, *Con protezione*, *Non adatto*. |
| **Indice di idoneità** | Media pesata: durata della stagione utile (GDD disponibili/richiesti, 40%), quota di giorni in fascia ottimale (30%), stress da caldo (15%), rischio gelo o resistenza al freddo (15%), sulla migliore finestra di impianto dell'anno. |
| **Irrigazione** | Bilancio idrico del suolo FAO-56 (cap. 8): ETc = Kc·ET0 con Kc per fase (FAO-56 Tab. 12), approfondimento radicale progressivo, acqua disponibile TAW dal tipo di terreno, soglia RAW = p·TAW con p corretto per l'ETc. Usa pioggia ed ET0 reali degli ultimi giorni e la previsione; le irrigazioni registrate riportano il suolo alla capacità di campo (o dei litri indicati). |
| **Fase e raccolta** | Gradi-giorno reali dalla messa a dimora (archivio + previsione), proiettati con le normali climatiche per stimare la data di raccolta. |
| **Concimazione** | Calendario per specie (avvio, intervallo, sospensione pre-raccolta), consigli diversi in fase vegetativa e produttiva, rinvio se la pianta è ferma per il freddo; nessuna concimazione di routine per le leguminose. |
| **Terra o vaso** | In vaso: acqua disponibile del terriccio 300 mm/m limitata alla profondità del contenitore, +10% di evapotraspirazione, 70% della pioggia utile, concimazioni ogni ~60% dell'intervallo in terra. L'idoneità è moltiplicata per l'adattabilità della specie al vaso (ottima 1, buona 0,9, discreta 0,7, sconsigliata 0,4); le specie sconsigliate non vengono proposte. |
| **Lotti e resa** | L'orto è disegnato dall'alto in lotti rettangolari (aggancio a 5 cm, niente sovrapposizioni). Piante per lotto: superficie ÷ sesto d'impianto in terra; volume del vaso ÷ litri minimi per pianta in vaso. Resa stimata = superficie × resa media della specie (kg/m²) × (0,4 + 0,6 × idoneità/100). Calcolata in tempo reale nel browser e con la stessa formula nel backend. |
| **Allerte** | Gelo, freddo vicino al limite della specie, caldo eccessivo e piogge abbondanti dalla previsione a 7 giorni. |

La base di conoscenza (`backend/Ortol.Api/Data/plants.json`) copre 27 specie con nome scientifico, famiglia, soglie termiche, GDD, coefficienti colturali, profondità radicale, pH, sesto d'impianto, concimazione, segnali di maturazione, consociazioni e avversità. I valori sono riferimenti agronomici medi: varietà, esposizione e microclima possono spostarli. Il file si può ampliare senza toccare il codice.

## Database

Il modello dei dati (diagramma relazionale, tabelle, chiavi primarie ed esterne) è documentato in [`docs/DATABASE.md`](docs/DATABASE.md); lo script PostgreSQL è [`docs/schema.sql`](docs/schema.sql).

## API principali

| Metodo | Percorso | Descrizione |
|---|---|---|
| GET | `/api/auth/status` | Utente collegato e se serve la configurazione iniziale |
| POST | `/api/auth/setup` · `/login` · `/logout` · `/password` | Primo amministratore, accesso, uscita, cambio password |
| GET/POST/PUT/DELETE | `/api/admin/users[/{id}]` | Gestione utenti (solo amministratori) |
| GET | `/api/geo/search?q=` | Ricerca località |
| POST | `/api/gardens/suggestions` | Clima, piante consigliate e idoneità di tutte le specie per lat/lon e tipo di coltivazione |
| GET/POST | `/api/gardens` | Elenco / creazione orto (dimensioni e lotti) |
| GET | `/api/gardens/{id}` | Dashboard: meteo, stato di ogni coltura, attività del giorno, resa stimata |
| PUT | `/api/gardens/{id}/layout` | Salva dimensioni e lotti; sincronizza le colture di ogni lotto |
| GET | `/api/gardens/{id}/history` | Registro completo delle operazioni |
| POST | `/api/gardens/{id}/plants/{pid}/logs` | Registra irrigazione / concimazione / raccolto |
| POST | `/api/gardens/{id}/logs?plantIds=…` | Registrazione multipla (es. "ho annaffiato tutto") |
| GET | `/api/plants[?gardenId=]` · `/api/plants/{id}[?gardenId=]` | Catalogo e scheda con idoneità |

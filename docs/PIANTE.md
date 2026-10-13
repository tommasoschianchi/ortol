# Ortol — Le piante e le formule

> Documento generato da `tools/genera_doc_piante.py` a partire da `backend/Ortol.Api/Data/plants.json`. Non modificarlo a mano: aggiorna il catalogo e rigenera.

**Indice**

1. [Come leggere i dati](#come-leggere-i-dati)
2. [Tabelle riassuntive](#tabelle-riassuntive)
3. [Calendario di messa a dimora](#calendario-di-messa-a-dimora)
4. [Schede delle piante](#schede-delle-piante)
5. [Formule e modelli del programma](#formule-e-modelli-del-programma)
6. [Origine dei dati](#origine-dei-dati)

## Come leggere i dati

| Campo | Significato | Dove lo usa il programma |
|---|---|---|
| Germinazione min / ott. | Temperatura del suolo minima e ottimale per far germinare il seme (°C) | Solo informativo (scheda pianta) |
| T base | Temperatura sotto cui la pianta non accumula sviluppo (°C) | Gradi-giorno |
| Crescita min / max | Media giornaliera sotto cui la crescita si ferma; massima oltre cui c'è stress da caldo (°C) | Simulazione del ciclo, allerte |
| Ottimo | Fascia di temperatura media in cui la pianta cresce meglio (°C); il massimo è anche il tetto dei gradi-giorno | Idoneità, gradi-giorno |
| Minima sopportata | Minima assoluta oltre cui la pianta subisce danni gravi (°C) | Simulazione (specie rustiche), allerte |
| Sensibile al gelo | Se sì, qualunque gelata è dannosa | Simulazione, allerte, protezioni |
| Messa a dimora | Fascia di temperatura media dell'aria adatta a seminare o trapiantare (°C) | Calendario, idoneità |
| GDD | Gradi-giorno necessari dalla messa a dimora al primo raccolto | Fase, data di raccolta |
| Giorni | Durata tipica del ciclo, in condizioni normali | Confronto con il ciclo simulato, frase "ciclo più lungo" |
| Finestra raccolta | Giorni in cui si raccoglie dopo la maturazione | Stato di raccolta, attività |
| Sesto | Distanza tra le file × distanza sulla fila (cm) | Piante per lotto |
| Resa | Resa media per ciclo in un orto familiare (kg/m²) | Stima del raccolto |
| Kc ini / mid / end | Coefficienti colturali FAO-56: consumo d'acqua della pianta rispetto all'ET0 di riferimento | Bilancio idrico |
| Fasi | Durate relative delle fasi iniziale / sviluppo / piena / finale (giorni FAO-56, usate come proporzioni) | Bilancio idrico, concimazione |
| Radici | Profondità radicale minima e massima (m) | Bilancio idrico |
| p | Frazione di acqua disponibile che si può consumare senza stress (a ETc = 5 mm/giorno) | Soglia di irrigazione |
| Concimazione | Domanda, giorni dalla messa a dimora alla prima concimazione, intervallo, sospensione prima del raccolto | Calendario delle concimazioni |
| Vaso | Adattabilità al vaso, litri e profondità minimi per pianta | Idoneità in vaso, piante per vaso |

## Tabelle riassuntive

### Identità e ciclo

| Pianta | Nome scientifico | Famiglia | Categoria | Ciclo | Messa a dimora | Raccolta continua | Vernalizzazione |
|---|---|---|---|---|---|---|---|
| 🧄 Aglio | *Allium sativum* | Amaryllidaceae | Bulbo | Perenne (coltivato come annuale) | Spicchi | no | sì |
| 🌿 Basilico | *Ocimum basilicum* | Lamiaceae | Aromatica | Annuale | Semina o trapianto | sì | no |
| 🥬 Bietola da coste | *Beta vulgaris subsp. vulgaris var. cicla* | Amaranthaceae | Foglia | Biennale (coltivata come annuale) | Semina o trapianto | sì | no |
| 🥦 Broccolo | *Brassica oleracea var. italica* | Brassicaceae | Infiorescenza | Annuale | Trapianto | sì | no |
| 🥕 Carota | *Daucus carota subsp. sativus* | Apiaceae | Radice | Biennale (coltivata come annuale) | Semina diretta | no | no |
| 🥦 Cavolfiore | *Brassica oleracea var. botrytis* | Brassicaceae | Infiorescenza | Annuale | Trapianto | no | no |
| 🥬 Cavolo cappuccio | *Brassica oleracea var. capitata* | Brassicaceae | Foglia | Biennale (coltivata come annuale) | Trapianto | no | no |
| 🥒 Cetriolo | *Cucumis sativus* | Cucurbitaceae | Frutto | Annuale | Semina diretta o trapianto | sì | no |
| 🧅 Cipolla | *Allium cepa* | Amaryllidaceae | Bulbo | Biennale (coltivata come annuale) | Bulbilli o trapianto | no | no |
| 🫘 Fagiolo | *Phaseolus vulgaris* | Fabaceae | Legume | Annuale | Semina diretta | sì | no |
| 🫛 Fava | *Vicia faba* | Fabaceae | Legume | Annuale | Semina diretta | sì | no |
| 🌱 Finocchio | *Foeniculum vulgare var. azoricum* | Apiaceae | Grumolo | Biennale (coltivato come annuale) | Trapianto o semina | no | no |
| 🍓 Fragola | *Fragaria × ananassa* | Rosaceae | Frutto | Perenne | Piantine | sì | no |
| 🥬 Lattuga | *Lactuca sativa* | Asteraceae | Foglia | Annuale | Semina o trapianto | no | no |
| 🍆 Melanzana | *Solanum melongena* | Solanaceae | Frutto | Annuale | Trapianto | sì | no |
| 🍈 Melone | *Cucumis melo* | Cucurbitaceae | Frutto | Annuale | Trapianto o semina | no | no |
| 🥔 Patata | *Solanum tuberosum* | Solanaceae | Tubero | Annuale | Tuberi seme | no | no |
| 🫑 Peperone | *Capsicum annuum* | Solanaceae | Frutto | Annuale | Trapianto | sì | no |
| 🫛 Pisello | *Pisum sativum* | Fabaceae | Legume | Annuale | Semina diretta | sì | no |
| 🍅 Pomodoro | *Solanum lycopersicum* | Solanaceae | Frutto | Annuale | Trapianto | sì | no |
| 🌿 Prezzemolo | *Petroselinum crispum* | Apiaceae | Aromatica | Biennale | Semina diretta o trapianto | sì | no |
| 🥬 Radicchio | *Cichorium intybus* | Asteraceae | Foglia | Biennale (coltivato come annuale) | Semina o trapianto | no | no |
| 🌱 Ravanello | *Raphanus sativus* | Brassicaceae | Radice | Annuale | Semina diretta | no | no |
| 🌱 Rucola | *Eruca vesicaria subsp. sativa* | Brassicaceae | Foglia | Annuale | Semina diretta | sì | no |
| 🥬 Spinacio | *Spinacia oleracea* | Amaranthaceae | Foglia | Annuale | Semina diretta | sì | no |
| 🎃 Zucca | *Cucurbita maxima / C. moschata* | Cucurbitaceae | Frutto | Annuale | Semina diretta o trapianto | no | no |
| 🥒 Zucchina | *Cucurbita pepo* | Cucurbitaceae | Frutto | Annuale | Semina diretta o trapianto | sì | no |

### Temperature (°C)

| Pianta | Germinaz. min | Germinaz. ott. | T base | Crescita min | Ottimo | Crescita max | Minima sopportata | Sensibile al gelo | Messa a dimora |
|---|---|---|---|---|---|---|---|---|---|
| Aglio | 0 | 18 | 0 | 2 | 13–24 | 30 | -15 | no | 5–16 |
| Basilico | 15 | 24 | 10 | 12 | 20–28 | 35 | 5 | sì | 17–28 |
| Bietola da coste | 5 | 25 | 5 | 5 | 16–18 | 32 | -6 | no | 8–25 |
| Broccolo | 5 | 25 | 4 | 4 | 16–18 | 28 | -5 | no | 10–25 |
| Carota | 4 | 22 | 4 | 6 | 16–18 | 30 | -5 | no | 8–24 |
| Cavolfiore | 5 | 25 | 5 | 5 | 16–18 | 30 | -3 | no | 9–27 |
| Cavolo cappuccio | 5 | 25 | 4 | 4 | 16–18 | 28 | -8 | no | 8–24 |
| Cetriolo | 15 | 28 | 10 | 14 | 18–24 | 35 | 3 | sì | 17–28 |
| Cipolla | 0 | 22 | 5 | 5 | 13–24 | 32 | -8 | no | 6–20 |
| Fagiolo | 16 | 27 | 10 | 12 | 16–21 | 32 | 2 | sì | 15–27 |
| Fava | 3 | 20 | 3 | 3 | 16–18 | 28 | -6 | no | 5–16 |
| Finocchio | 8 | 20 | 6 | 6 | 15–22 | 28 | -3 | no | 12–24 |
| Fragola | 10 | 20 | 5 | 5 | 15–25 | 32 | -15 | no | 8–20 |
| Lattuga | 0 | 18 | 4 | 5 | 16–18 | 27 | -3 | no | 6–23 |
| Melanzana | 15 | 28 | 10 | 15 | 21–29 | 35 | 3 | sì | 17–28 |
| Melone | 16 | 29 | 10 | 15 | 18–24 | 36 | 3 | sì | 18–28 |
| Patata | 7 | 18 | 7 | 8 | 16–18 | 29 | -3 | no | 8–20 |
| Peperone | 15 | 24 | 10 | 15 | 21–24 | 33 | 3 | sì | 17–27 |
| Pisello | 4 | 22 | 4 | 5 | 16–18 | 27 | -5 | no | 5–17 |
| Pomodoro | 10 | 25 | 10 | 13 | 21–24 | 35 | 1 | sì | 15–27 |
| Prezzemolo | 5 | 22 | 4 | 5 | 16–18 | 30 | -8 | no | 8–24 |
| Radicchio | 5 | 20 | 5 | 5 | 12–22 | 30 | -7 | no | 15–25 |
| Ravanello | 5 | 25 | 4 | 5 | 16–18 | 27 | -4 | no | 5–22 |
| Rucola | 5 | 20 | 4 | 5 | 12–20 | 28 | -5 | no | 7–23 |
| Spinacio | 0 | 20 | 2 | 4 | 16–18 | 24 | -9 | no | 4–18 |
| Zucca | 15 | 29 | 10 | 13 | 18–24 | 35 | 2 | sì | 16–26 |
| Zucchina | 15 | 29 | 10 | 13 | 18–24 | 35 | 2 | sì | 16–28 |

### Sviluppo, impianto e resa

| Pianta | GDD al raccolto | Giorni tipici | Finestra raccolta (gg) | Sesto (cm) | m² per pianta | Profondità semina (cm) | Resa (kg/m²) |
|---|---|---|---|---|---|---|---|
| Aglio | 2000 | 220 | 20 | 30 × 12 | 0,036 | 4 | 1,2 |
| Basilico | 500 | 55 | 80 | 30 × 25 | 0,075 | 0,5 | 1 |
| Bietola da coste | 700 | 60 | 120 | 40 × 30 | 0,120 | 2 | 4 |
| Broccolo | 950 | 75 | 40 | 60 × 45 | 0,270 | 5 | 1,5 |
| Carota | 1050 | 80 | 40 | 25 × 5 | 0,013 | 1 | 4 |
| Cavolfiore | 1000 | 80 | 15 | 70 × 60 | 0,420 | 5 | 2,5 |
| Cavolo cappuccio | 1200 | 95 | 30 | 60 × 50 | 0,300 | 5 | 4 |
| Cetriolo | 600 | 55 | 50 | 100 × 50 | 0,500 | 2 | 5 |
| Cipolla | 1700 | 130 | 30 | 30 × 10 | 0,030 | 2 | 3,5 |
| Fagiolo | 600 | 60 | 30 | 50 × 10 | 0,050 | 3 | 1,5 |
| Fava | 1200 | 160 | 25 | 50 × 15 | 0,075 | 5 | 1,2 |
| Finocchio | 900 | 90 | 20 | 50 × 25 | 0,125 | 1 | 3 |
| Fragola | 1100 | 120 | 50 | 40 × 30 | 0,120 | 0 | 1,2 |
| Lattuga | 650 | 55 | 15 | 30 × 25 | 0,075 | 0,5 | 2,5 |
| Melanzana | 1150 | 80 | 60 | 90 × 50 | 0,450 | 8 | 4 |
| Melone | 1100 | 85 | 25 | 150 × 80 | 1,200 | 2 | 3 |
| Patata | 1000 | 100 | 30 | 70 × 30 | 0,210 | 10 | 3 |
| Peperone | 1100 | 75 | 60 | 70 × 40 | 0,280 | 8 | 3 |
| Pisello | 800 | 70 | 20 | 50 × 5 | 0,025 | 4 | 0,8 |
| Pomodoro | 1150 | 75 | 70 | 100 × 50 | 0,500 | 10 | 6 |
| Prezzemolo | 1000 | 75 | 150 | 25 × 15 | 0,037 | 1 | 1,5 |
| Radicchio | 1100 | 100 | 60 | 35 × 25 | 0,087 | 0,5 | 2 |
| Ravanello | 350 | 30 | 10 | 15 × 4 | 0,006 | 1 | 1,5 |
| Rucola | 400 | 35 | 30 | 20 × 3 | 0,006 | 0,5 | 1,2 |
| Spinacio | 600 | 50 | 30 | 30 × 8 | 0,024 | 2 | 1,5 |
| Zucca | 1300 | 110 | 30 | 200 × 150 | 3,000 | 3 | 3 |
| Zucchina | 550 | 50 | 60 | 120 × 80 | 0,960 | 3 | 5 |

### Acqua (FAO-56)

| Pianta | Kc ini | Kc mid | Kc end | Fasi (gg) | Radici (m) | p |
|---|---|---|---|---|---|---|
| Aglio | 0,7 | 1 | 0,7 | 30/60/90/40 | 0,3–0,5 | 0,3 |
| Basilico | 0,6 | 1 | 0,9 | 20/25/50/20 | 0,3–0,4 | 0,4 |
| Bietola da coste | 0,7 | 1 | 0,95 | 20/30/60/20 | 0,4–0,6 | 0,35 |
| Broccolo | 0,7 | 1,05 | 0,95 | 35/45/40/15 | 0,4–0,6 | 0,45 |
| Carota | 0,7 | 1,05 | 0,95 | 30/40/60/20 | 0,5–1 | 0,35 |
| Cavolfiore | 0,7 | 1,05 | 0,95 | 20/30/20/10 | 0,4–0,7 | 0,45 |
| Cavolo cappuccio | 0,7 | 1,05 | 0,95 | 40/60/50/15 | 0,5–0,8 | 0,45 |
| Cetriolo | 0,6 | 1 | 0,75 | 20/30/40/15 | 0,7–1,2 | 0,5 |
| Cipolla | 0,7 | 1,05 | 0,75 | 15/25/70/40 | 0,3–0,6 | 0,3 |
| Fagiolo | 0,5 | 1,05 | 0,9 | 20/30/30/10 | 0,5–0,7 | 0,45 |
| Fava | 0,5 | 1,15 | 1,1 | 20/30/35/15 | 0,5–0,7 | 0,45 |
| Finocchio | 0,6 | 1 | 0,9 | 25/30/30/15 | 0,4–0,6 | 0,4 |
| Fragola | 0,4 | 0,85 | 0,75 | 30/40/60/30 | 0,2–0,3 | 0,2 |
| Lattuga | 0,7 | 1 | 0,95 | 20/30/15/10 | 0,3–0,5 | 0,3 |
| Melanzana | 0,6 | 1,05 | 0,9 | 30/45/40/25 | 0,7–1,2 | 0,45 |
| Melone | 0,5 | 0,85 | 0,6 | 25/35/40/20 | 0,9–1,5 | 0,45 |
| Patata | 0,5 | 1,15 | 0,75 | 25/30/45/30 | 0,4–0,6 | 0,35 |
| Peperone | 0,6 | 1,05 | 0,9 | 30/35/40/20 | 0,5–1 | 0,3 |
| Pisello | 0,5 | 1,15 | 1,1 | 20/30/35/15 | 0,6–1 | 0,35 |
| Pomodoro | 0,6 | 1,15 | 0,8 | 30/40/45/30 | 0,7–1,5 | 0,4 |
| Prezzemolo | 0,6 | 1 | 0,9 | 25/35/60/30 | 0,3–0,5 | 0,35 |
| Radicchio | 0,7 | 1 | 0,95 | 25/35/30/10 | 0,4–0,6 | 0,4 |
| Ravanello | 0,7 | 0,9 | 0,85 | 5/10/15/5 | 0,3–0,5 | 0,3 |
| Rucola | 0,7 | 1 | 0,95 | 10/10/15/5 | 0,2–0,3 | 0,3 |
| Spinacio | 0,7 | 1 | 0,95 | 20/20/15/5 | 0,3–0,5 | 0,2 |
| Zucca | 0,5 | 1 | 0,8 | 20/30/30/20 | 1–1,5 | 0,35 |
| Zucchina | 0,5 | 0,95 | 0,75 | 25/35/25/15 | 0,6–1 | 0,5 |

### Concimazione, suolo e vaso

| Pianta | Domanda | Prima concim. (gg) | Intervallo (gg) | Stop prima del raccolto (gg) | pH | Esposizione | In vaso | Fattore vaso | L/pianta | Profondità vaso (cm) |
|---|---|---|---|---|---|---|---|---|---|---|
| Aglio | Bassa | 120 | 40 | 45 | 6–7,5 | Pieno sole | Buona | 0,9 | 5 | 20 |
| Basilico | Media | 20 | 20 | 0 | 6–7,5 | Pieno sole | Ottima | 1 | 2 | 15 |
| Bietola da coste | Media | 25 | 25 | 0 | 6–7,5 | Sole o mezz'ombra | Buona | 0,9 | 10 | 30 |
| Broccolo | Alta | 20 | 20 | 10 | 6–7,5 | Pieno sole | Discreta | 0,7 | 25 | 35 |
| Carota | Media | 30 | 30 | 20 | 6–7 | Pieno sole | Buona | 0,9 | 10 | 30 |
| Cavolfiore | Alta | 20 | 20 | 15 | 6,5–7,5 | Pieno sole | Sconsigliata | 0,4 | 30 | 35 |
| Cavolo cappuccio | Alta | 20 | 25 | 20 | 6–7,5 | Pieno sole | Discreta | 0,7 | 25 | 30 |
| Cetriolo | Alta | 20 | 15 | 0 | 6–7 | Pieno sole | Buona | 0,9 | 20 | 30 |
| Cipolla | Media | 30 | 30 | 40 | 6–7,5 | Pieno sole | Discreta | 0,7 | 5 | 20 |
| Fagiolo | Bassa | 30 | nessuna | 0 | 6–7,5 | Pieno sole | Buona | 0,9 | 10 | 25 |
| Fava | Bassa | 30 | nessuna | 0 | 6,5–8 | Pieno sole | Discreta | 0,7 | 15 | 30 |
| Finocchio | Media | 20 | 25 | 15 | 6–7,5 | Pieno sole | Discreta | 0,7 | 10 | 30 |
| Fragola | Media | 30 | 25 | 0 | 5,5–6,5 | Pieno sole | Ottima | 1 | 3 | 20 |
| Lattuga | Media | 15 | 20 | 15 | 6–7 | Sole o mezz'ombra (d'estate) | Ottima | 1 | 3 | 15 |
| Melanzana | Alta | 25 | 15 | 0 | 5,5–6,8 | Pieno sole | Buona | 0,9 | 15 | 30 |
| Melone | Media | 20 | 20 | 20 | 6–7,5 | Pieno sole | Sconsigliata | 0,4 | 40 | 40 |
| Patata | Alta | 30 | 30 | 30 | 5–6,5 | Pieno sole | Buona | 0,9 | 30 | 40 |
| Peperone | Alta | 25 | 15 | 0 | 6–7 | Pieno sole | Ottima | 1 | 10 | 25 |
| Pisello | Bassa | 30 | nessuna | 0 | 6–7,5 | Pieno sole | Discreta | 0,7 | 10 | 25 |
| Pomodoro | Alta | 20 | 15 | 0 | 6–6,8 | Pieno sole (≥ 8 h) | Buona | 0,9 | 20 | 30 |
| Prezzemolo | Media | 30 | 30 | 0 | 6–7 | Sole o mezz'ombra | Ottima | 1 | 3 | 20 |
| Radicchio | Media | 25 | 30 | 20 | 6–7,5 | Pieno sole | Buona | 0,9 | 8 | 25 |
| Ravanello | Bassa | 30 | nessuna | 0 | 6–7 | Sole o mezz'ombra | Ottima | 1 | 3 | 15 |
| Rucola | Bassa | 15 | 30 | 10 | 6–7,5 | Sole o mezz'ombra | Ottima | 1 | 3 | 15 |
| Spinacio | Media | 15 | 20 | 15 | 6,5–7,5 | Sole o mezz'ombra | Ottima | 1 | 5 | 20 |
| Zucca | Alta | 25 | 20 | 30 | 6–7,5 | Pieno sole | Sconsigliata | 0,4 | 80 | 50 |
| Zucchina | Alta | 20 | 15 | 0 | 6–7,5 | Pieno sole | Discreta | 0,7 | 40 | 40 |

### Consociazioni

Il programma considera sfavorevole una coppia se almeno una delle due schede la indica come tale; favorevole se almeno una la indica come favorevole e nessuna come sfavorevole.

| Pianta | Favorevoli | Sfavorevoli |
|---|---|---|
| Aglio | Fragola, Carota, Pomodoro, Lattuga | Fagiolo, Pisello, Fava, Cavolo cappuccio |
| Basilico | Pomodoro, Peperone | ruta |
| Bietola da coste | Cipolla, Lattuga, Cavolo cappuccio | Spinacio |
| Broccolo | sedano, Cipolla, Patata | Fragola, Pomodoro |
| Carota | Cipolla, porro, Lattuga, Pomodoro | aneto |
| Cavolfiore | sedano, Patata, Bietola da coste, Lattuga | Fragola, Pomodoro, Aglio |
| Cavolo cappuccio | sedano, Patata, Bietola da coste | Fragola, Pomodoro, Aglio |
| Cetriolo | Fagiolo, Lattuga, aneto | Patata, Zucchina |
| Cipolla | Carota, Lattuga, Fragola, Bietola da coste | Fagiolo, Pisello, Fava |
| Fagiolo | Patata, Carota, Zucchina, mais | Cipolla, Aglio, Finocchio |
| Fava | Patata, Carota, Cavolo cappuccio | Cipolla, Aglio |
| Finocchio | Lattuga, porro | Pomodoro, Fagiolo, Peperone |
| Fragola | Aglio, Cipolla, Lattuga, Spinacio | Cavolo cappuccio, Cavolfiore, Broccolo |
| Lattuga | Carota, Ravanello, Fragola, Cipolla | Prezzemolo |
| Melanzana | Fagiolo, Basilico, Peperone | Patata, Finocchio |
| Melone | mais, Ravanello | Patata, Cetriolo |
| Patata | Fagiolo, Fava, Cavolo cappuccio | Pomodoro, Zucca, Cetriolo, girasole |
| Peperone | Basilico, Carota, Cipolla | Finocchio, Fagiolo |
| Pisello | Carota, Ravanello, Lattuga | Cipolla, Aglio |
| Pomodoro | Basilico, Carota, Prezzemolo, Lattuga | Patata, Finocchio, Cavolo cappuccio |
| Prezzemolo | Pomodoro, Carota | Lattuga |
| Radicchio | Lattuga, Carota | — |
| Ravanello | Lattuga, Carota, Pisello, Spinacio | Cavolo cappuccio |
| Rucola | Lattuga, Carota | Cavolo cappuccio |
| Spinacio | Fragola, Cavolo cappuccio, Ravanello | Bietola da coste |
| Zucca | mais, Fagiolo | Patata |
| Zucchina | Fagiolo, Cipolla, Lattuga | Patata, Cetriolo |

## Calendario di messa a dimora

Calcolato dal programma per **Parma (medie 2015–2024)**, coltivazione in terra, simulando una messa a dimora a metà di ogni mese sulle medie climatiche (vedi [simulazione del ciclo](#4-simulazione-del-ciclo)). Il numero indica i giorni stimati fino al primo raccolto.

Legenda: 🟩 ideale · 🟨 possibile · 🟧 solo con protezione · ⬜ non adatto

| Pianta | gen | feb | mar | apr | mag | giu | lug | ago | set | ott | nov | dic |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Aglio | ⬜ | 🟩 135 | 🟩 116 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🟨 217 | 🟨 205 | ⬜ |
| Basilico | ⬜ | ⬜ | ⬜ | ⬜ | 🟩 45 | 🟩 34 | 🟩 31 | 🟩 39 | ⬜ | ⬜ | ⬜ | ⬜ |
| Bietola da coste | ⬜ | ⬜ | 🟨 77 | 🟨 60 | 🟨 54 | 🟨 53 | ⬜ | ⬜ | 🟧 | ⬜ | ⬜ | ⬜ |
| Broccolo | ⬜ | ⬜ | ⬜ | 🟨 74 | 🟨 68 | 🟨 67 | ⬜ | ⬜ | 🟧 | ⬜ | ⬜ | ⬜ |
| Carota | ⬜ | ⬜ | 🟨 96 | 🟨 81 | 🟨 75 | 🟨 74 | ⬜ | ⬜ | 🟧 | ⬜ | ⬜ | ⬜ |
| Cavolfiore | ⬜ | ⬜ | 🟨 100 | 🟨 83 | 🟨 77 | 🟨 76 | 🟨 76 | 🟨 89 | ⬜ | ⬜ | ⬜ | ⬜ |
| Cavolo cappuccio | ⬜ | ⬜ | 🟨 107 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🟨 219 | 🟨 222 | 🟨 210 | ⬜ |
| Cetriolo | ⬜ | ⬜ | ⬜ | ⬜ | 🟩 52 | 🟨 43 | 🟨 42 | 🟩 53 | ⬜ | ⬜ | ⬜ | ⬜ |
| Cipolla | ⬜ | 🟩 155 | 🟩 131 | 🟩 110 | 🟨 96 | ⬜ | ⬜ | ⬜ | ⬜ | 🟨 262 | 🟨 243 | ⬜ |
| Fagiolo | ⬜ | ⬜ | ⬜ | ⬜ | 🟨 58 | 🟨 54 | 🟨 54 | 🟩 63 | ⬜ | ⬜ | ⬜ | ⬜ |
| Fava | ⬜ | 🟨 119 | 🟨 100 | 🟨 85 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Finocchio | ⬜ | ⬜ | ⬜ | 🟩 73 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Fragola | ⬜ | ⬜ | 🟩 100 | 🟩 78 | 🟩 64 | ⬜ | ⬜ | ⬜ | ⬜ | 🟨 228 | 🟨 211 | ⬜ |
| Lattuga | ⬜ | ⬜ | 🟨 67 | 🟨 52 | ⬜ | ⬜ | ⬜ | ⬜ | 🟨 57 | ⬜ | ⬜ | ⬜ |
| Melanzana | ⬜ | ⬜ | ⬜ | ⬜ | 🟩 87 | 🟩 76 | 🟩 91 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Melone | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🟨 79 | 🟨 94 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Patata | ⬜ | ⬜ | 🟨 118 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Peperone | ⬜ | ⬜ | ⬜ | ⬜ | 🟨 88 | 🟨 79 | 🟨 94 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Pisello | ⬜ | 🟨 99 | 🟨 78 | 🟨 63 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Pomodoro | ⬜ | ⬜ | ⬜ | ⬜ | 🟨 91 | 🟨 83 | 🟨 107 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Prezzemolo | ⬜ | ⬜ | 🟨 92 | 🟨 77 | 🟨 71 | 🟨 71 | ⬜ | ⬜ | 🟨 195 | 🟨 207 | 🟨 195 | ⬜ |
| Radicchio | ⬜ | ⬜ | ⬜ | ⬜ | 🟨 68 | 🟨 64 | ⬜ | ⬜ | 🟨 225 | 🟨 228 | ⬜ | ⬜ |
| Ravanello | ⬜ | ⬜ | 🟨 44 | 🟨 31 | 🟨 25 | ⬜ | ⬜ | ⬜ | 🟨 25 | 🟨 53 | ⬜ | ⬜ |
| Rucola | ⬜ | ⬜ | 🟩 48 | 🟩 34 | 🟩 26 | 🟨 24 | ⬜ | ⬜ | 🟩 27 | 🟧 | ⬜ | ⬜ |
| Spinacio | ⬜ | 🟨 72 | 🟨 55 | 🟨 42 | 🟨 37 | ⬜ | ⬜ | ⬜ | ⬜ | 🟨 110 | 🟨 135 | 🟨 120 |
| Zucca | ⬜ | ⬜ | ⬜ | ⬜ | 🟨 102 | 🟨 96 | 🟧 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Zucchina | ⬜ | ⬜ | ⬜ | ⬜ | 🟩 48 | 🟨 39 | 🟨 39 | 🟩 46 | ⬜ | ⬜ | ⬜ | ⬜ |

## Schede delle piante

### 🧄 Aglio

*Allium sativum* · Amaryllidaceae · Bulbo · Perenne (coltivato come annuale)

Propagato per bulbilli (spicchi). Richiede un periodo di freddo (vernalizzazione, < 10 °C per 30–60 giorni) per differenziare correttamente il bulbo in spicchi.

| Dato | Valore |
|---|---|
| Messa a dimora | Spicchi, con temperature medie tra 5 e 16 °C, profondità 4 cm |
| Sesto d'impianto | 30 cm tra le file × 12 cm sulla fila |
| Germinazione | minima 0 °C, ottimale 18 °C |
| Crescita | da 2 °C, ottimo 13–24 °C, stress oltre 30 °C |
| Freddo | tollera fino a circa -15 °C |
| Gradi-giorno | 2000 GDD sopra 0 °C (≈ 220 giorni) |
| Raccolta | finestra di 20 giorni, richiede vernalizzazione |
| Resa media | 1,2 kg/m² per ciclo |
| Acqua | Kc 0,7 → 1 → 0,7; fasi 30/60/90/40 gg; radici 0,3–0,5 m; p = 0,3 |
| Concimazione | domanda bassa; prima dopo 120 giorni, poi ogni 40, sospendere 45 giorni prima del raccolto |
| Suolo | pH 6–7,5, pieno sole |
| Vaso | Buona (fattore 0,9): almeno 5 L e 20 cm per pianta |
| Consociazioni | favorevoli: Fragola, Carota, Pomodoro, Lattuga; sfavorevoli: Fagiolo, Pisello, Fava, Cavolo cappuccio |

- **Acqua:** In inverno di solito bastano le piogge. Irrigare in primavera se secco; sospendere un mese prima della raccolta.
- **Suolo:** Teme i ristagni: marciume dei bulbi.
- **Concime in fase vegetativa:** Una leggera concimazione azotata alla ripresa vegetativa primaverile.
- **Concime in fase produttiva:** Potassio durante l'ingrossamento del bulbo.
- **Concimazione organica:** Cenere di legna (potassio) a fine inverno.
- **Quando raccogliere:** Due terzi delle foglie ingiallite e secche.
- **Come raccogliere:** Annodare le foglie a inizio maggio favorisce l'ingrossamento (pratica tradizionale).
- **In vaso:** Fioriera profonda almeno 20 cm, terriccio molto drenante.
- **Avversità:** Ruggine (Puccinia allii), Marciume bianco, Nematodi
- **Consiglio:** Detto popolare: 'pianta l'aglio in ottobre o novembre'. Al Nord evitare zone con ristagno invernale.
- **Consiglio:** Usare spicchi esterni, grossi e sani, da aglio certificato.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb 🟩 mar 🟩 apr ⬜ mag ⬜ giu ⬜ lug ⬜ ago ⬜ set ⬜ ott 🟨 nov 🟨 dic ⬜

### 🌿 Basilico

*Ocimum basilicum* · Lamiaceae · Aromatica · Annuale

Aromatica termofila molto sensibile al freddo: sotto i 10 °C le foglie anneriscono. Ricca di oli essenziali (linalolo, eugenolo, estragolo).

| Dato | Valore |
|---|---|
| Messa a dimora | Semina o trapianto, con temperature medie tra 17 e 28 °C, profondità 0,5 cm |
| Sesto d'impianto | 30 cm tra le file × 25 cm sulla fila |
| Germinazione | minima 15 °C, ottimale 24 °C |
| Crescita | da 12 °C, ottimo 20–28 °C, stress oltre 35 °C |
| Freddo | sensibile al gelo |
| Gradi-giorno | 500 GDD sopra 10 °C (≈ 55 giorni) |
| Raccolta | finestra di 80 giorni, raccolta continua |
| Resa media | 1 kg/m² per ciclo |
| Acqua | Kc 0,6 → 1 → 0,9; fasi 20/25/50/20 gg; radici 0,3–0,4 m; p = 0,4 |
| Concimazione | domanda media; prima dopo 20 giorni, poi ogni 20 |
| Suolo | pH 6–7,5, pieno sole |
| Vaso | Ottima (fattore 1): almeno 2 L e 15 cm per pianta |
| Consociazioni | favorevoli: Pomodoro, Peperone; sfavorevoli: ruta |

- **Acqua:** Terreno costantemente umido ma mai fradicio; teme i ristagni (fusariosi).
- **Suolo:** Leggero e drenato.
- **Concime in fase vegetativa:** Concime azotato leggero per stimolare foglie.
- **Concime in fase produttiva:** Cimare i fiori invece di concimare: la fioritura riduce l'aroma.
- **Concimazione organica:** Humus di lombrico in superficie.
- **Quando raccogliere:** Pianta di almeno 15–20 cm con 3–4 palchi di foglie.
- **Come raccogliere:** Cimare sopra un nodo con due foglie: la pianta si ramifica.
- **In vaso:** Perfetto in vaso, anche sul davanzale.
- **Avversità:** Peronospora del basilico (Peronospora belbahrii), Fusariosi, Lumache
- **Consiglio:** Eliminare le infiorescenze appena compaiono.
- **Consiglio:** Ottimo consociato al pomodoro: ne migliora l'aroma secondo la tradizione orticola.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar ⬜ apr ⬜ mag 🟩 giu 🟩 lug 🟩 ago 🟩 set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🥬 Bietola da coste

*Beta vulgaris subsp. vulgaris var. cicla* · Amaranthaceae · Foglia · Biennale (coltivata come annuale)

Ortaggio da foglia rustico e produttivo, tollera bene sia caldo moderato sia freddo. Raccolta a foglie per mesi.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina o trapianto, con temperature medie tra 8 e 25 °C, profondità 2 cm |
| Sesto d'impianto | 40 cm tra le file × 30 cm sulla fila |
| Germinazione | minima 5 °C, ottimale 25 °C |
| Crescita | da 5 °C, ottimo 16–18 °C, stress oltre 32 °C |
| Freddo | tollera fino a circa -6 °C |
| Gradi-giorno | 700 GDD sopra 5 °C (≈ 60 giorni) |
| Raccolta | finestra di 120 giorni, raccolta continua |
| Resa media | 4 kg/m² per ciclo |
| Acqua | Kc 0,7 → 1 → 0,95; fasi 20/30/60/20 gg; radici 0,4–0,6 m; p = 0,35 |
| Concimazione | domanda media; prima dopo 25 giorni, poi ogni 25 |
| Suolo | pH 6–7,5, sole o mezz'ombra |
| Vaso | Buona (fattore 0,9): almeno 10 L e 30 cm per pianta |
| Consociazioni | favorevoli: Cipolla, Lattuga, Cavolo cappuccio; sfavorevoli: Spinacio |

- **Acqua:** Irrigazioni regolari per foglie tenere.
- **Suolo:** Tollera una lieve salinità.
- **Concime in fase vegetativa:** Azoto dopo ogni taglio importante.
- **Concimazione organica:** Compost o stallatico.
- **Quando raccogliere:** Foglie esterne lunghe 20–30 cm.
- **Come raccogliere:** Lasciare sempre il cuore: ricaccia continuamente.
- **In vaso:** Produce a lungo anche in vaso.
- **Avversità:** Cercospora, Afidi, Lumache
- **Consiglio:** Seminata a fine estate produce fino alla primavera nelle zone miti.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar 🟨 apr 🟨 mag 🟨 giu 🟨 lug ⬜ ago ⬜ set 🟧 ott ⬜ nov ⬜ dic ⬜

### 🥦 Broccolo

*Brassica oleracea var. italica* · Brassicaceae · Infiorescenza · Annuale

Brassicacea da infiorescenza di origine italiana. Dopo il taglio della testa centrale produce getti laterali per settimane.

| Dato | Valore |
|---|---|
| Messa a dimora | Trapianto, con temperature medie tra 10 e 25 °C, profondità 5 cm |
| Sesto d'impianto | 60 cm tra le file × 45 cm sulla fila |
| Germinazione | minima 5 °C, ottimale 25 °C |
| Crescita | da 4 °C, ottimo 16–18 °C, stress oltre 28 °C |
| Freddo | tollera fino a circa -5 °C |
| Gradi-giorno | 950 GDD sopra 4 °C (≈ 75 giorni) |
| Raccolta | finestra di 40 giorni, raccolta continua |
| Resa media | 1,5 kg/m² per ciclo |
| Acqua | Kc 0,7 → 1,05 → 0,95; fasi 35/45/40/15 gg; radici 0,4–0,6 m; p = 0,45 |
| Concimazione | domanda alta; prima dopo 20 giorni, poi ogni 20, sospendere 10 giorni prima del raccolto |
| Suolo | pH 6–7,5, pieno sole |
| Vaso | Discreta (fattore 0,7): almeno 25 L e 35 cm per pianta |
| Consociazioni | favorevoli: sedano, Cipolla, Patata; sfavorevoli: Fragola, Pomodoro |

- **Acqua:** Regolare durante tutto il ciclo.
- **Suolo:** Fertile e fresco.
- **Concime in fase vegetativa:** Azoto per lo sviluppo della pianta.
- **Concime in fase produttiva:** Boro per infiorescenze compatte.
- **Concimazione organica:** Letame o compost in pre-impianto.
- **Quando raccogliere:** Testa compatta, boccioli chiusi verde scuro.
- **Come raccogliere:** Tagliare con 10 cm di stelo: partiranno i getti laterali.
- **In vaso:** Possibile in vasi grandi, resa modesta.
- **Avversità:** Cavolaia, Altica, Afidi
- **Consiglio:** Se compaiono fiori gialli è troppo tardi: raccogliere prima.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar ⬜ apr 🟨 mag 🟨 giu 🟨 lug ⬜ ago ⬜ set 🟧 ott ⬜ nov ⬜ dic ⬜

### 🥕 Carota

*Daucus carota subsp. sativus* · Apiaceae · Radice · Biennale (coltivata come annuale)

Radice fittonante ricca di carotenoidi. Germinazione lenta (10–20 giorni). Il colore migliore si ottiene tra 15 e 21 °C; terreni sassosi o compatti producono radici biforcute.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina diretta, con temperature medie tra 8 e 24 °C, profondità 1 cm |
| Sesto d'impianto | 25 cm tra le file × 5 cm sulla fila |
| Germinazione | minima 4 °C, ottimale 22 °C |
| Crescita | da 6 °C, ottimo 16–18 °C, stress oltre 30 °C |
| Freddo | tollera fino a circa -5 °C |
| Gradi-giorno | 1050 GDD sopra 4 °C (≈ 80 giorni) |
| Raccolta | finestra di 40 giorni |
| Resa media | 4 kg/m² per ciclo |
| Acqua | Kc 0,7 → 1,05 → 0,95; fasi 30/40/60/20 gg; radici 0,5–1 m; p = 0,35 |
| Concimazione | domanda media; prima dopo 30 giorni, poi ogni 30, sospendere 20 giorni prima del raccolto |
| Suolo | pH 6–7, pieno sole |
| Vaso | Buona (fattore 0,9): almeno 10 L e 30 cm per pianta |
| Consociazioni | favorevoli: Cipolla, porro, Lattuga, Pomodoro; sfavorevoli: aneto |

- **Acqua:** Mantenere umido il seminativo fino all'emergenza. Irrigazioni irregolari causano spaccature.
- **Suolo:** Terreno sciolto, profondo, senza sassi; evitare letame fresco (radici biforcute).
- **Concime in fase vegetativa:** Poco azoto, più potassio e fosforo per lo sviluppo della radice.
- **Concime in fase produttiva:** Potassio per dolcezza e conservabilità.
- **Concimazione organica:** Coltivare dopo una coltura letamata l'anno precedente.
- **Quando raccogliere:** Colletto di 2–3 cm di diametro che affiora dal terreno.
- **Come raccogliere:** Bagnare il terreno prima di estrarle; si conservano in terra fino alle gelate forti.
- **In vaso:** Usare varietà corte (tipo Parigina) se il vaso è poco profondo.
- **Avversità:** Mosca della carota (Psila rosae), Nematodi, Alternaria
- **Consiglio:** Diradare a 4–5 cm quando hanno 3–4 foglie.
- **Consiglio:** Consociare con cipolla: gli odori si confondono a vicenda contro le rispettive mosche.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar 🟨 apr 🟨 mag 🟨 giu 🟨 lug ⬜ ago ⬜ set 🟧 ott ⬜ nov ⬜ dic ⬜

### 🥦 Cavolfiore

*Brassica oleracea var. botrytis* · Brassicaceae · Infiorescenza · Annuale

Si consuma l'infiorescenza immatura (corimbo). Il caldo durante la formazione del corimbo produce teste piccole e sgranate; preferisce cicli autunnali.

| Dato | Valore |
|---|---|
| Messa a dimora | Trapianto, con temperature medie tra 9 e 27 °C, profondità 5 cm |
| Sesto d'impianto | 70 cm tra le file × 60 cm sulla fila |
| Germinazione | minima 5 °C, ottimale 25 °C |
| Crescita | da 5 °C, ottimo 16–18 °C, stress oltre 30 °C |
| Freddo | tollera fino a circa -3 °C |
| Gradi-giorno | 1000 GDD sopra 5 °C (≈ 80 giorni) |
| Raccolta | finestra di 15 giorni |
| Resa media | 2,5 kg/m² per ciclo |
| Acqua | Kc 0,7 → 1,05 → 0,95; fasi 20/30/20/10 gg; radici 0,4–0,7 m; p = 0,45 |
| Concimazione | domanda alta; prima dopo 20 giorni, poi ogni 20, sospendere 15 giorni prima del raccolto |
| Suolo | pH 6,5–7,5, pieno sole |
| Vaso | Sconsigliata (fattore 0,4): almeno 30 L e 35 cm per pianta |
| Consociazioni | favorevoli: sedano, Patata, Bietola da coste, Lattuga; sfavorevoli: Fragola, Pomodoro, Aglio |

- **Acqua:** Acqua regolare dal trapianto alla formazione del corimbo.
- **Suolo:** Terreno fertile, argilloso-limoso, ben dotato di calcio.
- **Concime in fase vegetativa:** Abbondante azoto nello sviluppo fogliare.
- **Concime in fase produttiva:** Boro e molibdeno: le carenze causano corimbi cavi o deformi.
- **Concimazione organica:** Letame maturo 4–5 kg/m² prima del trapianto.
- **Quando raccogliere:** Corimbo compatto, bianco, di 15–20 cm, prima che si apra.
- **Come raccogliere:** Legare le foglie sopra il corimbo per mantenerlo bianco (imbianchimento).
- **In vaso:** Pianta grande e ciclo lungo: poco adatto al vaso.
- **Avversità:** Cavolaia (Pieris brassicae), Altica, Afidi ceroso, Tignola delle crucifere (Plutella xylostella), Mosca del cavolo (Delia radicum), Peronospora, Alternariosi
- **Consiglio:** Rete anti-insetto dopo il trapianto contro la cavolaia.
- **Consiglio:** Non ripiantare cavoli o altre brassicacee nello stesso punto prima di 2 anni.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar 🟨 apr 🟨 mag 🟨 giu 🟨 lug 🟨 ago 🟨 set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🥬 Cavolo cappuccio

*Brassica oleracea var. capitata* · Brassicaceae · Foglia · Biennale (coltivata come annuale)

Brassicacea molto rustica che forma una testa compatta di foglie. Il freddo ne aumenta la dolcezza (accumulo di zuccheri).

| Dato | Valore |
|---|---|
| Messa a dimora | Trapianto, con temperature medie tra 8 e 24 °C, profondità 5 cm |
| Sesto d'impianto | 60 cm tra le file × 50 cm sulla fila |
| Germinazione | minima 5 °C, ottimale 25 °C |
| Crescita | da 4 °C, ottimo 16–18 °C, stress oltre 28 °C |
| Freddo | tollera fino a circa -8 °C |
| Gradi-giorno | 1200 GDD sopra 4 °C (≈ 95 giorni) |
| Raccolta | finestra di 30 giorni |
| Resa media | 4 kg/m² per ciclo |
| Acqua | Kc 0,7 → 1,05 → 0,95; fasi 40/60/50/15 gg; radici 0,5–0,8 m; p = 0,45 |
| Concimazione | domanda alta; prima dopo 20 giorni, poi ogni 25, sospendere 20 giorni prima del raccolto |
| Suolo | pH 6–7,5, pieno sole |
| Vaso | Discreta (fattore 0,7): almeno 25 L e 30 cm per pianta |
| Consociazioni | favorevoli: sedano, Patata, Bietola da coste; sfavorevoli: Fragola, Pomodoro, Aglio |

- **Acqua:** Irrigazioni irregolari dopo la formazione della testa la fanno spaccare.
- **Suolo:** Argilloso, fresco, fertile.
- **Concime in fase vegetativa:** Azoto abbondante nella fase di rosetta.
- **Concime in fase produttiva:** Potassio durante la formazione della testa.
- **Concimazione organica:** Letame maturo 4 kg/m².
- **Quando raccogliere:** Testa dura e compatta alla pressione.
- **Come raccogliere:** Resiste in campo diverse settimane in inverno.
- **In vaso:** Possibile in vasi grandi.
- **Avversità:** Cavolaia, Nottue, Afidi
- **Consiglio:** Rotazione di almeno 3 anni tra brassicacee (ernia del cavolo).
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar 🟨 apr ⬜ mag ⬜ giu ⬜ lug ⬜ ago ⬜ set 🟨 ott 🟨 nov 🟨 dic ⬜

### 🥒 Cetriolo

*Cucumis sativus* · Cucurbitaceae · Frutto · Annuale

Cucurbitacea termofila e rampicante, composta al 95% d'acqua. Sensibile al freddo e alle variazioni di umidità (frutti amari per cucurbitacine).

| Dato | Valore |
|---|---|
| Messa a dimora | Semina diretta o trapianto, con temperature medie tra 17 e 28 °C, profondità 2 cm |
| Sesto d'impianto | 100 cm tra le file × 50 cm sulla fila |
| Germinazione | minima 15 °C, ottimale 28 °C |
| Crescita | da 14 °C, ottimo 18–24 °C, stress oltre 35 °C |
| Freddo | sensibile al gelo |
| Gradi-giorno | 600 GDD sopra 10 °C (≈ 55 giorni) |
| Raccolta | finestra di 50 giorni, raccolta continua |
| Resa media | 5 kg/m² per ciclo |
| Acqua | Kc 0,6 → 1 → 0,75; fasi 20/30/40/15 gg; radici 0,7–1,2 m; p = 0,5 |
| Concimazione | domanda alta; prima dopo 20 giorni, poi ogni 15 |
| Suolo | pH 6–7, pieno sole |
| Vaso | Buona (fattore 0,9): almeno 20 L e 30 cm per pianta |
| Consociazioni | favorevoli: Fagiolo, Lattuga, aneto; sfavorevoli: Patata, Zucchina |

- **Acqua:** Umidità costante; lo stress idrico rende i frutti amari.
- **Suolo:** Ricco di sostanza organica.
- **Concime in fase vegetativa:** Equilibrato dopo l'attecchimento.
- **Concime in fase produttiva:** Potassio in produzione.
- **Concimazione organica:** Compost o letame maturo in buca.
- **Quando raccogliere:** Frutto verde scuro, sodo, prima che ingiallisca.
- **Come raccogliere:** Raccogliere spesso: i frutti maturi bloccano la produzione.
- **In vaso:** Con una rete verticale occupa poco spazio.
- **Avversità:** Oidio, Peronospora (Pseudoperonospora cubensis), Afidi
- **Consiglio:** Coltivazione verticale su rete: frutti più puliti, meno malattie.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar ⬜ apr ⬜ mag 🟩 giu 🟨 lug 🟨 ago 🟩 set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🧅 Cipolla

*Allium cepa* · Amaryllidaceae · Bulbo · Biennale (coltivata come annuale)

La bulbificazione è indotta dal fotoperiodo: le varietà a giorno corto bulbificano con 11–12 h di luce, quelle a giorno lungo con 14–16 h. Rustica nelle prime fasi.

| Dato | Valore |
|---|---|
| Messa a dimora | Bulbilli o trapianto, con temperature medie tra 6 e 20 °C, profondità 2 cm |
| Sesto d'impianto | 30 cm tra le file × 10 cm sulla fila |
| Germinazione | minima 0 °C, ottimale 22 °C |
| Crescita | da 5 °C, ottimo 13–24 °C, stress oltre 32 °C |
| Freddo | tollera fino a circa -8 °C |
| Gradi-giorno | 1700 GDD sopra 5 °C (≈ 130 giorni) |
| Raccolta | finestra di 30 giorni |
| Resa media | 3,5 kg/m² per ciclo |
| Acqua | Kc 0,7 → 1,05 → 0,75; fasi 15/25/70/40 gg; radici 0,3–0,6 m; p = 0,3 |
| Concimazione | domanda media; prima dopo 30 giorni, poi ogni 30, sospendere 40 giorni prima del raccolto |
| Suolo | pH 6–7,5, pieno sole |
| Vaso | Discreta (fattore 0,7): almeno 5 L e 20 cm per pianta |
| Consociazioni | favorevoli: Carota, Lattuga, Fragola, Bietola da coste; sfavorevoli: Fagiolo, Pisello, Fava |

- **Acqua:** Radici superficiali. Sospendere le irrigazioni 2–3 settimane prima della raccolta per favorire la conservazione.
- **Suolo:** Terreno sciolto, senza ristagni.
- **Concime in fase vegetativa:** Azoto nelle prime fasi di crescita fogliare.
- **Concime in fase produttiva:** Durante la bulbificazione solo potassio; l'azoto tardivo peggiora la conservazione.
- **Concimazione organica:** Compost maturo; no letame fresco.
- **Quando raccogliere:** Foglie che ingialliscono e si piegano a terra (oltre il 50%).
- **Come raccogliere:** Lasciare asciugare i bulbi al sole 2–3 giorni prima di riporli.
- **In vaso:** Resa bassa per lo spazio occupato.
- **Avversità:** Mosca della cipolla, Peronospora (Peronospora destructor), Tripidi
- **Consiglio:** Scegliere varietà adatte alla latitudine (giorno corto al Sud, giorno lungo al Nord).
- **Consiglio:** Sarchiature frequenti: soffre la competizione con le infestanti.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb 🟩 mar 🟩 apr 🟩 mag 🟨 giu ⬜ lug ⬜ ago ⬜ set ⬜ ott 🟨 nov 🟨 dic ⬜

### 🫘 Fagiolo

*Phaseolus vulgaris* · Fabaceae · Legume · Annuale

Leguminosa azotofissatrice (simbiosi con Rhizobium). Sensibile al freddo: i semi marciscono in terreni sotto 12 °C. Varietà nane (ciclo breve) e rampicanti.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina diretta, con temperature medie tra 15 e 27 °C, profondità 3 cm |
| Sesto d'impianto | 50 cm tra le file × 10 cm sulla fila |
| Germinazione | minima 16 °C, ottimale 27 °C |
| Crescita | da 12 °C, ottimo 16–21 °C, stress oltre 32 °C |
| Freddo | sensibile al gelo |
| Gradi-giorno | 600 GDD sopra 10 °C (≈ 60 giorni) |
| Raccolta | finestra di 30 giorni, raccolta continua |
| Resa media | 1,5 kg/m² per ciclo |
| Acqua | Kc 0,5 → 1,05 → 0,9; fasi 20/30/30/10 gg; radici 0,5–0,7 m; p = 0,45 |
| Concimazione | domanda bassa; nessuna concimazione di routine |
| Suolo | pH 6–7,5, pieno sole |
| Vaso | Buona (fattore 0,9): almeno 10 L e 25 cm per pianta |
| Consociazioni | favorevoli: Patata, Carota, Zucchina, mais; sfavorevoli: Cipolla, Aglio, Finocchio |

- **Acqua:** Fase critica fioritura-allegagione: il caldo secco provoca cascola dei fiori.
- **Suolo:** Non tollera la salinità.
- **Concime in fase vegetativa:** Non serve azoto: lo fissa dall'atmosfera. Eventualmente fosforo e potassio alla semina.
- **Concime in fase produttiva:** Nessuna concimazione di routine.
- **Concimazione organica:** Sfrutta la fertilità residua della coltura precedente.
- **Quando raccogliere:** Fagiolini: baccelli turgidi che si spezzano netti, semi appena accennati. Da sgranare: baccelli secchi.
- **Come raccogliere:** Raccogliere ogni 2–3 giorni per prolungare la produzione.
- **In vaso:** Meglio le varietà nane; le rampicanti richiedono una rete.
- **Avversità:** Afidi neri, Tonchio, Antracnosi, Ruggine
- **Consiglio:** Lasciare le radici nel terreno a fine ciclo: arricchiscono il suolo di azoto.
- **Consiglio:** Ottimo precessore per cavoli e ortaggi esigenti.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar ⬜ apr ⬜ mag 🟨 giu 🟨 lug 🟨 ago 🟩 set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🫛 Fava

*Vicia faba* · Fabaceae · Legume · Annuale

Leguminosa rustica tipica del bacino mediterraneo, seminata in autunno al Centro-Sud e a fine inverno al Nord. Ottimo sovescio azotofissatore.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina diretta, con temperature medie tra 5 e 16 °C, profondità 5 cm |
| Sesto d'impianto | 50 cm tra le file × 15 cm sulla fila |
| Germinazione | minima 3 °C, ottimale 20 °C |
| Crescita | da 3 °C, ottimo 16–18 °C, stress oltre 28 °C |
| Freddo | tollera fino a circa -6 °C |
| Gradi-giorno | 1200 GDD sopra 3 °C (≈ 160 giorni) |
| Raccolta | finestra di 25 giorni, raccolta continua |
| Resa media | 1,2 kg/m² per ciclo |
| Acqua | Kc 0,5 → 1,15 → 1,1; fasi 20/30/35/15 gg; radici 0,5–0,7 m; p = 0,45 |
| Concimazione | domanda bassa; nessuna concimazione di routine |
| Suolo | pH 6,5–8, pieno sole |
| Vaso | Discreta (fattore 0,7): almeno 15 L e 30 cm per pianta |
| Consociazioni | favorevoli: Patata, Carota, Cavolo cappuccio; sfavorevoli: Cipolla, Aglio |

- **Acqua:** Di solito bastano le piogge; irrigare in fioritura se la primavera è secca.
- **Suolo:** Anche argilloso e calcareo.
- **Concime in fase vegetativa:** Nessun azoto (azotofissatrice).
- **Concime in fase produttiva:** Nessuna concimazione di routine.
- **Concimazione organica:** Un po' di fosforo (farina d'ossa) alla semina.
- **Quando raccogliere:** Baccelli gonfi, semi verdi teneri (consumo fresco) o baccelli neri secchi (granella).
- **Come raccogliere:** Cimare le piante in fioritura per ridurre gli afidi neri.
- **In vaso:** Possibile ma con resa modesta.
- **Avversità:** Afide nero (Aphis fabae), Orobanche, Ruggine
- **Consiglio:** Interrare le piante a fine ciclo come sovescio.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb 🟨 mar 🟨 apr 🟨 mag ⬜ giu ⬜ lug ⬜ ago ⬜ set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🌱 Finocchio

*Foeniculum vulgare var. azoricum* · Apiaceae · Grumolo · Biennale (coltivato come annuale)

Si consuma il grumolo formato dalle guaine fogliari ingrossate. Caldo e giorni lunghi inducono la salita a seme: in Italia è tipicamente coltura di fine estate-autunno.

| Dato | Valore |
|---|---|
| Messa a dimora | Trapianto o semina, con temperature medie tra 12 e 24 °C, profondità 1 cm |
| Sesto d'impianto | 50 cm tra le file × 25 cm sulla fila |
| Germinazione | minima 8 °C, ottimale 20 °C |
| Crescita | da 6 °C, ottimo 15–22 °C, stress oltre 28 °C |
| Freddo | tollera fino a circa -3 °C |
| Gradi-giorno | 900 GDD sopra 6 °C (≈ 90 giorni) |
| Raccolta | finestra di 20 giorni |
| Resa media | 3 kg/m² per ciclo |
| Acqua | Kc 0,6 → 1 → 0,9; fasi 25/30/30/15 gg; radici 0,4–0,6 m; p = 0,4 |
| Concimazione | domanda media; prima dopo 20 giorni, poi ogni 25, sospendere 15 giorni prima del raccolto |
| Suolo | pH 6–7,5, pieno sole |
| Vaso | Discreta (fattore 0,7): almeno 10 L e 30 cm per pianta |
| Consociazioni | favorevoli: Lattuga, porro; sfavorevoli: Pomodoro, Fagiolo, Peperone |

- **Acqua:** Lo stress idrico durante l'ingrossamento induce prefioritura e grumoli fibrosi.
- **Suolo:** Fresco e profondo.
- **Concime in fase vegetativa:** Azoto moderato.
- **Concime in fase produttiva:** Potassio per grumoli compatti.
- **Concimazione organica:** Compost maturo.
- **Quando raccogliere:** Grumolo bianco, compatto, grande come un pugno.
- **Come raccogliere:** Rincalzare 2–3 settimane prima per imbianchire.
- **In vaso:** Serve un vaso profondo e acqua costante.
- **Avversità:** Afidi, Lumache, Sclerotinia
- **Consiglio:** Allelopatico: è meglio coltivarlo un po' isolato dalle altre colture.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar ⬜ apr 🟩 mag ⬜ giu ⬜ lug ⬜ ago ⬜ set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🍓 Fragola

*Fragaria × ananassa* · Rosaceae · Frutto · Perenne

Perenne stolonifera. Le varietà unifere fioriscono in primavera dopo il freddo invernale; le rifiorenti producono fino all'autunno.

| Dato | Valore |
|---|---|
| Messa a dimora | Piantine, con temperature medie tra 8 e 20 °C, profondità 0 cm |
| Sesto d'impianto | 40 cm tra le file × 30 cm sulla fila |
| Germinazione | minima 10 °C, ottimale 20 °C |
| Crescita | da 5 °C, ottimo 15–25 °C, stress oltre 32 °C |
| Freddo | tollera fino a circa -15 °C |
| Gradi-giorno | 1100 GDD sopra 5 °C (≈ 120 giorni) |
| Raccolta | finestra di 50 giorni, raccolta continua |
| Resa media | 1,2 kg/m² per ciclo |
| Acqua | Kc 0,4 → 0,85 → 0,75; fasi 30/40/60/30 gg; radici 0,2–0,3 m; p = 0,2 |
| Concimazione | domanda media; prima dopo 30 giorni, poi ogni 25 |
| Suolo | pH 5,5–6,5, pieno sole |
| Vaso | Ottima (fattore 1): almeno 3 L e 20 cm per pianta |
| Consociazioni | favorevoli: Aglio, Cipolla, Lattuga, Spinacio; sfavorevoli: Cavolo cappuccio, Cavolfiore, Broccolo |

- **Acqua:** Radici molto superficiali: irrigazioni frequenti e leggere, meglio a goccia. Non bagnare frutti e foglie (botrite).
- **Suolo:** Leggermente acido, ricco e drenato.
- **Concime in fase vegetativa:** Azoto alla ripresa vegetativa di fine inverno.
- **Concime in fase produttiva:** Potassio in fioritura e fruttificazione per dolcezza.
- **Concimazione organica:** Compost in autunno; pacciamatura con paglia.
- **Quando raccogliere:** Frutto rosso uniforme fino al colletto, profumato.
- **Come raccogliere:** Raccogliere col picciolo nelle ore fresche.
- **In vaso:** Ottima in vasi, fioriere e vasi a tasche.
- **Avversità:** Botrite (muffa grigia), Lumache, Oziorrinco, Drosophila suzukii
- **Consiglio:** Pacciamare con paglia ("straw-berry"): frutti puliti e meno muffe.
- **Consiglio:** Rinnovare l'impianto ogni 3 anni con gli stoloni.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar 🟩 apr 🟩 mag 🟩 giu ⬜ lug ⬜ ago ⬜ set ⬜ ott 🟨 nov 🟨 dic ⬜

### 🥬 Lattuga

*Lactuca sativa* · Asteraceae · Foglia · Annuale

Ortaggio da foglia microtermo a ciclo breve. Sopra i 27 °C va in termodormienza (non germina) e con giorni lunghi e caldo prefiorisce ("monta a seme"), diventando amara.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina o trapianto, con temperature medie tra 6 e 23 °C, profondità 0,5 cm |
| Sesto d'impianto | 30 cm tra le file × 25 cm sulla fila |
| Germinazione | minima 0 °C, ottimale 18 °C |
| Crescita | da 5 °C, ottimo 16–18 °C, stress oltre 27 °C |
| Freddo | tollera fino a circa -3 °C |
| Gradi-giorno | 650 GDD sopra 4 °C (≈ 55 giorni) |
| Raccolta | finestra di 15 giorni |
| Resa media | 2,5 kg/m² per ciclo |
| Acqua | Kc 0,7 → 1 → 0,95; fasi 20/30/15/10 gg; radici 0,3–0,5 m; p = 0,3 |
| Concimazione | domanda media; prima dopo 15 giorni, poi ogni 20, sospendere 15 giorni prima del raccolto |
| Suolo | pH 6–7, sole o mezz'ombra (d'estate) |
| Vaso | Ottima (fattore 1): almeno 3 L e 15 cm per pianta |
| Consociazioni | favorevoli: Carota, Ravanello, Fragola, Cipolla; sfavorevoli: Prezzemolo |

- **Acqua:** Radici superficiali: irrigazioni brevi e frequenti; l'umidità costante evita sapore amaro.
- **Suolo:** Terreno soffice e fresco.
- **Concime in fase vegetativa:** Azoto moderato: eccessi accumulano nitrati nelle foglie.
- **Concime in fase produttiva:** Sospendere la concimazione nelle ultime 2 settimane.
- **Concimazione organica:** Compost ben maturo in pre-semina; evitare letame fresco.
- **Quando raccogliere:** Cespo compatto e pieno; per le varietà da taglio foglie di 10–15 cm.
- **Come raccogliere:** Raccogliere al mattino presto, quando le foglie sono turgide.
- **In vaso:** Ideale in cassette e fioriere basse.
- **Avversità:** Lumache e limacce, Afidi, Peronospora (Bremia lactucae)
- **Consiglio:** Semine scalari ogni 2–3 settimane per avere sempre insalata.
- **Consiglio:** In estate preferire varietà resistenti alla salita a seme e ombreggiare.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar 🟨 apr 🟨 mag ⬜ giu ⬜ lug ⬜ ago ⬜ set 🟨 ott ⬜ nov ⬜ dic ⬜

### 🍆 Melanzana

*Solanum melongena* · Solanaceae · Frutto · Annuale

La più esigente in calore tra le solanacee orticole, di origine indiana. Sotto i 12 °C la crescita si arresta; richiede estati lunghe e calde.

| Dato | Valore |
|---|---|
| Messa a dimora | Trapianto, con temperature medie tra 17 e 28 °C, profondità 8 cm |
| Sesto d'impianto | 90 cm tra le file × 50 cm sulla fila |
| Germinazione | minima 15 °C, ottimale 28 °C |
| Crescita | da 15 °C, ottimo 21–29 °C, stress oltre 35 °C |
| Freddo | sensibile al gelo |
| Gradi-giorno | 1150 GDD sopra 10 °C (≈ 80 giorni) |
| Raccolta | finestra di 60 giorni, raccolta continua |
| Resa media | 4 kg/m² per ciclo |
| Acqua | Kc 0,6 → 1,05 → 0,9; fasi 30/45/40/25 gg; radici 0,7–1,2 m; p = 0,45 |
| Concimazione | domanda alta; prima dopo 25 giorni, poi ogni 15 |
| Suolo | pH 5,5–6,8, pieno sole |
| Vaso | Buona (fattore 0,9): almeno 15 L e 30 cm per pianta |
| Consociazioni | favorevoli: Fagiolo, Basilico, Peperone; sfavorevoli: Patata, Finocchio |

- **Acqua:** Richiede apporti costanti; lo stress idrico rende i frutti amari e legnosi.
- **Suolo:** Terreno fertile e profondo.
- **Concime in fase vegetativa:** Concime equilibrato con azoto per sviluppo della chioma.
- **Concime in fase produttiva:** Potassio in fruttificazione.
- **Concimazione organica:** Letame maturo 4 kg/m² in pre-impianto.
- **Quando raccogliere:** Buccia lucida e tesa; premendo con il dito la polpa torna elastica. Frutto opaco = sovramaturo, semi duri.
- **Come raccogliere:** Raccogliere giovani per frutti più teneri e maggiore produzione.
- **In vaso:** Preferire varietà compatte; il vaso scuro scalda le radici.
- **Avversità:** Dorifora, Ragnetto rosso, Afidi, Verticillosi
- **Consiglio:** Pacciamatura scura per riscaldare il terreno nelle zone fresche.
- **Consiglio:** Tutorare: i frutti sono pesanti.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar ⬜ apr ⬜ mag 🟩 giu 🟩 lug 🟩 ago ⬜ set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🍈 Melone

*Cucumis melo* · Cucurbitaceae · Frutto · Annuale

Cucurbitacea molto termofila; il contenuto zuccherino dipende dalle alte temperature e dalla luce nelle settimane finali di maturazione.

| Dato | Valore |
|---|---|
| Messa a dimora | Trapianto o semina, con temperature medie tra 18 e 28 °C, profondità 2 cm |
| Sesto d'impianto | 150 cm tra le file × 80 cm sulla fila |
| Germinazione | minima 16 °C, ottimale 29 °C |
| Crescita | da 15 °C, ottimo 18–24 °C, stress oltre 36 °C |
| Freddo | sensibile al gelo |
| Gradi-giorno | 1100 GDD sopra 10 °C (≈ 85 giorni) |
| Raccolta | finestra di 25 giorni |
| Resa media | 3 kg/m² per ciclo |
| Acqua | Kc 0,5 → 0,85 → 0,6; fasi 25/35/40/20 gg; radici 0,9–1,5 m; p = 0,45 |
| Concimazione | domanda media; prima dopo 20 giorni, poi ogni 20, sospendere 20 giorni prima del raccolto |
| Suolo | pH 6–7,5, pieno sole |
| Vaso | Sconsigliata (fattore 0,4): almeno 40 L e 40 cm per pianta |
| Consociazioni | favorevoli: mais, Ravanello; sfavorevoli: Patata, Cetriolo |

- **Acqua:** Ridurre fortemente l'acqua nelle ultime 2 settimane: frutti più dolci e non spaccati.
- **Suolo:** Sciolto, caldo, ben drenato.
- **Concime in fase vegetativa:** Azoto moderato.
- **Concime in fase produttiva:** Potassio per il grado zuccherino.
- **Concimazione organica:** Letame maturo in buca.
- **Quando raccogliere:** Il peduncolo si stacca con una leggera pressione ("slip"), profumo intenso, retatura in rilievo.
- **Come raccogliere:** Cimare i tralci dopo la 4ª–5ª foglia per anticipare la fruttificazione.
- **In vaso:** Tralci lunghi e grande fabbisogno di spazio.
- **Avversità:** Oidio, Fusariosi, Afidi
- **Consiglio:** Al Nord pacciamatura nera e, se possibile, tunnel nelle prime settimane.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar ⬜ apr ⬜ mag ⬜ giu 🟨 lug 🟨 ago ⬜ set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🥔 Patata

*Solanum tuberosum* · Solanaceae · Tubero · Annuale

La tuberizzazione è favorita da temperature fresche (15–20 °C) e inibita sopra i 29 °C. Teme le gelate tardive sulla vegetazione.

| Dato | Valore |
|---|---|
| Messa a dimora | Tuberi seme, con temperature medie tra 8 e 20 °C, profondità 10 cm |
| Sesto d'impianto | 70 cm tra le file × 30 cm sulla fila |
| Germinazione | minima 7 °C, ottimale 18 °C |
| Crescita | da 8 °C, ottimo 16–18 °C, stress oltre 29 °C |
| Freddo | tollera fino a circa -3 °C |
| Gradi-giorno | 1000 GDD sopra 7 °C (≈ 100 giorni) |
| Raccolta | finestra di 30 giorni |
| Resa media | 3 kg/m² per ciclo |
| Acqua | Kc 0,5 → 1,15 → 0,75; fasi 25/30/45/30 gg; radici 0,4–0,6 m; p = 0,35 |
| Concimazione | domanda alta; prima dopo 30 giorni, poi ogni 30, sospendere 30 giorni prima del raccolto |
| Suolo | pH 5–6,5, pieno sole |
| Vaso | Buona (fattore 0,9): almeno 30 L e 40 cm per pianta |
| Consociazioni | favorevoli: Fagiolo, Fava, Cavolo cappuccio; sfavorevoli: Pomodoro, Zucca, Cetriolo, girasole |

- **Acqua:** Fase critica: dalla fioritura all'ingrossamento dei tuberi. Stress idrico = tuberi piccoli e deformi.
- **Suolo:** Terreno leggero, leggermente acido (limita la scabbia).
- **Concime in fase vegetativa:** Azoto e fosforo durante lo sviluppo vegetativo; concimare alla rincalzatura.
- **Concime in fase produttiva:** Potassio durante la tuberizzazione.
- **Concimazione organica:** Letame maturo in autunno precedente; evitare calce.
- **Quando raccogliere:** Piante completamente secche; la buccia non si stacca strofinandola col pollice.
- **Come raccogliere:** Raccogliere con terreno asciutto e far asciugare all'ombra.
- **In vaso:** Coltivabile in sacchi o bidoni rincalzando man mano.
- **Avversità:** Dorifora (Leptinotarsa decemlineata), Peronospora, Elateridi
- **Consiglio:** Rincalzare quando le piante hanno 20 cm per evitare tuberi inverditi (solanina).
- **Consiglio:** Pre-germogliare i tuberi alla luce 3–4 settimane prima.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar 🟨 apr ⬜ mag ⬜ giu ⬜ lug ⬜ ago ⬜ set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🫑 Peperone

*Capsicum annuum* · Solanaceae · Frutto · Annuale

Solanacea molto termofila, con ciclo lungo e crescita lenta nelle prime fasi. Le temperature notturne sotto 15 °C rallentano fortemente lo sviluppo; sopra 32 °C cadono i fiori.

| Dato | Valore |
|---|---|
| Messa a dimora | Trapianto, con temperature medie tra 17 e 27 °C, profondità 8 cm |
| Sesto d'impianto | 70 cm tra le file × 40 cm sulla fila |
| Germinazione | minima 15 °C, ottimale 24 °C |
| Crescita | da 15 °C, ottimo 21–24 °C, stress oltre 33 °C |
| Freddo | sensibile al gelo |
| Gradi-giorno | 1100 GDD sopra 10 °C (≈ 75 giorni) |
| Raccolta | finestra di 60 giorni, raccolta continua |
| Resa media | 3 kg/m² per ciclo |
| Acqua | Kc 0,6 → 1,05 → 0,9; fasi 30/35/40/20 gg; radici 0,5–1 m; p = 0,3 |
| Concimazione | domanda alta; prima dopo 25 giorni, poi ogni 15 |
| Suolo | pH 6–7, pieno sole |
| Vaso | Ottima (fattore 1): almeno 10 L e 25 cm per pianta |
| Consociazioni | favorevoli: Basilico, Carota, Cipolla; sfavorevoli: Finocchio, Fagiolo |

- **Acqua:** Apparato radicale superficiale e bassa tolleranza allo stress idrico (p = 0,30): annaffiature frequenti e leggere.
- **Suolo:** Terreno caldo, sciolto, ben drenato.
- **Concime in fase vegetativa:** Azoto moderato fino alla fioritura.
- **Concime in fase produttiva:** Potassio e calcio durante la fruttificazione (prevenzione marciume apicale).
- **Concimazione organica:** Compost maturo 3 kg/m² prima del trapianto.
- **Quando raccogliere:** Frutto della dimensione tipica, lucido e sodo; per i colorati attendere il viraggio completo.
- **Come raccogliere:** Tagliare con forbici: i rami sono fragili.
- **In vaso:** Si adatta bene al vaso, anche in balcone soleggiato.
- **Avversità:** Afidi, Ragnetto rosso, Piralide del mais, Marciume apicale
- **Consiglio:** Tutorare le varietà a frutto grande.
- **Consiglio:** La raccolta a verde stimola nuova fruttificazione.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar ⬜ apr ⬜ mag 🟨 giu 🟨 lug 🟨 ago ⬜ set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🫛 Pisello

*Pisum sativum* · Fabaceae · Legume · Annuale

Leguminosa microterma, azotofissatrice. Le piantine tollerano brevi gelate, ma il caldo sopra i 27 °C ne blocca la produzione.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina diretta, con temperature medie tra 5 e 17 °C, profondità 4 cm |
| Sesto d'impianto | 50 cm tra le file × 5 cm sulla fila |
| Germinazione | minima 4 °C, ottimale 22 °C |
| Crescita | da 5 °C, ottimo 16–18 °C, stress oltre 27 °C |
| Freddo | tollera fino a circa -5 °C |
| Gradi-giorno | 800 GDD sopra 4 °C (≈ 70 giorni) |
| Raccolta | finestra di 20 giorni, raccolta continua |
| Resa media | 0,8 kg/m² per ciclo |
| Acqua | Kc 0,5 → 1,15 → 1,1; fasi 20/30/35/15 gg; radici 0,6–1 m; p = 0,35 |
| Concimazione | domanda bassa; nessuna concimazione di routine |
| Suolo | pH 6–7,5, pieno sole |
| Vaso | Discreta (fattore 0,7): almeno 10 L e 25 cm per pianta |
| Consociazioni | favorevoli: Carota, Ravanello, Lattuga; sfavorevoli: Cipolla, Aglio |

- **Acqua:** Poche irrigazioni fino alla fioritura, poi umidità costante.
- **Suolo:** Drenato, non eccessivamente fertile.
- **Concime in fase vegetativa:** Nessun azoto: rischio di sola vegetazione.
- **Concime in fase produttiva:** Nessuna concimazione di routine.
- **Concimazione organica:** Poca cenere (potassio) alla semina.
- **Quando raccogliere:** Baccelli pieni e verde brillante, semi teneri e dolci.
- **Come raccogliere:** Gli zuccheri si convertono rapidamente in amido: consumare subito.
- **In vaso:** Resa bassa, richiede un sostegno.
- **Avversità:** Oidio, Afidi, Tortrice del pisello
- **Consiglio:** Fornire reti o rametti di sostegno.
- **Consiglio:** Al Centro-Sud si semina in autunno, al Nord a fine inverno.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb 🟨 mar 🟨 apr 🟨 mag ⬜ giu ⬜ lug ⬜ ago ⬜ set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🍅 Pomodoro

*Solanum lycopersicum* · Solanaceae · Frutto · Annuale

Pianta erbacea annuale originaria delle Ande, la coltura orticola più diffusa al mondo. Termofila e sensibile al gelo; la fruttificazione si blocca con notti sotto i 10 °C o giornate sopra i 35 °C (aborto fiorale e mancata allegagione).

| Dato | Valore |
|---|---|
| Messa a dimora | Trapianto, con temperature medie tra 15 e 27 °C, profondità 10 cm |
| Sesto d'impianto | 100 cm tra le file × 50 cm sulla fila |
| Germinazione | minima 10 °C, ottimale 25 °C |
| Crescita | da 13 °C, ottimo 21–24 °C, stress oltre 35 °C |
| Freddo | sensibile al gelo |
| Gradi-giorno | 1150 GDD sopra 10 °C (≈ 75 giorni) |
| Raccolta | finestra di 70 giorni, raccolta continua |
| Resa media | 6 kg/m² per ciclo |
| Acqua | Kc 0,6 → 1,15 → 0,8; fasi 30/40/45/30 gg; radici 0,7–1,5 m; p = 0,4 |
| Concimazione | domanda alta; prima dopo 20 giorni, poi ogni 15 |
| Suolo | pH 6–6,8, pieno sole (≥ 8 h) |
| Vaso | Buona (fattore 0,9): almeno 20 L e 30 cm per pianta |
| Consociazioni | favorevoli: Basilico, Carota, Prezzemolo, Lattuga; sfavorevoli: Patata, Finocchio, Cavolo cappuccio |

- **Acqua:** Irrigazione regolare alla base: sbalzi idrici durante l'ingrossamento causano marciume apicale (carenza di calcio indotta) e spaccature delle bacche. Evitare di bagnare le foglie (peronospora).
- **Suolo:** Terreno profondo, ricco di sostanza organica e ben drenato.
- **Concime in fase vegetativa:** Azoto moderato (es. NPK 10-5-10) per sviluppo fogliare senza eccessi che ritardano la fioritura.
- **Concime in fase produttiva:** Dalla prima allegagione privilegiare potassio e calcio (es. NPK 5-5-15 + calcio) per qualità e sapore dei frutti.
- **Concimazione organica:** Letame maturo 3–4 kg/m² prima del trapianto; macerato di consolida o ortica durante la stagione.
- **Quando raccogliere:** Bacca completamente colorata, consistente ma cedevole alla pressione; il pedicello si stacca facilmente.
- **Come raccogliere:** Raccogliere invaiati se sono previste piogge forti o freddo: maturano bene in casa.
- **In vaso:** Varietà determinate o cherry; tutore anche in vaso.
- **Avversità:** Peronospora (Phytophthora infestans), Tuta absoluta, Afidi, Marciume apicale (fisiopatia)
- **Consiglio:** Tutorare subito e sfemminellare le varietà indeterminate.
- **Consiglio:** Rotazione: non ripiantare solanacee nello stesso punto per 3–4 anni.
- **Consiglio:** Pacciamatura per mantenere costante l'umidità del suolo.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar ⬜ apr ⬜ mag 🟨 giu 🟨 lug 🟨 ago ⬜ set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🌿 Prezzemolo

*Petroselinum crispum* · Apiaceae · Aromatica · Biennale

Aromatica biennale rustica; germinazione molto lenta (fino a 4 settimane) per inibitori presenti nel seme. Ricco di vitamina C e K.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina diretta o trapianto, con temperature medie tra 8 e 24 °C, profondità 1 cm |
| Sesto d'impianto | 25 cm tra le file × 15 cm sulla fila |
| Germinazione | minima 5 °C, ottimale 22 °C |
| Crescita | da 5 °C, ottimo 16–18 °C, stress oltre 30 °C |
| Freddo | tollera fino a circa -8 °C |
| Gradi-giorno | 1000 GDD sopra 4 °C (≈ 75 giorni) |
| Raccolta | finestra di 150 giorni, raccolta continua |
| Resa media | 1,5 kg/m² per ciclo |
| Acqua | Kc 0,6 → 1 → 0,9; fasi 25/35/60/30 gg; radici 0,3–0,5 m; p = 0,35 |
| Concimazione | domanda media; prima dopo 30 giorni, poi ogni 30 |
| Suolo | pH 6–7, sole o mezz'ombra |
| Vaso | Ottima (fattore 1): almeno 3 L e 20 cm per pianta |
| Consociazioni | favorevoli: Pomodoro, Carota; sfavorevoli: Lattuga |

- **Acqua:** Umidità costante soprattutto in germinazione.
- **Suolo:** Fresco e profondo.
- **Concime in fase vegetativa:** Azoto leggero dopo i tagli.
- **Concimazione organica:** Humus di lombrico.
- **Quando raccogliere:** Steli con 3 segmenti di foglie.
- **Come raccogliere:** Tagliare gli steli esterni alla base.
- **In vaso:** Classico da vaso, anche in cucina.
- **Avversità:** Afidi, Septoriosi
- **Consiglio:** Mettere i semi in ammollo 24 h prima della semina per accelerare la germinazione.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar 🟨 apr 🟨 mag 🟨 giu 🟨 lug ⬜ ago ⬜ set 🟨 ott 🟨 nov 🟨 dic ⬜

### 🥬 Radicchio

*Cichorium intybus* · Asteraceae · Foglia · Biennale (coltivato come annuale)

Cicoria da foglia rossa tipica del Veneto. Il freddo autunnale accentua la colorazione rossa (antociani) e riduce l'amaro.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina o trapianto, con temperature medie tra 15 e 25 °C, profondità 0,5 cm |
| Sesto d'impianto | 35 cm tra le file × 25 cm sulla fila |
| Germinazione | minima 5 °C, ottimale 20 °C |
| Crescita | da 5 °C, ottimo 12–22 °C, stress oltre 30 °C |
| Freddo | tollera fino a circa -7 °C |
| Gradi-giorno | 1100 GDD sopra 5 °C (≈ 100 giorni) |
| Raccolta | finestra di 60 giorni |
| Resa media | 2 kg/m² per ciclo |
| Acqua | Kc 0,7 → 1 → 0,95; fasi 25/35/30/10 gg; radici 0,4–0,6 m; p = 0,4 |
| Concimazione | domanda media; prima dopo 25 giorni, poi ogni 30, sospendere 20 giorni prima del raccolto |
| Suolo | pH 6–7,5, pieno sole |
| Vaso | Buona (fattore 0,9): almeno 8 L e 25 cm per pianta |
| Consociazioni | favorevoli: Lattuga, Carota; sfavorevoli: — |

- **Acqua:** Regolare in estate; in autunno bastano spesso le piogge.
- **Suolo:** Profondo e fresco.
- **Concime in fase vegetativa:** Azoto moderato.
- **Concimazione organica:** Compost maturo.
- **Quando raccogliere:** Cespo compatto e ben colorato dopo i primi freddi.
- **Come raccogliere:** Tagliare al colletto; può ricacciare.
- **In vaso:** Si adatta bene a fioriere profonde.
- **Avversità:** Lumache, Afidi, Marciume del colletto
- **Consiglio:** Seminare a giugno-luglio per la raccolta autunno-invernale.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar ⬜ apr ⬜ mag 🟨 giu 🟨 lug ⬜ ago ⬜ set 🟨 ott 🟨 nov ⬜ dic ⬜

### 🌱 Ravanello

*Raphanus sativus* · Brassicaceae · Radice · Annuale

L'ortaggio dal ciclo più breve (3–5 settimane). Con caldo e giorni lunghi diventa piccante, legnoso e spugnoso.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina diretta, con temperature medie tra 5 e 22 °C, profondità 1 cm |
| Sesto d'impianto | 15 cm tra le file × 4 cm sulla fila |
| Germinazione | minima 5 °C, ottimale 25 °C |
| Crescita | da 5 °C, ottimo 16–18 °C, stress oltre 27 °C |
| Freddo | tollera fino a circa -4 °C |
| Gradi-giorno | 350 GDD sopra 4 °C (≈ 30 giorni) |
| Raccolta | finestra di 10 giorni |
| Resa media | 1,5 kg/m² per ciclo |
| Acqua | Kc 0,7 → 0,9 → 0,85; fasi 5/10/15/5 gg; radici 0,3–0,5 m; p = 0,3 |
| Concimazione | domanda bassa; nessuna concimazione di routine |
| Suolo | pH 6–7, sole o mezz'ombra |
| Vaso | Ottima (fattore 1): almeno 3 L e 15 cm per pianta |
| Consociazioni | favorevoli: Lattuga, Carota, Pisello, Spinacio; sfavorevoli: Cavolo cappuccio |

- **Acqua:** Umidità costante: lo stress idrico lo rende piccante e cavo.
- **Suolo:** Sciolto e fresco.
- **Concime in fase vegetativa:** Nessuna concimazione: ciclo troppo breve, basta la fertilità del suolo.
- **Concimazione organica:** Compost leggero in pre-semina.
- **Quando raccogliere:** Radice di 2–3 cm che affiora dal terreno.
- **Come raccogliere:** Non ritardare: diventano spugnosi in pochi giorni.
- **In vaso:** Il più semplice da coltivare in cassetta.
- **Avversità:** Altica, Mosca del cavolo
- **Consiglio:** Ideale come coltura intercalare tra le file di carote (marca la fila).
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar 🟨 apr 🟨 mag 🟨 giu ⬜ lug ⬜ ago ⬜ set 🟨 ott 🟨 nov ⬜ dic ⬜

### 🌱 Rucola

*Eruca vesicaria subsp. sativa* · Brassicaceae · Foglia · Annuale

Brassicacea a ciclo brevissimo, ricca di glucosinolati (sapore piccante). Con il caldo diventa molto piccante e prefiorisce.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina diretta, con temperature medie tra 7 e 23 °C, profondità 0,5 cm |
| Sesto d'impianto | 20 cm tra le file × 3 cm sulla fila |
| Germinazione | minima 5 °C, ottimale 20 °C |
| Crescita | da 5 °C, ottimo 12–20 °C, stress oltre 28 °C |
| Freddo | tollera fino a circa -5 °C |
| Gradi-giorno | 400 GDD sopra 4 °C (≈ 35 giorni) |
| Raccolta | finestra di 30 giorni, raccolta continua |
| Resa media | 1,2 kg/m² per ciclo |
| Acqua | Kc 0,7 → 1 → 0,95; fasi 10/10/15/5 gg; radici 0,2–0,3 m; p = 0,3 |
| Concimazione | domanda bassa; prima dopo 15 giorni, poi ogni 30, sospendere 10 giorni prima del raccolto |
| Suolo | pH 6–7,5, sole o mezz'ombra |
| Vaso | Ottima (fattore 1): almeno 3 L e 15 cm per pianta |
| Consociazioni | favorevoli: Lattuga, Carota; sfavorevoli: Cavolo cappuccio |

- **Acqua:** Terreno sempre umido: la siccità accentua la piccantezza e la salita a seme.
- **Suolo:** Si adatta a quasi tutti i terreni.
- **Concime in fase vegetativa:** Leggero apporto azotato dopo il primo taglio.
- **Concimazione organica:** Compost in pre-semina.
- **Quando raccogliere:** Foglie di 8–12 cm.
- **Come raccogliere:** Taglio a 2–3 cm dal suolo: ricaccia 2–3 volte.
- **In vaso:** Cassette basse, raccolte ripetute.
- **Avversità:** Altica (pulce di terra), Afidi
- **Consiglio:** Rete anti-insetto fine contro l'altica, che bucherella le foglie.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar 🟩 apr 🟩 mag 🟩 giu 🟨 lug ⬜ ago ⬜ set 🟩 ott 🟧 nov ⬜ dic ⬜

### 🥬 Spinacio

*Spinacia oleracea* · Amaranthaceae · Foglia · Annuale

Ortaggio da foglia microtermo e molto rustico. Pianta longidiurna: con giorni oltre 12–14 h e caldo monta rapidamente a seme.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina diretta, con temperature medie tra 4 e 18 °C, profondità 2 cm |
| Sesto d'impianto | 30 cm tra le file × 8 cm sulla fila |
| Germinazione | minima 0 °C, ottimale 20 °C |
| Crescita | da 4 °C, ottimo 16–18 °C, stress oltre 24 °C |
| Freddo | tollera fino a circa -9 °C |
| Gradi-giorno | 600 GDD sopra 2 °C (≈ 50 giorni) |
| Raccolta | finestra di 30 giorni, raccolta continua |
| Resa media | 1,5 kg/m² per ciclo |
| Acqua | Kc 0,7 → 1 → 0,95; fasi 20/20/15/5 gg; radici 0,3–0,5 m; p = 0,2 |
| Concimazione | domanda media; prima dopo 15 giorni, poi ogni 20, sospendere 15 giorni prima del raccolto |
| Suolo | pH 6,5–7,5, sole o mezz'ombra |
| Vaso | Ottima (fattore 1): almeno 5 L e 20 cm per pianta |
| Consociazioni | favorevoli: Fragola, Cavolo cappuccio, Ravanello; sfavorevoli: Bietola da coste |

- **Acqua:** Molto sensibile alla carenza idrica (p = 0,20): suolo sempre fresco.
- **Suolo:** Non tollera terreni acidi.
- **Concime in fase vegetativa:** Azoto moderato, sospendere 2 settimane prima della raccolta (nitrati).
- **Concimazione organica:** Compost maturo.
- **Quando raccogliere:** Rosette con 6–8 foglie ben sviluppate.
- **Come raccogliere:** Raccolta a foglie esterne per più tagli.
- **In vaso:** Ottimo in fioriera, anche a mezz’ombra.
- **Avversità:** Peronospora (Peronospora farinosa), Afidi, Minatori fogliari
- **Consiglio:** Semina autunnale: si raccoglie fino a primavera.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb 🟨 mar 🟨 apr 🟨 mag 🟨 giu ⬜ lug ⬜ ago ⬜ set ⬜ ott 🟨 nov 🟨 dic 🟨

### 🎃 Zucca

*Cucurbita maxima / C. moschata* · Cucurbitaceae · Frutto · Annuale

Cucurbitacea vigorosa a ciclo lungo; i frutti si raccolgono a piena maturazione e si conservano per mesi.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina diretta o trapianto, con temperature medie tra 16 e 26 °C, profondità 3 cm |
| Sesto d'impianto | 200 cm tra le file × 150 cm sulla fila |
| Germinazione | minima 15 °C, ottimale 29 °C |
| Crescita | da 13 °C, ottimo 18–24 °C, stress oltre 35 °C |
| Freddo | sensibile al gelo |
| Gradi-giorno | 1300 GDD sopra 10 °C (≈ 110 giorni) |
| Raccolta | finestra di 30 giorni |
| Resa media | 3 kg/m² per ciclo |
| Acqua | Kc 0,5 → 1 → 0,8; fasi 20/30/30/20 gg; radici 1–1,5 m; p = 0,35 |
| Concimazione | domanda alta; prima dopo 25 giorni, poi ogni 20, sospendere 30 giorni prima del raccolto |
| Suolo | pH 6–7,5, pieno sole |
| Vaso | Sconsigliata (fattore 0,4): almeno 80 L e 50 cm per pianta |
| Consociazioni | favorevoli: mais, Fagiolo; sfavorevoli: Patata |

- **Acqua:** Radici profonde: irrigazioni abbondanti ma distanziate; ridurre a maturazione.
- **Suolo:** Molto ricco di sostanza organica.
- **Concime in fase vegetativa:** Azoto per lo sviluppo dei tralci.
- **Concime in fase produttiva:** Potassio durante l'ingrossamento.
- **Concimazione organica:** Buche riempite di letame maturo (classica coltura 'sul cumulo di letame').
- **Quando raccogliere:** Peduncolo secco e sugheroso, buccia dura che non si incide con l'unghia.
- **Come raccogliere:** Lasciare 5–10 cm di peduncolo e curare al sole 10 giorni per la conservazione.
- **In vaso:** Troppo vigorosa per un vaso.
- **Avversità:** Oidio, Afidi, Virosi
- **Consiglio:** Isolare il frutto dal terreno con una tavoletta per evitare marciumi.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar ⬜ apr ⬜ mag 🟨 giu 🟨 lug 🟧 ago ⬜ set ⬜ ott ⬜ nov ⬜ dic ⬜

### 🥒 Zucchina

*Cucurbita pepo* · Cucurbitaceae · Frutto · Annuale

Cucurbitacea a crescita rapidissima e produzione prolungata. Monoica: fiori maschili e femminili separati, impollinazione entomofila (api). Sensibile al freddo e all'oidio.

| Dato | Valore |
|---|---|
| Messa a dimora | Semina diretta o trapianto, con temperature medie tra 16 e 28 °C, profondità 3 cm |
| Sesto d'impianto | 120 cm tra le file × 80 cm sulla fila |
| Germinazione | minima 15 °C, ottimale 29 °C |
| Crescita | da 13 °C, ottimo 18–24 °C, stress oltre 35 °C |
| Freddo | sensibile al gelo |
| Gradi-giorno | 550 GDD sopra 10 °C (≈ 50 giorni) |
| Raccolta | finestra di 60 giorni, raccolta continua |
| Resa media | 5 kg/m² per ciclo |
| Acqua | Kc 0,5 → 0,95 → 0,75; fasi 25/35/25/15 gg; radici 0,6–1 m; p = 0,5 |
| Concimazione | domanda alta; prima dopo 20 giorni, poi ogni 15 |
| Suolo | pH 6–7,5, pieno sole |
| Vaso | Discreta (fattore 0,7): almeno 40 L e 40 cm per pianta |
| Consociazioni | favorevoli: Fagiolo, Cipolla, Lattuga; sfavorevoli: Patata, Cetriolo |

- **Acqua:** Elevata richiesta idrica in piena produzione. Irrigare al piede: l'umidità fogliare favorisce l'oidio.
- **Suolo:** Molto esigente in sostanza organica.
- **Concime in fase vegetativa:** Concime equilibrato (NPK 10-10-10) dopo l'attecchimento.
- **Concime in fase produttiva:** In produzione aumentare il potassio per sostenere la fruttificazione continua.
- **Concimazione organica:** Buca arricchita con compost o letame (5 kg/m²); stallatico pellettato a metà ciclo.
- **Quando raccogliere:** Frutti lunghi 15–20 cm, buccia lucida; il fiore apicale può essere ancora attaccato.
- **Come raccogliere:** Raccogliere ogni 2–3 giorni: frutti lasciati sulla pianta ne riducono la produttività.
- **In vaso:** Pianta molto ingombrante: un vaso grande per pianta.
- **Avversità:** Oidio (Podosphaera xanthii), Afidi, Virus del mosaico (CMV, ZYMV)
- **Consiglio:** Se i frutti marciscono in punta è spesso scarsa impollinazione: favorire gli impollinatori.
- **Consiglio:** Una pianta produce 3–5 kg: 2–3 piante bastano per una famiglia.
- **Calendario (Parma (medie 2015–2024)):** gen ⬜ feb ⬜ mar ⬜ apr ⬜ mag 🟩 giu 🟨 lug 🟨 ago 🟩 set ⬜ ott ⬜ nov ⬜ dic ⬜

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

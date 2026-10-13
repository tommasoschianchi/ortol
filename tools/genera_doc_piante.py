#!/usr/bin/env python3
"""
Genera docs/PIANTE.md dal catalogo backend/Ortol.Api/Data/plants.json.

Uso:
    python3 tools/genera_doc_piante.py [--calendario calendario.json] [--luogo "Parma (medie 2015–2024)"]

--calendario: JSON {idSpecie: [{"s": stato, "d": giorniAlRaccolto}, ... 12 mesi]} prodotto dal programma
              (FitnessService.Calendar) per una località; se manca, la sezione calendario viene omessa.
"""
import argparse, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PLANTS = ROOT / "backend/Ortol.Api/Data/plants.json"
OUT = ROOT / "docs/PIANTE.md"
FORMULE = pathlib.Path(__file__).resolve().parent / "formule.md"

MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"]
STATO = {"Ideale": "🟩", "Possibile": "🟨", "ConProtezione": "🟧", "NonAdatto": "⬜"}
FATTORE_VASO = {"Ottima": 1.0, "Buona": 0.9, "Discreta": 0.7}


def n(x, dec=None):
    """Numero in formato italiano."""
    if isinstance(x, bool):
        return "sì" if x else "no"
    if isinstance(x, (int, float)):
        if dec is not None:
            s = f"{x:.{dec}f}"
        else:
            s = f"{x:g}"
        return s.replace(".", ",")
    return str(x)


def table(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "|".join("---" for _ in head) + "|"]
    out += ["| " + " | ".join(str(c).replace("|", "/") for c in r) + " |" for r in rows]
    return "\n".join(out)


def nomi(ids, by):
    return ", ".join(by[i]["name"] if i in by else i for i in ids) or "—"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--calendario")
    ap.add_argument("--luogo", default="")
    a = ap.parse_args()
    plants = json.loads(PLANTS.read_text(encoding="utf-8"))
    by = {p["id"]: p for p in plants}
    cal = json.loads(pathlib.Path(a.calendario).read_text()) if a.calendario else None
    ps = sorted(plants, key=lambda p: p["name"])

    L = []
    w = L.append
    w("# Ortol — Le piante e le formule\n")
    w("> Documento generato da `tools/genera_doc_piante.py` a partire da `backend/Ortol.Api/Data/plants.json`. "
      "Non modificarlo a mano: aggiorna il catalogo e rigenera.\n")
    w("**Indice**\n")
    w("1. [Come leggere i dati](#come-leggere-i-dati)")
    w("2. [Tabelle riassuntive](#tabelle-riassuntive)")
    if cal:
        w("3. [Calendario di messa a dimora](#calendario-di-messa-a-dimora)")
    w(f"{4 if cal else 3}. [Schede delle piante](#schede-delle-piante)")
    w(f"{5 if cal else 4}. [Formule e modelli del programma](#formule-e-modelli-del-programma)")
    w(f"{6 if cal else 5}. [Origine dei dati](#origine-dei-dati)\n")

    # ---------------- Come leggere ----------------
    w("## Come leggere i dati\n")
    w(table(["Campo", "Significato", "Dove lo usa il programma"], [
        ["Germinazione min / ott.", "Temperatura del suolo minima e ottimale per far germinare il seme (°C)", "Solo informativo (scheda pianta)"],
        ["T base", "Temperatura sotto cui la pianta non accumula sviluppo (°C)", "Gradi-giorno"],
        ["Crescita min / max", "Media giornaliera sotto cui la crescita si ferma; massima oltre cui c'è stress da caldo (°C)", "Simulazione del ciclo, allerte"],
        ["Ottimo", "Fascia di temperatura media in cui la pianta cresce meglio (°C); il massimo è anche il tetto dei gradi-giorno", "Idoneità, gradi-giorno"],
        ["Minima sopportata", "Minima assoluta oltre cui la pianta subisce danni gravi (°C)", "Simulazione (specie rustiche), allerte"],
        ["Sensibile al gelo", "Se sì, qualunque gelata è dannosa", "Simulazione, allerte, protezioni"],
        ["Messa a dimora", "Fascia di temperatura media dell'aria adatta a seminare o trapiantare (°C)", "Calendario, idoneità"],
        ["GDD", "Gradi-giorno necessari dalla messa a dimora al primo raccolto", "Fase, data di raccolta"],
        ["Giorni", "Durata tipica del ciclo, in condizioni normali", "Confronto con il ciclo simulato, frase \"ciclo più lungo\""],
        ["Finestra raccolta", "Giorni in cui si raccoglie dopo la maturazione", "Stato di raccolta, attività"],
        ["Sesto", "Distanza tra le file × distanza sulla fila (cm)", "Piante per lotto"],
        ["Resa", "Resa media per ciclo in un orto familiare (kg/m²)", "Stima del raccolto"],
        ["Kc ini / mid / end", "Coefficienti colturali FAO-56: consumo d'acqua della pianta rispetto all'ET0 di riferimento", "Bilancio idrico"],
        ["Fasi", "Durate relative delle fasi iniziale / sviluppo / piena / finale (giorni FAO-56, usate come proporzioni)", "Bilancio idrico, concimazione"],
        ["Radici", "Profondità radicale minima e massima (m)", "Bilancio idrico"],
        ["p", "Frazione di acqua disponibile che si può consumare senza stress (a ETc = 5 mm/giorno)", "Soglia di irrigazione"],
        ["Concimazione", "Domanda, giorni dalla messa a dimora alla prima concimazione, intervallo, sospensione prima del raccolto", "Calendario delle concimazioni"],
        ["Vaso", "Adattabilità al vaso, litri e profondità minimi per pianta", "Idoneità in vaso, piante per vaso"],
    ]))
    w("")

    # ---------------- Tabelle riassuntive ----------------
    w("## Tabelle riassuntive\n")
    w("### Identità e ciclo\n")
    w(table(["Pianta", "Nome scientifico", "Famiglia", "Categoria", "Ciclo", "Messa a dimora", "Raccolta continua", "Vernalizzazione"],
            [[f"{p['emoji']} {p['name']}", f"*{p['scientificName']}*", p["family"], p["category"], p["lifecycle"],
              p["planting"]["method"], n(p["continuousHarvest"]), n(p["needsVernalization"])] for p in ps]))
    w("\n### Temperature (°C)\n")
    w(table(["Pianta", "Germinaz. min", "Germinaz. ott.", "T base", "Crescita min", "Ottimo", "Crescita max", "Minima sopportata", "Sensibile al gelo", "Messa a dimora"],
            [[p["name"], n(t["germMin"]), n(t["germOpt"]), n(t["baseGdd"]), n(t["growthMin"]), f"{n(t['optMin'])}–{n(t['optMax'])}",
              n(t["growthMax"]), n(t["minSurvival"]), n(t["frostTender"]), f"{n(p['planting']['tempMinMean'])}–{n(p['planting']['tempMaxMean'])}"]
             for p in ps for t in [p["temperature"]]]))
    w("\n### Sviluppo, impianto e resa\n")
    w(table(["Pianta", "GDD al raccolto", "Giorni tipici", "Finestra raccolta (gg)", "Sesto (cm)", "m² per pianta", "Profondità semina (cm)", "Resa (kg/m²)"],
            [[p["name"], n(p["gddToMaturity"]), n(p["daysToMaturity"]), n(p["harvestWindowDays"]),
              f"{p['planting']['spacingRowCm']} × {p['planting']['spacingPlantCm']}",
              n(max(0.0025, p['planting']['spacingRowCm'] / 100 * p['planting']['spacingPlantCm'] / 100), 3),
              n(p["planting"].get("depthCm")) if p["planting"].get("depthCm") is not None else "—", n(p["yieldKgM2"])] for p in ps]))
    w("\n### Acqua (FAO-56)\n")
    w(table(["Pianta", "Kc ini", "Kc mid", "Kc end", "Fasi (gg)", "Radici (m)", "p"],
            [[p["name"], n(x["kcIni"]), n(x["kcMid"]), n(x["kcEnd"]), "/".join(str(s) for s in x["stages"]),
              f"{n(x['rootDepthMin'])}–{n(x['rootDepthMax'])}", n(x["depletionFraction"])] for p in ps for x in [p["water"]]]))
    w("\n### Concimazione, suolo e vaso\n")
    w(table(["Pianta", "Domanda", "Prima concim. (gg)", "Intervallo (gg)", "Stop prima del raccolto (gg)", "pH", "Esposizione", "In vaso", "Fattore vaso", "L/pianta", "Profondità vaso (cm)"],
            [[p["name"], x["demand"], n(x["startAfterDays"]), n(x["intervalDays"]) if x["intervalDays"] else "nessuna",
              n(x["stopBeforeEndDays"]), f"{n(p['soil']['phMin'])}–{n(p['soil']['phMax'])}", p["soil"]["sun"],
              p["container"]["suitability"], n(FATTORE_VASO.get(p["container"]["suitability"], 0.4)),
              n(p["container"]["minLiters"]), n(p["container"]["minDepthCm"])] for p in ps for x in [p["nutrition"]]]))
    w("\n### Consociazioni\n")
    w("Il programma considera sfavorevole una coppia se almeno una delle due schede la indica come tale; favorevole se almeno una la indica come favorevole e nessuna come sfavorevole.\n")
    w(table(["Pianta", "Favorevoli", "Sfavorevoli"],
            [[p["name"], nomi(p["companions"], by), nomi(p["antagonists"], by)] for p in ps]))
    w("")

    # ---------------- Calendario ----------------
    if cal:
        w("## Calendario di messa a dimora\n")
        w(f"Calcolato dal programma per **{a.luogo}**, coltivazione in terra, simulando una messa a dimora a metà di ogni mese "
          "sulle medie climatiche (vedi [simulazione del ciclo](#4-simulazione-del-ciclo)). Il numero indica i giorni stimati fino al primo raccolto.\n")
        w("Legenda: 🟩 ideale · 🟨 possibile · 🟧 solo con protezione · ⬜ non adatto\n")
        rows = []
        for p in ps:
            c = cal.get(p["id"])
            if not c:
                continue
            rows.append([p["name"]] + [STATO.get(m["s"], "?") + (f" {m['d']}" if m["d"] is not None and m["s"] != "NonAdatto" else "") for m in c])
        w(table(["Pianta"] + MESI, rows))
        w("")

    # ---------------- Schede ----------------
    w("## Schede delle piante\n")
    for p in ps:
        t, x, nu, so, h, c = p["temperature"], p["water"], p["nutrition"], p["soil"], p["harvest"], p["container"]
        w(f"### {p['emoji']} {p['name']}\n")
        w(f"*{p['scientificName']}* · {p['family']} · {p['category']} · {p['lifecycle']}\n")
        w(p["description"] + "\n")
        w(table(["Dato", "Valore"], [
            ["Messa a dimora", f"{p['planting']['method']}, con temperature medie tra {n(p['planting']['tempMinMean'])} e {n(p['planting']['tempMaxMean'])} °C"
             + (f", profondità {n(p['planting']['depthCm'])} cm" if p['planting'].get('depthCm') is not None else "")],
            ["Sesto d'impianto", f"{p['planting']['spacingRowCm']} cm tra le file × {p['planting']['spacingPlantCm']} cm sulla fila"],
            ["Germinazione", f"minima {n(t['germMin'])} °C, ottimale {n(t['germOpt'])} °C"],
            ["Crescita", f"da {n(t['growthMin'])} °C, ottimo {n(t['optMin'])}–{n(t['optMax'])} °C, stress oltre {n(t['growthMax'])} °C"],
            ["Freddo", "sensibile al gelo" if t["frostTender"] else f"tollera fino a circa {n(t['minSurvival'])} °C"],
            ["Gradi-giorno", f"{n(p['gddToMaturity'])} GDD sopra {n(t['baseGdd'])} °C (≈ {p['daysToMaturity']} giorni)"],
            ["Raccolta", f"finestra di {p['harvestWindowDays']} giorni" + (", raccolta continua" if p["continuousHarvest"] else "")
             + (", richiede vernalizzazione" if p["needsVernalization"] else "")],
            ["Resa media", f"{n(p['yieldKgM2'])} kg/m² per ciclo"],
            ["Acqua", f"Kc {n(x['kcIni'])} → {n(x['kcMid'])} → {n(x['kcEnd'])}; fasi {'/'.join(map(str, x['stages']))} gg; "
                      f"radici {n(x['rootDepthMin'])}–{n(x['rootDepthMax'])} m; p = {n(x['depletionFraction'])}"],
            ["Concimazione", f"domanda {nu['demand'].lower()}; " + (f"prima dopo {nu['startAfterDays']} giorni, poi ogni {nu['intervalDays']}"
                             + (f", sospendere {nu['stopBeforeEndDays']} giorni prima del raccolto" if nu['stopBeforeEndDays'] else "")
                             if nu["intervalDays"] else "nessuna concimazione di routine")],
            ["Suolo", f"pH {n(so['phMin'])}–{n(so['phMax'])}, {so['sun'].lower()}"],
            ["Vaso", f"{c['suitability']} (fattore {n(FATTORE_VASO.get(c['suitability'], 0.4))}): almeno {n(c['minLiters'])} L e {n(c['minDepthCm'])} cm per pianta"],
            ["Consociazioni", f"favorevoli: {nomi(p['companions'], by)}; sfavorevoli: {nomi(p['antagonists'], by)}"],
        ]))
        w("")
        w(f"- **Acqua:** {x['notes']}")
        w(f"- **Suolo:** {so['notes']}")
        w(f"- **Concime in fase vegetativa:** {nu['vegetative']}")
        if nu["reproductive"] and nu["reproductive"] != "—":
            w(f"- **Concime in fase produttiva:** {nu['reproductive']}")
        w(f"- **Concimazione organica:** {nu['organic']}")
        w(f"- **Quando raccogliere:** {h['signs']}")
        w(f"- **Come raccogliere:** {h['tips']}")
        w(f"- **In vaso:** {c['notes']}")
        w(f"- **Avversità:** {', '.join(p['pests']) or '—'}")
        for tip in p["tips"]:
            w(f"- **Consiglio:** {tip}")
        if cal and p["id"] in cal:
            c12 = cal[p["id"]]
            w(f"- **Calendario ({a.luogo}):** " + " ".join(f"{MESI[i]} {STATO.get(m['s'], '?')}" for i, m in enumerate(c12)))
        w("")

    # ---------------- Formule ----------------
    w(FORMULE.read_text(encoding="utf-8").rstrip() + "\n")
    OUT.write_text("\n".join(L), encoding="utf-8")
    print(f"Scritto {OUT.relative_to(ROOT)} ({len(plants)} specie)")


if __name__ == "__main__":
    main()

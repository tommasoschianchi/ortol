using Ortol.Api.Models;

namespace Ortol.Api.Services;

public record WaterAdvice(string Status, DateOnly? NextDate, int? DaysUntil, double DepletionMm, double ReadilyAvailableMm,
    double TotalAvailableMm, double LitersPerPlant, double LitersTotal, double MmToApply, double Kc, double EtcToday,
    double RainNext3Days, string Message, List<WaterPoint> History);

public record WaterPoint(DateOnly Date, double Depletion, double Raw, double Rain, double Etc, double Irrigation, bool Forecast);

public record FertilizeAdvice(string Status, DateOnly? NextDate, int? DaysUntil, string Phase, string Advice, string Organic, string Message, int IntervalDays = 0);

public record HarvestAdvice(string Status, DateOnly? ExpectedStart, DateOnly? ExpectedEnd, int? DaysUntil, string Signs, string Message);

public record GrowthInfo(double GddAccumulated, double GddRequired, double Progress, string Stage, string StageKey, int DaysSincePlanting);

public record Alert(string Level, string Title, string Message);

/// <summary>
/// Attività pianificata per una coltura. Type: water | fertilize | harvest | protect.
/// Estimated = data ricavata dalle medie climatiche (oltre l'orizzonte delle previsioni meteo).
/// </summary>
public record PlannedTask(string Type, DateOnly Date, string Title, string Detail, bool Estimated);

public record PlantStatus
{
    public Guid Id { get; init; }
    public string SpeciesId { get; init; } = "";
    public string Name { get; init; } = "";
    public string Emoji { get; init; } = "";
    public string ScientificName { get; init; } = "";
    public string? Label { get; init; }
    public int Quantity { get; init; }
    public DateOnly PlantedOn { get; init; }
    public string? Notes { get; init; }
    public GrowthInfo Growth { get; init; } = null!;
    public WaterAdvice Water { get; init; } = null!;
    public FertilizeAdvice Fertilize { get; init; } = null!;
    public HarvestAdvice Harvest { get; init; } = null!;
    public List<Alert> Alerts { get; init; } = new();
    public int Fitness { get; init; }
    public string FitnessLabel { get; init; } = "";
    /// <summary>Come è stata calcolata l'idoneità sul ciclo di questa coltura.</summary>
    public string FitnessNote { get; init; } = "";
    public DateOnly? LastWatered { get; init; }
    public DateOnly? LastFertilized { get; init; }
    public double HarvestedKg { get; init; }
    public Guid? LotId { get; init; }
    public double AreaM2 { get; init; }
    public double ExpectedYieldKg { get; init; }
    public List<CareLog> RecentLogs { get; init; } = new();
    public int LogCount { get; init; }
    public List<PlannedTask> Upcoming { get; init; } = new();
}

/// <summary>
/// Calcolo dei consigli colturali:
/// • irrigazione: bilancio idrico giornaliero del suolo (FAO-56, cap. 8) con ETc = Kc·ET0, Kc per fase,
///   approfondimento radicale progressivo, acqua facilmente disponibile RAW = p·TAW;
/// • fase e raccolta: accumulo di gradi-giorno reali (storico + previsione) e proiezione con le normali climatiche;
/// • concimazione: calendario per specie modulato su fase fenologica e attività vegetativa.
/// </summary>
public class CareService
{
    /// <summary>Acqua disponibile totale (capacità di campo − punto di appassimento) in mm per metro di suolo.</summary>
    /// <summary>Acqua disponibile di un terriccio universale per vasi (mm/m), ~30% del volume.</summary>
    public const double PotSubstrateTaw = 300;

    /// <summary>Giorni pianificati in avanti (oltre le previsioni si usano le medie climatiche).</summary>
    public const int Horizon = 30;

    /// <summary>Quota di pioggia climatologica considerata nella pianificazione (ipotesi prudente).</summary>
    public const double EstimatedRainShare = 0.6;

    public static double TawPerMeter(SoilType s) => s switch
    {
        SoilType.Sabbioso => 80,
        SoilType.Argilloso => 180,
        _ => 140,
    };

    public PlantStatus Evaluate(Garden g, GardenPlant gp, PlantSpecies p, WeatherSeries ws, FitnessResult fit)
    {
        var today = ws.Today;
        var t = p.Temperature;
        var days = ws.Days.Where(d => d.Date >= gp.PlantedOn).ToList();
        var waterLogs = gp.Logs.Where(l => l.Type == CareType.Water).ToLookup(l => l.Date);

        // Superficie coltivata: quella del lotto, altrimenti dal sesto d'impianto
        bool pot = g.Cultivation == Cultivation.Vaso;
        var lot = gp.LotId is Guid lid ? g.Lots.FirstOrDefault(l => l.Id == lid) : null;
        double totalArea = lot?.Area ?? gp.Quantity * Agronomy.SpacingArea(p);
        totalArea = Math.Max(0.01, totalArea);
        double areaPerPlant = totalArea / Math.Max(1, gp.Quantity);
        // In vaso: terriccio con più acqua disponibile per metro ma profondità limitata al contenitore
        double tawM = pot ? PotSubstrateTaw : TawPerMeter(g.Soil);
        double potDepth = (lot?.DepthCm ?? Agronomy.DefaultDepthCm(p)) / 100.0;
        double zrMax = pot ? potDepth * 0.9 : Math.Min(0.8, (p.Water.RootDepthMin + p.Water.RootDepthMax) / 2);
        double zrInit = pot ? Math.Min(0.15, zrMax) : 0.15;
        double rainFactor = pot ? 0.7 : 0.9;   // in vaso parte della pioggia è intercettata o ruscella via
        double etFactor = pot ? 1.1 : 1.0;     // pareti del vaso esposte al sole: più evaporazione

        double[] st = p.Water.Stages.Select(x => (double)x).ToArray();
        double stSum = st.Sum();
        double fIni = st[0] / stSum, fDev = (st[0] + st[1]) / stSum, fMid = (st[0] + st[1] + st[2]) / stSum;

        double Kc(double f) =>
            f < fIni ? p.Water.KcIni
            : f < fDev ? p.Water.KcIni + (p.Water.KcMid - p.Water.KcIni) * (f - fIni) / (fDev - fIni)
            : f < fMid || p.ContinuousHarvest ? p.Water.KcMid
            : f < 1 ? p.Water.KcMid + (p.Water.KcEnd - p.Water.KcMid) * (f - fMid) / (1 - fMid)
            : p.Water.KcEnd;
        double Zr(double f) => zrInit + (zrMax - zrInit) * Math.Min(1, f / fDev);

        // Bilancio idrico: parte al più 60 giorni fa con suolo a capacità di campo
        var balanceStart = Max(gp.PlantedOn, today.AddDays(-60));
        double gdd = 0, dr = 0, gddToday = 0;
        DateOnly? maturityDate = null;
        var history = new List<WaterPoint>();
        DateOnly? nextWater = null; double drAtNext = 0;
        double drToday = 0, rawToday = 0, tawToday = 0, kcToday = 0, etcToday = 0;

        foreach (var d in days)
        {
            gdd += Math.Max(0, Math.Min(d.TMean, t.OptMax) - t.BaseGdd);
            double f = gdd / p.GddToMaturity;
            if (maturityDate is null && f >= 1) maturityDate = d.Date;
            if (d.Date == today) gddToday = gdd;
            if (d.Date < balanceStart) continue;

            double zr = Zr(f), taw = tawM * zr, kc = Kc(f), etc = kc * d.Et0 * etFactor;
            int age = d.Date.DayNumber - gp.PlantedOn.DayNumber;
            double pFrac = Math.Clamp(p.Water.DepletionFraction + 0.04 * (5 - etc), 0.1, 0.8) * (age < 10 ? 0.5 : 1);
            double raw = pFrac * taw;

            // Irrigazioni registrate (litri → mm sulla superficie delle piante; senza quantità = ritorno a capacità di campo)
            double irr = 0;
            if (d.Date <= today)
                foreach (var l in waterLogs[d.Date])
                    irr += l.Amount is double liters ? liters / (areaPerPlant * Math.Max(1, gp.Quantity)) : dr;
            dr = Math.Clamp(dr - irr, 0, taw);

            if (d.Date == today) { drToday = dr; rawToday = raw; tawToday = taw; kcToday = kc; etcToday = etc; }
            if (d.Date >= today && nextWater is null && dr >= raw) { nextWater = d.Date; drAtNext = dr; }

            double peff = d.Precipitation >= 2 ? rainFactor * d.Precipitation : 0;
            history.Add(new WaterPoint(d.Date, Math.Round(dr, 1), Math.Round(raw, 1), Math.Round(d.Precipitation, 1), Math.Round(etc, 2), Math.Round(irr, 1), d.Date >= today));
            dr = Math.Clamp(dr - peff + etc, 0, taw);
        }
        if (days.All(d => d.Date < balanceStart)) { tawToday = tawM * zrInit; rawToday = tawToday * 0.25; }

        // Proiezione della maturazione oltre la previsione con le normali climatiche
        double gddNow = gddToday > 0 ? gddToday : gdd;
        if (maturityDate is null && days.Count > 0)
        {
            double acc = gdd;
            var dd = days[^1].Date;
            for (int i = 1; i <= 330 && maturityDate is null; i++)
            {
                var n = ClimateService.Daily(g.Climate!, dd.AddDays(i).DayOfYear);
                if (t.FrostTender && n.FrostProbability > 0.25) break;
                acc += Math.Max(0, Math.Min(n.TMean, t.OptMax) - t.BaseGdd);
                if (acc >= p.GddToMaturity) maturityDate = dd.AddDays(i);
            }
        }

        double progress = Math.Clamp(gddNow / p.GddToMaturity, 0, 1);
        var (stageKey, stage) = StageOf(p, progress, fIni, fDev);
        int age0 = today.DayNumber - gp.PlantedOn.DayNumber;
        var growth = new GrowthInfo(Math.Round(gddNow), p.GddToMaturity, Math.Round(progress, 3), stage, stageKey, age0);

        var recent7 = ws.Days.Where(d => d.Date <= today && d.Date > today.AddDays(-7)).ToList();
        double recentMean = recent7.Count > 0 ? recent7.Average(d => d.TMean) : ClimateService.Daily(g.Climate!, today.DayOfYear).TMean;
        bool dormant = recentMean < t.GrowthMin;

        var water = WaterAdviceFor(p, gp, ws, today, drToday, rawToday, tawToday, kcToday, etcToday, nextWater, drAtNext, areaPerPlant, dormant, history, pot);
        var fert = FertilizeAdviceFor(p, gp, today, progress, maturityDate, dormant, fIni, fDev, pot);
        var harvest = HarvestAdviceFor(p, today, progress, maturityDate);
        var alerts = AlertsFor(p, ws, today);

        // ---------- Pianificazione dei prossimi giorni ----------
        var upcoming = new List<PlannedTask>();
        var horizonEnd = today.AddDays(Horizon);
        var forecastEnd = ws.Days.Count > 0 ? ws.Days[^1].Date : today;
        var dayMap = ws.Days.ToDictionary(d => d.Date);
        DailyWeather WeatherOn(DateOnly d) => dayMap.TryGetValue(d, out var w) ? w : ClimateService.AsWeather(g.Climate!, d);
        bool IsEstimate(DateOnly d) => !ws.Live || d > forecastEnd;

        // Irrigazioni: bilancio idrico proiettato, ipotizzando di annaffiare ogni volta che si raggiunge la soglia
        if (today.AddDays(Horizon) >= gp.PlantedOn)
        {
            double drP = drToday, gddP = gddNow;
            for (var d = Max(today, gp.PlantedOn); d <= horizonEnd; d = d.AddDays(1))
            {
                var w = WeatherOn(d);
                if (d > today) gddP += Math.Max(0, Math.Min(w.TMean, t.OptMax) - t.BaseGdd);
                double f = gddP / p.GddToMaturity;
                double zr = Zr(f), taw = tawM * zr, etc = Kc(f) * w.Et0 * etFactor;
                int age = d.DayNumber - gp.PlantedOn.DayNumber;
                double raw = Math.Clamp(p.Water.DepletionFraction + 0.04 * (5 - etc), 0.1, 0.8) * (age < 10 ? 0.5 : 1) * taw;
                bool skipToday = d == today && water.Status == "rain";
                if (drP >= raw && !skipToday)
                {
                    double mm = Math.Min(drP, pot ? Math.Max(taw, 5) : 40);
                    double liters = Math.Round(mm * totalArea, 1), perPlant = Math.Round(mm * areaPerPlant, 1);
                    upcoming.Add(new PlannedTask("water", d, "Annaffiare",
                        gp.Quantity > 1 ? $"~{liters} L in totale ({perPlant} L per pianta)" : $"~{liters} L", IsEstimate(d)));
                    drP -= mm;
                }
                // Oltre le previsioni la pioggia è incerta: per pianificare (es. un'assenza) se ne conta solo il 60%
                double rainP = IsEstimate(d) ? w.Precipitation * EstimatedRainShare : w.Precipitation;
                double peff = rainP >= 2 ? rainFactor * rainP : 0;
                drP = Math.Clamp(drP - peff + etc, 0, taw);
            }
        }

        // Concimazioni: dalla prossima scadenza, a intervalli regolari, fino alla sospensione pre-raccolta
        if (fert.IntervalDays > 0 && fert.Status is "due" or "soon" or "ok" && fert.NextDate is DateOnly fd0)
        {
            DateOnly? stopAt = !p.ContinuousHarvest && maturityDate is DateOnly md && p.Nutrition.StopBeforeEndDays > 0
                ? md.AddDays(-p.Nutrition.StopBeforeEndDays) : null;
            for (var d = Max(fd0, today); d <= horizonEnd; d = d.AddDays(fert.IntervalDays))
            {
                if (stopAt is DateOnly sa && d >= sa) break;
                upcoming.Add(new PlannedTask("fertilize", d, "Concimare", fert.Advice, d > today));
            }
        }

        // Raccolta
        if (harvest.Status is "ready" or "late")
        {
            if (p.ContinuousHarvest && harvest.ExpectedEnd is DateOnly he)
                for (var d = today; d <= horizonEnd && d <= he; d = d.AddDays(3))
                    upcoming.Add(new PlannedTask("harvest", d, "Raccogliere", d == today ? harvest.Message : "Raccolta periodica: controlla i frutti maturi.", d > today));
            else
                upcoming.Add(new PlannedTask("harvest", today, harvest.Status == "late" ? "Raccogliere subito" : "Raccogliere", harvest.Message, false));
        }
        else if (harvest.ExpectedStart is DateOnly hs && hs <= horizonEnd)
            upcoming.Add(new PlannedTask("harvest", Max(hs, today), "Inizio raccolta",
                $"Primo raccolto stimato. {p.Harvest.Signs}", true));

        // Protezione: temporali forti (o gelo) previsti quando il raccolto è ancora lontano
        bool harvestFar = harvest.Status is "growing" or "uncertain" && (harvest.DaysUntil is null or > 10);
        bool protectedRecently = gp.Logs.Any(l => l.Type == CareType.Note && (l.Note ?? "").StartsWith("Protezione") && l.Date >= today.AddDays(-1));
        if (ws.Live && !protectedRecently && today >= gp.PlantedOn)
        {
            foreach (var w in ws.Forecast.Where(w => w.Date <= today.AddDays(7)))
            {
                bool thunder = w.WeatherCode is >= 95;
                bool hail = w.WeatherCode is 96 or 99;
                bool storm = thunder && w.Precipitation >= 10 || w.Precipitation >= 25 || w.WeatherCode == 82 && w.Precipitation >= 15;
                if (storm && harvestFar)
                {
                    var when = w.Date > today ? w.Date.AddDays(-1) : today;
                    upcoming.Add(new PlannedTask("protect", when, hail ? "Coprire: grandine prevista" : "Coprire: temporale forte",
                        $"Il {w.Date:dd/MM} sono previsti {w.Precipitation:0} mm{(thunder ? " con temporali" : "")}{(hail ? " e possibile grandine" : "")}. " +
                        "Il raccolto è ancora lontano: proteggi le piante con tessuto non tessuto o rete antigrandine ben fissati, " +
                        (pot ? "sposta i vasi al riparo e svuota i sottovasi." : "controlla che l'acqua possa defluire tra i solchi."), false));
                    break;
                }
                if (t.FrostTender && w.TMin < 2 && harvest.Status is not ("ended"))
                {
                    var when = w.Date > today ? w.Date.AddDays(-1) : today;
                    upcoming.Add(new PlannedTask("protect", when, "Coprire: rischio gelo",
                        $"Minima prevista {w.TMin:0.#} °C il {w.Date:dd/MM}: copri la sera con tessuto non tessuto{(pot ? " o porta i vasi al riparo" : "")}.", false));
                    break;
                }
            }
        }

        var lastWater = gp.Logs.Where(l => l.Type == CareType.Water).Select(l => (DateOnly?)l.Date).Max();
        var lastFert = gp.Logs.Where(l => l.Type == CareType.Fertilize).Select(l => (DateOnly?)l.Date).Max();

        return new PlantStatus
        {
            Id = gp.Id, SpeciesId = p.Id, Name = p.Name, Emoji = p.Emoji, ScientificName = p.ScientificName,
            Label = gp.Label, Quantity = gp.Quantity, PlantedOn = gp.PlantedOn, Notes = gp.Notes,
            Growth = growth, Water = water, Fertilize = fert, Harvest = harvest, Alerts = alerts,
            Fitness = fit.Score, FitnessLabel = fit.Label, FitnessNote = fit.Summary, LastWatered = lastWater, LastFertilized = lastFert,
            HarvestedKg = gp.Logs.Where(l => l.Type == CareType.Harvest).Sum(l => l.Amount ?? 0),
            // ultime operazioni: per data, poi per momento di registrazione (le più recenti prima)
            RecentLogs = gp.Logs.Select((l, i) => (l, i)).OrderByDescending(x => x.l.Date).ThenByDescending(x => x.l.CreatedAt ?? DateTime.MinValue)
                .ThenByDescending(x => x.i).Take(10).Select(x => x.l).ToList(),
            LogCount = gp.Logs.Count,
            LotId = lot?.Id, AreaM2 = Math.Round(totalArea, 2),
            ExpectedYieldKg = Agronomy.EstimatedYieldKg(p, totalArea, fit.Score),
            Upcoming = upcoming.OrderBy(u => u.Date).ToList(),
        };
    }

    private static (string, string) StageOf(PlantSpecies p, double f, double fIni, double fDev)
    {
        bool fruit = p.Category is "Frutto" or "Legume" or "Infiorescenza";
        if (f >= 1) return ("harvest", "In raccolta");
        if (f < Math.Min(0.08, fIni)) return ("establish", p.Planting.Method.StartsWith("Semina") ? "Germinazione" : "Attecchimento");
        if (f < fDev) return ("vegetative", "Sviluppo vegetativo");
        return fruit ? ("reproductive", "Fioritura e allegagione") : ("bulking", p.Category switch
        {
            "Radice" or "Tubero" => "Ingrossamento della radice/tubero",
            "Bulbo" => "Bulbificazione",
            "Grumolo" => "Ingrossamento del grumolo",
            _ => "Accrescimento fogliare",
        });
    }

    private static WaterAdvice WaterAdviceFor(PlantSpecies p, GardenPlant gp, WeatherSeries ws, DateOnly today,
        double dr, double raw, double taw, double kc, double etc, DateOnly? next, double drAtNext, double area, bool dormant, List<WaterPoint> history, bool pot)
    {
        double rain3 = ws.Forecast.Take(3).Sum(d => d.Precipitation);
        double mm = Math.Round(next == today || dr >= raw ? dr : drAtNext, 1);
        if (mm < 3) mm = Math.Round(Math.Max(raw, 5), 1);
        double cap = pot ? Math.Max(taw, 5) : 40;
        bool split = mm > cap && !pot;
        if (mm > cap) mm = Math.Round(cap, 1); // dose massima pratica per singolo intervento: oltre si perde per ruscellamento/percolazione
        double perPlant = Math.Round(mm * area, 1);
        double total = Math.Round(perPlant * gp.Quantity, 1);
        int? until = next is DateOnly n ? n.DayNumber - today.DayNumber : null;

        string status, msg;
        if (today < gp.PlantedOn)
        {
            status = "planned"; msg = "Non ancora messa a dimora.";
        }
        else if (dr >= raw && rain3 >= dr * 0.8 && rain3 >= 5)
        {
            status = "rain"; msg = $"Il suolo è asciutto ({dr:0} mm consumati) ma sono attesi {rain3:0} mm di pioggia nei prossimi 3 giorni: puoi aspettare.";
        }
        else if (dr >= raw)
        {
            status = "now"; msg = $"Annaffia oggi: nella zona delle radici mancano {dr:0} mm d'acqua (soglia di intervento {raw:0} mm). Distribuisci circa {perPlant} L per pianta alla base" + (split ? ", ripetendo domani: il suolo è molto asciutto." : pot ? " finché l'acqua inizia a uscire dai fori di drenaggio." : ".");
        }
        else if (until is int u && u <= 2)
        {
            status = "soon"; msg = u == 1 ? $"Domani servirà acqua (~{perPlant} L per pianta)." : $"Tra 2 giorni servirà acqua (~{perPlant} L per pianta).";
        }
        else if (dormant)
        {
            status = "dormant"; msg = "Crescita rallentata dal freddo: consumi d'acqua molto bassi, irriga solo se il terreno è secco in profondità.";
        }
        else
        {
            status = "ok";
            msg = until is int u2 ? $"Suolo con riserva sufficiente. Prossima irrigazione stimata tra {u2} giorni." : "Suolo con riserva sufficiente per tutto il periodo di previsione.";
        }

        return new WaterAdvice(status, dr >= raw ? today : next, dr >= raw ? 0 : until, Math.Round(dr, 1), Math.Round(raw, 1), Math.Round(taw, 1),
            perPlant, total, mm, Math.Round(kc, 2), Math.Round(etc, 2), Math.Round(rain3, 1), msg,
            history.Where(h => h.Date >= today.AddDays(-14)).ToList());
    }

    private static FertilizeAdvice FertilizeAdviceFor(PlantSpecies p, GardenPlant gp, DateOnly today, double f, DateOnly? maturity, bool dormant, double fIni, double fDev, bool pot)
    {
        var n = p.Nutrition;
        // In vaso il volume di terriccio è piccolo e le irrigazioni dilavano i nutrienti: concimazioni più ravvicinate e leggere
        int interval = n.IntervalDays == 0 ? 0 : pot ? Math.Max(7, (int)Math.Round(n.IntervalDays * 0.6)) : n.IntervalDays;
        bool reproductive = f >= fDev;
        string phase = reproductive ? "Fase produttiva" : "Fase vegetativa";
        string advice = reproductive && n.Reproductive != "—" ? n.Reproductive : n.Vegetative;

        if (interval == 0)
            return new FertilizeAdvice("none", null, null, phase, n.Vegetative, n.Organic,
                "Nessuna concimazione di routine necessaria per questa specie.");

        var last = gp.Logs.Where(l => l.Type == CareType.Fertilize).Select(l => (DateOnly?)l.Date).Max();
        var due = last is DateOnly l0 ? l0.AddDays(interval) : gp.PlantedOn.AddDays(n.StartAfterDays);
        int until = due.DayNumber - today.DayNumber;

        if (n.StopBeforeEndDays > 0 && !p.ContinuousHarvest && maturity is DateOnly m && today >= m.AddDays(-n.StopBeforeEndDays))
            return new FertilizeAdvice("stop", null, null, phase, advice, n.Organic,
                $"Sospendi le concimazioni: mancano meno di {n.StopBeforeEndDays} giorni al raccolto (qualità e conservabilità, nitrati nelle foglie).");
        if (dormant)
            return new FertilizeAdvice("dormant", due, Math.Max(0, until), phase, advice, n.Organic,
                "La pianta cresce poco per il freddo: rimanda la concimazione alla ripresa vegetativa, i nutrienti verrebbero dilavati.");
        if (until <= 0)
            return new FertilizeAdvice("due", today, 0, phase, advice, n.Organic, $"Concima ora. {advice}" + (pot ? " In vaso usa dosi dimezzate di concime liquido, più spesso." : ""), interval);
        if (until <= 3)
            return new FertilizeAdvice("soon", due, until, phase, advice, n.Organic, $"Concimazione prevista tra {until} giorni.", interval);
        return new FertilizeAdvice("ok", due, until, phase, advice, n.Organic, $"Prossima concimazione il {due:dd/MM} (tra {until} giorni).", interval);
    }

    private static HarvestAdvice HarvestAdviceFor(PlantSpecies p, DateOnly today, double f, DateOnly? maturity)
    {
        var end = maturity?.AddDays(p.HarvestWindowDays);
        int? until = maturity is DateOnly m ? m.DayNumber - today.DayNumber : null;
        if (maturity is null)
            return new HarvestAdvice("uncertain", null, null, null, p.Harvest.Signs,
                "Con il clima previsto la pianta potrebbe non completare il ciclo in piena aria: valuta una protezione.");
        if (f >= 1 && end is DateOnly e && today > e && !p.ContinuousHarvest)
            return new HarvestAdvice("late", maturity, end, until, p.Harvest.Signs, "Finestra di raccolta superata: raccogli subito, la qualità cala rapidamente.");
        if (f >= 1 && end is DateOnly e2 && today > e2 && p.ContinuousHarvest)
            return new HarvestAdvice("ended", maturity, end, until, p.Harvest.Signs,
                "Produzione a fine ciclo: raccogli gli ultimi prodotti e, quando la pianta si esaurisce, libera l'aiuola (segna la coltura come conclusa).");
        if (f >= 1)
            return new HarvestAdvice("ready", maturity, end, until, p.Harvest.Signs,
                p.ContinuousHarvest ? "In produzione: raccogli regolarmente per stimolare nuovi frutti/foglie." : $"Pronto da raccogliere (indicativamente entro il {end:dd/MM}).");
        if (until <= 10)
            return new HarvestAdvice("soon", maturity, end, until, p.Harvest.Signs, $"Raccolto vicino: circa {until} giorni. Controlla i segnali di maturazione.");
        return new HarvestAdvice("growing", maturity, end, until, p.Harvest.Signs, $"Raccolto stimato intorno al {maturity:dd/MM/yyyy}.");
    }

    private static List<Alert> AlertsFor(PlantSpecies p, WeatherSeries ws, DateOnly today)
    {
        var t = p.Temperature; var a = new List<Alert>();
        var fc = ws.Forecast.Take(7).ToList();
        if (fc.Count == 0) return a;
        var minDay = fc.MinBy(d => d.TMin)!;
        if (t.FrostTender && minDay.TMin < 3)
            a.Add(new("danger", "Rischio gelo", $"Minima prevista {minDay.TMin:0.#} °C il {minDay.Date:dd/MM}: copri le piante con tessuto non tessuto o raccogli i frutti."));
        else if (!t.FrostTender && minDay.TMin < t.MinSurvival + 2)
            a.Add(new("danger", "Freddo intenso", $"Minima prevista {minDay.TMin:0.#} °C il {minDay.Date:dd/MM}, vicino al limite della specie ({t.MinSurvival} °C): proteggi le piante."));
        else if (minDay.TMin < t.GrowthMin - 5 && t.FrostTender)
            a.Add(new("warning", "Notti fredde", $"Minime fino a {minDay.TMin:0.#} °C: crescita e allegagione rallentate."));

        var maxDay = fc.MaxBy(d => d.TMax)!;
        if (maxDay.TMax > t.GrowthMax)
            a.Add(new("warning", "Caldo eccessivo", $"Massima prevista {maxDay.TMax:0.#} °C il {maxDay.Date:dd/MM}: irriga al mattino presto, ombreggia se possibile."));

        for (int i = 0; i + 2 < fc.Count; i++)
        {
            double r = fc[i].Precipitation + fc[i + 1].Precipitation + fc[i + 2].Precipitation;
            if (r >= 40) { a.Add(new("info", "Piogge abbondanti", $"~{r:0} mm attesi dal {fc[i].Date:dd/MM}: controlla i ristagni e il rischio di malattie fungine.")); break; }
        }
        return a;
    }

    private static DateOnly Max(DateOnly a, DateOnly b) => a > b ? a : b;
}

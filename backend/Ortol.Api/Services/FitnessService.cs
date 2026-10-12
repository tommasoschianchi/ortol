using Ortol.Api.Models;

namespace Ortol.Api.Services;

public record MonthWindow(int Month, WindowStatus Status, int? DaysToHarvest);

public record FitnessComponent(string Key, string Label, double Score, double Weight, string Detail);

public record FitnessResult
{
    public string SpeciesId { get; init; } = "";
    public int Score { get; init; }
    public string Label { get; init; } = "";
    public List<FitnessComponent> Components { get; init; } = new();
    public List<MonthWindow> Calendar { get; init; } = new();
    public int? BestMonth { get; init; }
    public string Summary { get; init; } = "";
    /// <summary>Data di messa a dimora su cui è calcolata l'idoneità.</summary>
    public DateOnly Start { get; init; }
    public DateOnly? ExpectedHarvest { get; init; }
    public int CycleDays { get; init; }
    /// <summary>Giorni del ciclo con meteo osservato o previsto.</summary>
    public int RealDays { get; init; }
    public WindowStatus Status { get; init; }
}

public record Recommendation
{
    public PlantSpecies Species { get; init; } = null!;
    public FitnessResult Fitness { get; init; } = null!;
    public string Timing { get; init; } = ""; // "ora" | "presto"
    public WindowStatus Status { get; init; }
    public DateOnly? ExpectedHarvest { get; init; }
    public string Reason { get; init; } = "";
    /// <summary>Ultimo giorno (da oggi) in cui si può ancora mettere a dimora senza protezione (stato almeno "Possibile").</summary>
    public DateOnly? OpenUntil { get; init; }
    /// <summary>Ultimo giorno in cui il periodo resta "Ideale" (solo se oggi è ideale).</summary>
    public DateOnly? IdealUntil { get; init; }
    /// <summary>Durata del ciclo prevista rispetto a quella tipica della specie (1 = normale, 2 = il doppio).</summary>
    public double? SlowFactor { get; init; }
}

/// <summary>
/// Indice di idoneità (0–100) di una specie messa a dimora in una data precisa (di norma oggi, oppure il giorno in cui
/// è stata piantata), valutato sull'intero ciclo fino al raccolto: i primi giorni usano il meteo osservato e le previsioni,
/// il resto le medie climatiche della località. Combina: arrivo a maturazione, quota di giorni in fascia termica ottimale,
/// stress da caldo, rischio da freddo/gelo e temperature alla messa a dimora.
/// </summary>
public class FitnessService
{
    private static readonly string[] MonthNames = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];

    /// <summary>Calendario di semina sulle medie climatiche: esito di una semina a metà di ogni mese.</summary>
    public (List<MonthWindow> Calendar, int? BestMonth) Calendar(PlantSpecies p, ClimateProfile c)
    {
        var outcomes = Enumerable.Range(1, 12)
            .Select(m => (Month: m, O: SeasonSimulator.Simulate(p, c, new DateOnly(2023, m, 15).DayOfYear)))
            .ToList();
        var calendar = outcomes.Select(x => new MonthWindow(x.Month, x.O.Status, x.O.DaysToHarvest)).ToList();
        var best = outcomes.Where(x => x.O.PlantingTempOk)
            .OrderByDescending(x => x.O.Status).ThenByDescending(x => x.O.OptimalShare).ThenByDescending(x => Math.Min(x.O.GddRatio, 1.5))
            .Select(x => (int?)x.Month).FirstOrDefault();
        return (calendar, best);
    }

    /// <summary>Idoneità per una messa a dimora in <paramref name="start"/>.</summary>
    public FitnessResult Evaluate(PlantSpecies p, ClimateProfile c, Cultivation cultivation, DateOnly start,
        IReadOnlyDictionary<DateOnly, DailyWeather>? weather, DateOnly today)
    {
        var o = SeasonSimulator.Simulate(p, c, start, weather, today);
        return Score(p, c, cultivation, start, today, o, weather);
    }

    private FitnessResult Score(PlantSpecies p, ClimateProfile c, Cultivation cultivation, DateOnly start, DateOnly today,
        SeasonOutcome o, IReadOnlyDictionary<DateOnly, DailyWeather>? weather)
    {
        var t = p.Temperature;
        var (calendar, bestMonth) = Calendar(p, c);
        DateOnly end = start.AddDays(o.CycleDays - 1);

        double season = o.Reached ? 1 : Math.Min(0.95, o.GddRatio);
        double optimal = o.OptimalShare;
        double heat = 1 - Math.Min(1, o.HeatStressDays * 3.0 / Math.Max(1, o.CycleDays));
        double cold; string coldDetail;
        if (t.FrostTender)
        {
            cold = 1 - Math.Clamp((o.MaxFrostProbability - 0.02) / 0.30, 0, 1);
            coldDetail = o.MaxFrostProbability < 0.02 ? "nessun rischio di gelata fino al raccolto"
                : $"rischio di gelata fino al {Math.Round(o.MaxFrostProbability * 100):0}% nei giorni più freddi del ciclo";
        }
        else
        {
            double margin = o.LowestExtremeMin - t.MinSurvival;
            cold = margin >= 2 ? 1 : Math.Clamp((margin + 6) / 8, 0, 1);
            coldDetail = $"minima più bassa attesa nel ciclo ~{o.LowestExtremeMin:0} °C, tollera fino a {t.MinSurvival:0} °C";
        }
        double dist = o.PlantingTemp < p.Planting.TempMinMean ? p.Planting.TempMinMean - o.PlantingTemp
                    : o.PlantingTemp > p.Planting.TempMaxMean ? o.PlantingTemp - p.Planting.TempMaxMean : 0;
        double planting = 1 - Math.Min(1, dist / 4);

        string when = start == today ? "oggi" : start < today ? $"il {start:dd/MM/yyyy}" : $"il {start:dd/MM}";
        var comps = new List<FitnessComponent>
        {
            new("season", "Arrivo al raccolto", Math.Round(season, 2), 0.35,
                o.Reached ? $"{p.GddToMaturity:0} gradi-giorno raggiunti in ~{o.DaysToHarvest} giorni (raccolto verso il {start.AddDays(o.DaysToHarvest ?? 0):dd/MM})"
                          : $"si accumulano {o.GddAvailable:0} gradi-giorno su {p.GddToMaturity:0}: il ciclo si ferma dopo ~{o.CycleDays} giorni per {o.StopReason}"),
            new("optimal", "Temperature ottimali", Math.Round(optimal, 2), 0.30,
                $"{optimal:P0} dei giorni di crescita tra {t.OptMin:0} e {t.OptMax:0} °C (dal {start:dd/MM} al {end:dd/MM})"),
            new("heat", "Stress da caldo", Math.Round(heat, 2), 0.15,
                o.HeatStressDays == 0 ? "nessun giorno oltre il limite nel ciclo" : $"~{o.HeatStressDays} giorni con massime oltre {t.GrowthMax:0} °C"),
            new("cold", t.FrostTender ? "Rischio gelate" : "Resistenza al freddo", Math.Round(cold, 2), 0.20, coldDetail),
            new("planting", "Temperature alla messa a dimora", Math.Round(planting, 2), 0,
                $"media {o.PlantingTemp:0.#} °C nei giorni della messa a dimora {when}, adatta tra {p.Planting.TempMinMean:0} e {p.Planting.TempMaxMean:0} °C" +
                (planting < 1 ? $": punteggio moltiplicato ×{0.4 + 0.6 * planting:0.00}" : "") +
                (o.PlantingTempOk ? "" : " · fuori periodo di semina: idoneità al massimo 50")),
        };

        double score = comps.Where(x => x.Weight > 0).Sum(x => x.Score * x.Weight) * 100;
        score *= 0.4 + 0.6 * planting;
        if (!o.PlantingTempOk) score = Math.Min(score, 50);
        if (!o.Reached) score = Math.Min(score, o.Status == WindowStatus.ConProtezione ? 55 : 35);
        if (cultivation == Cultivation.Vaso)
        {
            var ct = p.Container;
            comps.Add(new("container", "Coltivazione in vaso", ct.Factor, 0,
                $"{ct.Suitability}: punteggio moltiplicato ×{ct.Factor:0.0#}. Servono almeno {ct.MinLiters:0} L di terriccio e {ct.MinDepthCm:0} cm di profondità per pianta. {ct.Notes}"));
            score *= ct.Factor;
        }
        int s = (int)Math.Round(Math.Clamp(score, 0, 100));

        int normalDays = o.CycleDays - o.RealDays;
        string normals = c.Estimated ? "le medie climatiche stimate" : $"le medie climatiche {c.Period}";
        string basis = o.RealDays == 0
            ? $"Calcolata con {normals} per tutti i {o.CycleDays} giorni del ciclo (meteo reale non disponibile)."
            : $"Calcolata con {o.RealDays} giorni di meteo {(start < today ? "osservato o " : "")}previsto e {normals} per i restanti {normalDays}.";
        string outcome = o.Reached
            ? $"Messa a dimora {when}: raccolto previsto verso il {start.AddDays(o.DaysToHarvest ?? 0):dd/MM/yyyy}."
            : $"Messa a dimora {when}: il ciclo si fermerebbe dopo ~{o.CycleDays} giorni per {o.StopReason}" +
              (o.Status == WindowStatus.ConProtezione ? " (recuperabile con tunnel o tessuto non tessuto)." : ".");
        var good = calendar.Where(w => w.Status >= WindowStatus.Possibile).Select(w => MonthNames[w.Month - 1]).ToList();
        string cal = good.Count == 0 ? " Il clima locale non offre una finestra affidabile in piena aria." : $" Periodi di semina consigliati: {string.Join(", ", good)}.";

        return new FitnessResult
        {
            SpeciesId = p.Id, Score = s, Label = LabelFor(s), Components = comps, Calendar = calendar,
            BestMonth = bestMonth, Summary = $"{outcome} {basis}{cal}",
            Start = start, ExpectedHarvest = o.DaysToHarvest is int dh ? start.AddDays(dh) : null,
            CycleDays = o.CycleDays, RealDays = o.RealDays, Status = o.Status,
        };
    }

    public List<Recommendation> Recommend(IEnumerable<PlantSpecies> species, ClimateProfile c, DateOnly today, Cultivation cultivation,
        IReadOnlyDictionary<DateOnly, DailyWeather>? weather)
    {
        var list = new List<Recommendation>();
        foreach (var p in species)
        {
            if (cultivation == Cultivation.Vaso && p.Container.Suitability == "Sconsigliata") continue;
            var now = SeasonSimulator.Simulate(p, c, today, weather, today);
            var fit = Score(p, c, cultivation, today, today, now, weather);
            if (now.Status >= WindowStatus.ConProtezione)
            {
                // Fino a quando resta aperta la finestra? Simula la semina nei giorni successivi.
                DateOnly? openUntil = null, idealUntil = null;
                if (now.Status >= WindowStatus.Possibile)
                {
                    openUntil = today;
                    if (now.Status == WindowStatus.Ideale) idealUntil = today;
                    for (int k = 1; k <= 120; k++)
                    {
                        var st = SeasonSimulator.Simulate(p, c, today.AddDays(k), weather, today).Status;
                        if (st < WindowStatus.Possibile) break;
                        openUntil = today.AddDays(k);
                        if (st == WindowStatus.Ideale && idealUntil == today.AddDays(k - 1)) idealUntil = today.AddDays(k);
                    }
                }
                double? slow = now.DaysToHarvest is int dh && p.DaysToMaturity > 0 ? Math.Round(dh / (double)p.DaysToMaturity, 2) : null;
                int left = openUntil is DateOnly ou ? ou.DayNumber - today.DayNumber : 0;

                string reason = now.Status switch
                {
                    WindowStatus.Ideale => "Periodo ideale: temperature adatte e stagione sufficiente per arrivare al raccolto.",
                    WindowStatus.Possibile => "Periodo utile, ma non tutte le condizioni saranno ottimali.",
                    _ => $"Fattibile solo con protezione (tunnel o tessuto non tessuto): senza, il ciclo rischia di fermarsi per {now.StopReason}.",
                };
                if (now.Status >= WindowStatus.Possibile && left <= 10)
                    reason += left == 0 ? " La finestra di semina si chiude oggi: da domani servirà una protezione."
                                        : $" La finestra si sta chiudendo: semina entro il {openUntil:dd/MM}.";
                var harvestDate = now.DaysToHarvest is int hd ? today.AddDays(hd) : (DateOnly?)null;
                bool overwinters = harvestDate is DateOnly hdt && hdt.Year > today.Year && hdt.Month is >= 2 and <= 7;
                if (overwinters)
                    reason += $" Semina autunnale: la pianta passa l'inverno e si raccoglie in primavera-estate (verso il {harvestDate:dd/MM}).";
                else if (slow is > 1.5)
                    reason += $" Con il freddo in arrivo il ciclo durerà circa {now.DaysToHarvest} giorni invece dei {p.DaysToMaturity} tipici.";

                list.Add(new Recommendation
                {
                    Species = p, Fitness = fit, Timing = "ora", Status = now.Status,
                    ExpectedHarvest = now.DaysToHarvest is int d ? today.AddDays(d) : null,
                    Reason = reason, OpenUntil = openUntil, IdealUntil = idealUntil, SlowFactor = slow,
                });
                continue;
            }
            // Prossime 5 settimane
            for (int ahead = 7; ahead <= 35; ahead += 7)
            {
                var date = today.AddDays(ahead);
                var o = SeasonSimulator.Simulate(p, c, date, weather, today);
                if (o.Status >= WindowStatus.Possibile)
                {
                    list.Add(new Recommendation
                    {
                        Species = p, Fitness = fit, Timing = "presto", Status = o.Status,
                        ExpectedHarvest = o.DaysToHarvest is int d ? date.AddDays(d) : null,
                        Reason = $"Da mettere a dimora tra circa {ahead / 7} settiman{(ahead == 7 ? "a" : "e")} (dal {date:dd/MM})."
                    });
                    break;
                }
            }
        }
        return list
            .OrderBy(r => r.Timing == "ora" ? 0 : 1)
            .ThenByDescending(r => r.Status)
            .ThenByDescending(r => r.Fitness.Score)
            .ToList();
    }

    public static string LabelFor(int score) => score switch
    {
        >= 80 => "Ottima",
        >= 60 => "Buona",
        >= 40 => "Discreta",
        >= 20 => "Scarsa",
        _ => "Inadatta",
    };
}

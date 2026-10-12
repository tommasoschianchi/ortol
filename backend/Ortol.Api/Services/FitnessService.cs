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
/// Indice di idoneità (0–100) di una specie al clima di una località, combinando:
/// lunghezza della stagione utile (GDD disponibili / richiesti), quota di giorni in fascia termica ottimale,
/// stress da caldo e rischio da freddo/gelo.
/// </summary>
public class FitnessService
{
    private static readonly string[] MonthNames = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];

    public FitnessResult Evaluate(PlantSpecies p, ClimateProfile c, Cultivation cultivation = Cultivation.Terra)
    {
        var outcomes = Enumerable.Range(1, 12)
            .Select(m => (Month: m, O: SeasonSimulator.Simulate(p, c, new DateOnly(2023, m, 15).DayOfYear)))
            .ToList();

        var calendar = outcomes.Select(x => new MonthWindow(x.Month, x.O.Status, x.O.DaysToHarvest)).ToList();

        // Finestra migliore: prima per stato, poi per quota ottimale e margine di GDD
        var best = outcomes.Where(x => x.O.PlantingTempOk).DefaultIfEmpty(outcomes.MaxBy(x => x.O.GddRatio))
            .OrderByDescending(x => x.O.Status)
            .ThenByDescending(x => x.O.OptimalShare)
            .ThenByDescending(x => Math.Min(x.O.GddRatio, 1.5))
            .First();
        var o = best.O;
        var t = p.Temperature;

        double season = Math.Min(1, o.GddRatio);
        double optimal = o.OptimalShare;
        double heat = 1 - Math.Min(1, o.HeatStressDays / 30.0);

        // Rischio freddo
        double coldScore; string coldDetail;
        double coldestMin = c.Months.Min(m => m.TMin);
        if (t.FrostTender)
        {
            double need = p.DaysToMaturity + Math.Min(p.HarvestWindowDays, 30);
            coldScore = Math.Min(1, c.FrostFreeDays / need);
            coldDetail = $"{c.FrostFreeDays} giorni senza gelo all'anno, ne servono ~{need:0}";
        }
        else
        {
            double extreme = coldestMin - 6;
            double margin = extreme - t.MinSurvival;
            coldScore = margin >= 0 ? 1 : Math.Max(0, 1 + margin / 8);
            coldDetail = $"minima stimata nel mese più freddo {extreme:0} °C, tollera fino a {t.MinSurvival:0} °C";
        }

        var comps = new List<FitnessComponent>
        {
            new("season", "Durata della stagione", Math.Round(season, 2), 0.40,
                $"{o.GddAvailable:0} gradi-giorno disponibili su {p.GddToMaturity:0} richiesti" + (o.Reached ? "" : $" (si ferma per {o.StopReason})")),
            new("optimal", "Temperature ottimali", Math.Round(optimal, 2), 0.30,
                $"{optimal:P0} dei giorni di crescita tra {t.OptMin:0} e {t.OptMax:0} °C"),
            new("heat", "Stress da caldo", Math.Round(heat, 2), 0.15,
                o.HeatStressDays == 0 ? "nessun giorno oltre il limite" : $"~{o.HeatStressDays} giorni con massime oltre {t.GrowthMax:0} °C"),
            new("cold", t.FrostTender ? "Rischio gelate" : "Resistenza al freddo", Math.Round(coldScore, 2), 0.15, coldDetail),
        };

        double score = comps.Sum(x => x.Score * x.Weight) * 100;
        if (!calendar.Any(w => w.Status >= WindowStatus.Possibile))
            score = Math.Min(score, calendar.Any(w => w.Status == WindowStatus.ConProtezione) ? 50 : 30);
        if (cultivation == Cultivation.Vaso)
        {
            var ct = p.Container;
            comps.Add(new("container", "Coltivazione in vaso", ct.Factor, 0,
                $"{ct.Suitability}: punteggio moltiplicato ×{ct.Factor:0.0#}. Servono almeno {ct.MinLiters:0} L di terriccio e {ct.MinDepthCm:0} cm di profondità per pianta. {ct.Notes}"));
            score *= ct.Factor;
        }
        int s = (int)Math.Round(Math.Clamp(score, 0, 100));

        var good = calendar.Where(w => w.Status >= WindowStatus.Possibile).Select(w => MonthNames[w.Month - 1]).ToList();
        string summary = good.Count == 0
            ? "Il clima locale non offre una finestra di coltivazione affidabile in piena aria."
            : $"Messa a dimora consigliata: {string.Join(", ", good)}.";

        return new FitnessResult
        {
            SpeciesId = p.Id, Score = s, Label = LabelFor(s), Components = comps, Calendar = calendar,
            BestMonth = o.PlantingTempOk ? best.Month : null, Summary = summary,
        };
    }

    public List<Recommendation> Recommend(IEnumerable<PlantSpecies> species, ClimateProfile c, DateOnly today, Cultivation cultivation = Cultivation.Terra)
    {
        var list = new List<Recommendation>();
        foreach (var p in species)
        {
            if (cultivation == Cultivation.Vaso && p.Container.Suitability == "Sconsigliata") continue;
            var fit = Evaluate(p, c, cultivation);
            var now = SeasonSimulator.Simulate(p, c, today.DayOfYear);
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
                        var st = SeasonSimulator.Simulate(p, c, today.AddDays(k).DayOfYear).Status;
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
                var o = SeasonSimulator.Simulate(p, c, date.DayOfYear);
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

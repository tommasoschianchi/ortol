using Ortol.Api.Models;

namespace Ortol.Api.Services;

public enum WindowStatus { NonAdatto, ConProtezione, Possibile, Ideale }

public record SeasonOutcome
{
    public bool Reached { get; init; }
    public int? DaysToHarvest { get; init; }
    public double GddAvailable { get; init; }
    public double GddRatio { get; init; }
    public double OptimalShare { get; init; }
    public int HeatStressDays { get; init; }
    public int ColdDays { get; init; }
    public string? StopReason { get; init; }
    /// <summary>Il ciclo fallisce per freddo ma con un margine piccolo, recuperabile con tunnel o tessuto non tessuto.</summary>
    public bool ProtectionWouldHelp { get; init; }
    public bool PlantingTempOk { get; init; }
    public WindowStatus Status { get; init; }

    // Dettagli del ciclo simulato, usati dall'indice di idoneità
    /// <summary>Giorni simulati (fino al raccolto o all'interruzione).</summary>
    public int CycleDays { get; init; }
    /// <summary>Probabilità di gelata massima incontrata nel ciclo.</summary>
    public double MaxFrostProbability { get; init; }
    /// <summary>Minima assoluta stimata più bassa del ciclo (°C).</summary>
    public double LowestExtremeMin { get; init; }
    /// <summary>Temperatura media nei giorni della messa a dimora (°C).</summary>
    public double PlantingTemp { get; init; }
    /// <summary>Giorni del ciclo coperti da meteo osservato o previsto (il resto sono medie climatiche).</summary>
    public int RealDays { get; init; }
}

/// <summary>
/// Simula giorno per giorno una stagione colturale: accumulo di gradi-giorno (GDD, metodo con soglia superiore = ottimo massimo),
/// interruzione per gelo (colture sensibili) o freddo letale, salita a seme per caldo (colture microterme),
/// fabbisogno di vernalizzazione. I giorni possono venire dal meteo reale/previsto o dalle normali climatiche.
/// </summary>
public static class SeasonSimulator
{
    private const int MaxDays = 330;
    /// <summary>Giorni consecutivi di caldo o freddo anomalo necessari per fermare il ciclo (un singolo giorno non basta).</summary>
    private const int Persist = 3;

    /// <summary>Semina in un giorno dell'anno, solo su medie climatiche (per il calendario di semina).</summary>
    public static SeasonOutcome Simulate(PlantSpecies p, ClimateProfile c, int startDoy) =>
        Simulate(p, d => ClimateService.Daily(c, ((startDoy - 1 + d) % 365) + 1));

    /// <summary>
    /// Semina in una data precisa: per i giorni coperti da <paramref name="weather"/> (osservati o previsti) usa le temperature reali,
    /// per gli altri le medie climatiche di quel giorno.
    /// </summary>
    public static SeasonOutcome Simulate(PlantSpecies p, ClimateProfile c, DateOnly start, IReadOnlyDictionary<DateOnly, DailyWeather>? weather, DateOnly today) =>
        Simulate(p, d => DayFor(c, start.AddDays(d), weather, today));

    public static DayNormal DayFor(ClimateProfile c, DateOnly date, IReadOnlyDictionary<DateOnly, DailyWeather>? weather, DateOnly today)
    {
        if (weather is not null && weather.TryGetValue(date, out var w) && !w.Estimated)
        {
            int lead = date.DayNumber - today.DayNumber;
            // Dato osservato: incertezza minima. Previsione: cresce con l'anticipo.
            double sigma = lead < 0 ? 0.7 : 1.2 + 0.15 * lead;
            double offset = lead < 0 ? 0 : Math.Min(3, 0.5 + 0.25 * lead);
            return new DayNormal(w.TMax, w.TMin, w.TMean, w.Et0, w.Precipitation, sigma, offset, Real: true);
        }
        return ClimateService.Daily(c, date.DayOfYear);
    }

    private static SeasonOutcome Simulate(PlantSpecies p, Func<int, DayNormal> day)
    {
        var t = p.Temperature;
        // Temperatura alla messa a dimora: media dei primi 3 giorni (un singolo giorno anomalo non decide la semina)
        double plantTemp = Enumerable.Range(0, 3).Average(i => day(i).TMean);
        var start = day(0);
        bool plantingOk = plantTemp >= p.Planting.TempMinMean && plantTemp <= p.Planting.TempMaxMean
                          && !(t.FrostTender && start.FrostProbability > 0.05);

        double gdd = 0; int optimal = 0, growing = 0, heat = 0, cold = 0, vernal = 0, real = 0;
        int hotRun = 0, chillRun = 0, days = 0;
        double maxFrost = 0, lowest = double.MaxValue;
        string? stop = null; bool protectable = false; int? harvestDay = null;
        bool coolSeasonCrop = t.GrowthMax <= 30;

        for (int d = 0; d < MaxDays; d++)
        {
            var n = day(d);
            days = d + 1;
            if (n.Real) real++;
            maxFrost = Math.Max(maxFrost, n.FrostProbability);
            double extremeMin = n.TMin - n.ExtremeOffset;
            lowest = Math.Min(lowest, extremeMin);

            // Eventi letali
            if (t.FrostTender && n.FrostProbability > 0.15)
            {
                stop = "gelate"; protectable = n.FrostProbability < 0.35 && d > 0; break;
            }
            if (!t.FrostTender && extremeMin < t.MinSurvival)
            {
                stop = "freddo eccessivo"; protectable = t.MinSurvival - extremeMin <= 4; break;
            }
            hotRun = n.TMax > t.GrowthMax + 2 ? hotRun + 1 : 0;
            if (coolSeasonCrop && !p.ContinuousHarvest && hotRun >= Persist && d > 10)
            {
                stop = "caldo (prefioritura / salita a seme)"; break;
            }
            chillRun = n.TMean < t.GrowthMin - 2 ? chillRun + 1 : 0;
            if (t.FrostTender && chillRun >= Persist && d > 0)
            {
                stop = "temperature troppo basse per la crescita"; protectable = true; break;
            }

            if (n.TMean < 13) vernal++; // soglia larga: anche climi miti permettono una vernalizzazione parziale
            if (n.TMax > t.GrowthMax) heat++;
            if (n.TMean < t.GrowthMin) cold++;
            else
            {
                growing++;
                if (n.TMean >= t.OptMin && n.TMean <= t.OptMax) optimal++;
            }

            gdd += Math.Max(0, Math.Min(n.TMean, t.OptMax) - t.BaseGdd);
            if (gdd >= p.GddToMaturity)
            {
                if (p.NeedsVernalization && vernal < 30) { stop = "freddo invernale insufficiente (vernalizzazione)"; break; }
                harvestDay = d; break;
            }
        }

        bool reached = harvestDay is not null;
        if (!reached && stop is null) stop = "stagione troppo corta";
        double ratio = gdd / p.GddToMaturity;
        double optShare = growing == 0 ? 0 : optimal / (double)growing;

        // Le colture termofile che impiegano molto più del previsto passano l'inverno al limite: non affidabili in piena aria.
        bool tooSlow = t.FrostTender && reached && (harvestDay > p.DaysToMaturity * 1.6 || cold > 20);
        if (tooSlow) { reached = false; stop = "crescita troppo lenta con il freddo"; protectable = true; }

        WindowStatus status;
        if (!plantingOk) status = WindowStatus.NonAdatto;
        else if (reached) status = optShare >= 0.45 && heat <= 15 ? WindowStatus.Ideale : WindowStatus.Possibile;
        else if (protectable && ratio >= 0.7) status = WindowStatus.ConProtezione;
        else status = WindowStatus.NonAdatto;

        return new SeasonOutcome
        {
            Reached = reached, DaysToHarvest = reached ? harvestDay : null, GddAvailable = Math.Round(gdd), GddRatio = Math.Round(ratio, 2),
            OptimalShare = Math.Round(optShare, 2), HeatStressDays = heat, ColdDays = cold,
            StopReason = reached ? null : stop,
            ProtectionWouldHelp = protectable, PlantingTempOk = plantingOk, Status = status,
            CycleDays = days, MaxFrostProbability = Math.Round(maxFrost, 3), LowestExtremeMin = Math.Round(lowest, 1),
            PlantingTemp = Math.Round(plantTemp, 1), RealDays = real,
        };
    }
}

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
}

/// <summary>
/// Simula giorno per giorno una stagione colturale sulle normali climatiche della località:
/// accumulo di gradi-giorno (GDD, metodo con soglia superiore = ottimo massimo),
/// interruzione per gelo (colture sensibili) o freddo letale, salita a seme per caldo (colture microterme),
/// fabbisogno di vernalizzazione.
/// </summary>
public static class SeasonSimulator
{
    private const int MaxDays = 330;
    /// <summary>Scarto tipico tra la minima media e la minima assoluta di un periodo (°C).</summary>
    private const double ExtremeColdOffset = 6;

    public static SeasonOutcome Simulate(PlantSpecies p, ClimateProfile c, int startDoy)
    {
        var t = p.Temperature;
        var start = ClimateService.Daily(c, startDoy);
        bool plantingOk = start.TMean >= p.Planting.TempMinMean && start.TMean <= p.Planting.TempMaxMean
                          && !(t.FrostTender && start.FrostProbability > 0.05);

        double gdd = 0; int optimal = 0, growing = 0, heat = 0, cold = 0, vernal = 0;
        string? stop = null; bool protectable = false; int? harvestDay = null;
        bool coolSeasonCrop = t.GrowthMax <= 30;

        for (int d = 0; d < MaxDays; d++)
        {
            int doy = ((startDoy - 1 + d) % 365) + 1;
            var n = ClimateService.Daily(c, doy);

            // Eventi letali
            if (t.FrostTender && n.FrostProbability > 0.15)
            {
                stop = "gelate"; protectable = n.FrostProbability < 0.35 && d > 0; break;
            }
            double extremeMin = n.TMin - ExtremeColdOffset;
            if (!t.FrostTender && extremeMin < t.MinSurvival)
            {
                stop = "freddo eccessivo"; protectable = t.MinSurvival - extremeMin <= 4; break;
            }
            if (coolSeasonCrop && !p.ContinuousHarvest && n.TMax > t.GrowthMax + 2 && d > 10)
            {
                stop = "caldo (prefioritura / salita a seme)"; break;
            }
            if (t.FrostTender && n.TMean < t.GrowthMin - 2 && d > 0)
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
        };
    }
}

using Ortol.Api.Models;

namespace Ortol.Api.Services;

/// <summary>
/// Formule condivise (le stesse sono replicate nel frontend per l'aggiornamento in tempo reale).
/// </summary>
public static class Agronomy
{
    public static double SpacingArea(PlantSpecies p) =>
        Math.Max(0.0025, p.Planting.SpacingRowCm / 100.0 * p.Planting.SpacingPlantCm / 100.0);

    public static double DefaultDepthCm(PlantSpecies p) => Math.Max(15, p.Container.MinDepthCm);

    /// <summary>Numero di piante che stanno in un lotto: sesto d'impianto in terra, volume di terriccio in vaso.</summary>
    public static int PlantsInLot(PlantSpecies p, Lot lot, Cultivation c)
    {
        if (c == Cultivation.Terra) return Math.Max(1, (int)Math.Floor(lot.Area / SpacingArea(p) + 1e-6));
        double depth = (lot.DepthCm ?? DefaultDepthCm(p)) / 100.0;
        double liters = lot.Area * depth * 1000;
        int byVolume = (int)Math.Floor(liters / Math.Max(1, p.Container.MinLiters) + 1e-6);
        // in vaso si può infittire, ma non oltre ~60% del sesto in piena terra
        int bySpace = (int)Math.Floor(lot.Area / (SpacingArea(p) * 0.6) + 1e-6);
        return Math.Max(1, Math.Min(byVolume, Math.Max(1, bySpace)));
    }

    /// <summary>
    /// Stima della resa (kg) per ciclo: superficie × resa media della specie × fattore climatico.
    /// Il fattore va da 0,4 (idoneità 0) a 1 (idoneità 100); l'idoneità in vaso include già il fattore contenitore.
    /// </summary>
    public static double EstimatedYieldKg(PlantSpecies p, double areaM2, int fitness) =>
        Math.Round(areaM2 * p.YieldKgM2 * (0.4 + 0.6 * Math.Clamp(fitness, 0, 100) / 100.0), 1);
}

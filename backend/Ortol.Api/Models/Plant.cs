namespace Ortol.Api.Models;

/// <summary>Scheda agronomica di una specie, caricata da Data/plants.json.</summary>
public record PlantSpecies
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public string ScientificName { get; init; } = "";
    public string Family { get; init; } = "";
    public string Category { get; init; } = "";
    public string Emoji { get; init; } = "🌱";
    public string Description { get; init; } = "";
    public string Lifecycle { get; init; } = "";
    public PlantingInfo Planting { get; init; } = new();
    public TemperatureInfo Temperature { get; init; } = new();
    /// <summary>Gradi-giorno (base = Temperature.BaseGdd) dalla messa a dimora all'inizio raccolta.</summary>
    public double GddToMaturity { get; init; }
    public int DaysToMaturity { get; init; }
    public int HarvestWindowDays { get; init; }
    public bool ContinuousHarvest { get; init; }
    public bool NeedsVernalization { get; init; }
    public WaterInfo Water { get; init; } = new();
    public SoilInfo Soil { get; init; } = new();
    public NutritionInfo Nutrition { get; init; } = new();
    public HarvestInfo Harvest { get; init; } = new();
    /// <summary>Resa media in un orto familiare, kg per m² per ciclo colturale.</summary>
    public double YieldKgM2 { get; init; }
    public ContainerInfo Container { get; init; } = new();
    public List<string> Companions { get; init; } = new();
    public List<string> Antagonists { get; init; } = new();
    public List<string> Pests { get; init; } = new();
    public List<string> Tips { get; init; } = new();
}

public record PlantingInfo
{
    public string Method { get; init; } = "";
    /// <summary>Intervallo di temperatura media mensile dell'aria adatto alla messa a dimora.</summary>
    public double TempMinMean { get; init; }
    public double TempMaxMean { get; init; }
    public double? DepthCm { get; init; }
    public int SpacingRowCm { get; init; }
    public int SpacingPlantCm { get; init; }
}

public record TemperatureInfo
{
    public double GermMin { get; init; }
    public double GermOpt { get; init; }
    public double BaseGdd { get; init; }
    public double GrowthMin { get; init; }
    public double OptMin { get; init; }
    public double OptMax { get; init; }
    public double GrowthMax { get; init; }
    public bool FrostTender { get; init; }
    /// <summary>Temperatura minima sopportata senza danni gravi (°C).</summary>
    public double MinSurvival { get; init; }
}

public record WaterInfo
{
    public double KcIni { get; init; }
    public double KcMid { get; init; }
    public double KcEnd { get; init; }
    /// <summary>Durata relativa delle fasi FAO-56: iniziale, sviluppo, metà stagione, finale.</summary>
    public int[] Stages { get; init; } = [25, 30, 40, 20];
    public double RootDepthMin { get; init; }
    public double RootDepthMax { get; init; }
    /// <summary>Frazione p di acqua facilmente disponibile (FAO-56, Tab. 22).</summary>
    public double DepletionFraction { get; init; }
    public string Notes { get; init; } = "";
}

public record SoilInfo
{
    public double PhMin { get; init; }
    public double PhMax { get; init; }
    public string Sun { get; init; } = "";
    public string Notes { get; init; } = "";
}

public record NutritionInfo
{
    public string Demand { get; init; } = "";
    public int StartAfterDays { get; init; }
    /// <summary>0 = nessuna concimazione di routine.</summary>
    public int IntervalDays { get; init; }
    public int StopBeforeEndDays { get; init; }
    public string Vegetative { get; init; } = "";
    public string Reproductive { get; init; } = "";
    public string Organic { get; init; } = "";
}

public record HarvestInfo
{
    public string Signs { get; init; } = "";
    public string Tips { get; init; } = "";
}

public record ContainerInfo
{
    /// <summary>Ottima | Buona | Discreta | Sconsigliata</summary>
    public string Suitability { get; init; } = "Buona";
    /// <summary>Volume minimo di terriccio per pianta (litri).</summary>
    public double MinLiters { get; init; }
    public double MinDepthCm { get; init; }
    public string Notes { get; init; } = "";

    public double Factor => Suitability switch { "Ottima" => 1.0, "Buona" => 0.9, "Discreta" => 0.7, _ => 0.4 };
}

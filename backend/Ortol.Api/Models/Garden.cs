namespace Ortol.Api.Models;

public enum SoilType { Sabbioso, MedioImpasto, Argilloso }

/// <summary>In piena terra oppure in vasi/fioriere (balcone, terrazzo).</summary>
public enum Cultivation { Terra, Vaso }

/// <summary>Riquadro rettangolare dell'orto visto dall'alto. Coordinate e misure in metri, origine in alto a sinistra.</summary>
public class Lot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public double X { get; set; }
    public double Y { get; set; }
    public double W { get; set; }
    public double H { get; set; }
    /// <summary>Profondità del contenitore in cm (solo coltivazione in vaso).</summary>
    public double? DepthCm { get; set; }
    public double Area => Math.Round(W * H, 3);
}

public class Garden
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? OwnerId { get; set; }
    public string Name { get; set; } = "";
    public string City { get; set; } = "";
    public string? Region { get; set; }
    public string? Country { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? Elevation { get; set; }
    public SoilType Soil { get; set; } = SoilType.MedioImpasto;
    public double? AreaSqm { get; set; }
    public Cultivation Cultivation { get; set; } = Cultivation.Terra;
    /// <summary>Dimensioni dello spazio coltivabile (m): larghezza (asse X) e lunghezza (asse Y).</summary>
    public double WidthM { get; set; }
    public double LengthM { get; set; }
    public List<Lot> Lots { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ClimateProfile? Climate { get; set; }
    public List<GardenPlant> Plants { get; set; } = new();
}

public class GardenPlant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string SpeciesId { get; set; } = "";
    public Guid? LotId { get; set; }
    public string? Label { get; set; }
    public int Quantity { get; set; } = 1;
    public DateOnly PlantedOn { get; set; }
    public bool Active { get; set; } = true;
    public DateOnly? EndedOn { get; set; }
    public string? Notes { get; set; }
    public List<CareLog> Logs { get; set; } = new();
}

public enum CareType { Water, Fertilize, Harvest, Note }

public class CareLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public CareType Type { get; set; }
    public DateOnly Date { get; set; }
    /// <summary>Litri (acqua), grammi (concime) o kg (raccolto).</summary>
    public double? Amount { get; set; }
    public string? Note { get; set; }
    /// <summary>Momento della registrazione: ordina le operazioni dello stesso giorno.</summary>
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Normali climatiche calcolate da 10 anni di dati giornalieri.</summary>
public class ClimateProfile
{
    public string Source { get; set; } = "";
    public string Period { get; set; } = "";
    public DateTime ComputedAt { get; set; } = DateTime.UtcNow;
    public bool Estimated { get; set; }
    /// <summary>12 elementi, gennaio = indice 0.</summary>
    public List<MonthlyClimate> Months { get; set; } = new();
    /// <summary>Giorno dell'anno mediano dell'ultima gelata primaverile (null = gelate rare).</summary>
    public int? LastSpringFrostDoy { get; set; }
    public int? FirstAutumnFrostDoy { get; set; }
    public int FrostFreeDays { get; set; }
    public double AnnualPrecipitation { get; set; }
    public double AnnualMeanTemp { get; set; }
}

public class MonthlyClimate
{
    public int Month { get; set; }
    public double TMax { get; set; }
    public double TMin { get; set; }
    public double TMean { get; set; }
    public double Precipitation { get; set; }
    public double Et0 { get; set; }
    public double FrostDays { get; set; }
    public double HotDays { get; set; }
}

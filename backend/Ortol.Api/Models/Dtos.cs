using Ortol.Api.Services;

namespace Ortol.Api.Models;

public record SpeciesSummary(string Id, string Name, string Emoji, string ScientificName, string Family, string Category,
    string PlantingMethod, int SpacingRowCm, int SpacingPlantCm, int DaysToMaturity, bool FrostTender, string NutrientDemand,
    double YieldKgM2, ContainerInfo Container, TemperatureRange Temperature,
    List<string> Companions, List<string> Antagonists)
{
    public static SpeciesSummary From(PlantSpecies p) => new(p.Id, p.Name, p.Emoji, p.ScientificName, p.Family, p.Category,
        p.Planting.Method, p.Planting.SpacingRowCm, p.Planting.SpacingPlantCm, p.DaysToMaturity, p.Temperature.FrostTender, p.Nutrition.Demand,
        p.YieldKgM2, p.Container, new TemperatureRange(p.Temperature.OptMin, p.Temperature.OptMax, p.Temperature.GrowthMin,
            p.Temperature.GrowthMax, p.Temperature.MinSurvival, p.Planting.TempMinMean, p.Planting.TempMaxMean),
        p.Companions, p.Antagonists);
}

/// <summary>Soglie termiche (°C): fascia ottimale, limiti di crescita, minima sopportata, media adatta alla messa a dimora.</summary>
public record TemperatureRange(double OptMin, double OptMax, double GrowthMin, double GrowthMax, double MinSurvival,
    double PlantingMin, double PlantingMax);

public record LocationRequest(double Latitude, double Longitude, double? Elevation, DateOnly? Date, Cultivation Cultivation = Cultivation.Terra);

public record RecommendationDto(SpeciesSummary Species, int Fitness, string FitnessLabel, string Timing, string Status,
    DateOnly? ExpectedHarvest, string Reason, List<MonthWindow> Calendar,
    DateOnly? OpenUntil = null, DateOnly? IdealUntil = null, double? SlowFactor = null);

public record SuggestionsResponse(ClimateProfile Climate, List<RecommendationDto> Recommendations, List<PlantListItem> All, DateOnly Date);

public record NewPlantRequest(string SpeciesId, int Quantity, DateOnly? PlantedOn, string? Label, string? Notes);

/// <summary>Lotto inviato dall'editor; Id nullo = nuovo lotto. SpeciesId nullo = lotto libero.</summary>
public record LotInput(Guid? Id, string? Name, double X, double Y, double W, double H, double? DepthCm, string? SpeciesId, DateOnly? PlantedOn);

public record LayoutRequest(double WidthM, double LengthM, List<LotInput> Lots);

public record CreateGardenRequest(string Name, string City, string? Region, string? Country, double Latitude, double Longitude,
    double? Elevation, SoilType Soil, Cultivation Cultivation, double WidthM, double LengthM, List<LotInput>? Lots);

public record UpdateGardenRequest(string? Name, SoilType? Soil);

public record UpdatePlantRequest(int? Quantity, DateOnly? PlantedOn, string? Label, string? Notes, bool? Active);

public record NewLogRequest(CareType Type, DateOnly? Date, double? Amount, string? Note);

public record GardenSummary(Guid Id, string Name, string City, string? Region, string? Country, int PlantCount, DateTime CreatedAt, double? AreaSqm, Cultivation Cultivation);

public record TaskItem(string Type, string Priority, Guid PlantId, string PlantName, string Emoji, string Title, string Detail, DateOnly Date, bool Estimated = false);

public record WeatherDay(DateOnly Date, double TMax, double TMin, double Precipitation, double Et0, int? WeatherCode, int? PrecipProbability);

public record DashboardResponse(
    GardenInfo Garden, ClimateProfile Climate, bool LiveWeather, List<WeatherDay> Forecast, List<WeatherDay> Past,
    List<PlantStatus> Plants, List<TaskItem> Tasks, List<RecommendationDto> Recommendations, double ExpectedYieldKg, double HarvestedKg);

public record PlantListItem(SpeciesSummary Species, int? Fitness, string? FitnessLabel, List<MonthWindow>? Calendar = null);

public record PlantDetailResponse(PlantSpecies Species, FitnessResult? Fitness);

public record GardenInfo(Guid Id, string Name, string City, string? Region, string? Country, double Latitude, double Longitude,
    double? Elevation, SoilType Soil, double? AreaSqm, DateTime CreatedAt, Cultivation Cultivation, double WidthM, double LengthM, List<Lot> Lots)
{
    public static GardenInfo From(Garden g) => new(g.Id, g.Name, g.City, g.Region, g.Country, g.Latitude, g.Longitude, g.Elevation, g.Soil,
        Math.Round(g.WidthM * g.LengthM, 2), g.CreatedAt, g.Cultivation, g.WidthM, g.LengthM, g.Lots);
}

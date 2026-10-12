using System.Globalization;
using System.Text.Json;

namespace Ortol.Api.Services;

public record DailyWeather(DateOnly Date, double TMax, double TMin, double Precipitation, double Et0, int? WeatherCode = null, int? PrecipProbability = null)
{
    public double TMean => (TMax + TMin) / 2.0;
}

public record GeoResult(string Name, string? Region, string? Country, string? CountryCode, double Latitude, double Longitude, double? Elevation, string? Timezone);

/// <summary>
/// Client per le API pubbliche e gratuite di Open-Meteo (nessuna API key):
/// geocoding, archivio storico ERA5 e previsioni.
/// </summary>
public class OpenMeteoClient(HttpClient http, ILogger<OpenMeteoClient> log)
{
    private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;
    private const string DailyVars = "temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration";

    public async Task<List<GeoResult>> SearchCityAsync(string query, CancellationToken ct = default)
    {
        var url = $"https://geocoding-api.open-meteo.com/v1/search?name={Uri.EscapeDataString(query)}&count=8&language=it&format=json";
        using var doc = JsonDocument.Parse(await http.GetStringAsync(url, ct));
        var list = new List<GeoResult>();
        if (!doc.RootElement.TryGetProperty("results", out var results)) return list;
        foreach (var r in results.EnumerateArray())
        {
            list.Add(new GeoResult(
                r.GetProperty("name").GetString() ?? "",
                Str(r, "admin1"), Str(r, "country"), Str(r, "country_code"),
                r.GetProperty("latitude").GetDouble(), r.GetProperty("longitude").GetDouble(),
                r.TryGetProperty("elevation", out var e) && e.ValueKind == JsonValueKind.Number ? e.GetDouble() : null,
                Str(r, "timezone")));
        }
        return list;
    }

    /// <summary>Dati giornalieri storici (rianalisi ERA5), disponibili con ~5 giorni di ritardo.</summary>
    public async Task<List<DailyWeather>> GetArchiveAsync(double lat, double lon, DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var url = $"https://archive-api.open-meteo.com/v1/archive?latitude={lat.ToString(Inv)}&longitude={lon.ToString(Inv)}" +
                  $"&start_date={from:yyyy-MM-dd}&end_date={to:yyyy-MM-dd}&daily={DailyVars}&timezone=auto";
        return Parse(await http.GetStringAsync(url, ct), false);
    }

    /// <summary>Ultimi <paramref name="pastDays"/> giorni osservati + previsione.</summary>
    public async Task<List<DailyWeather>> GetForecastAsync(double lat, double lon, int pastDays, int forecastDays, CancellationToken ct = default)
    {
        var url = $"https://api.open-meteo.com/v1/forecast?latitude={lat.ToString(Inv)}&longitude={lon.ToString(Inv)}" +
                  $"&daily={DailyVars},weather_code,precipitation_probability_max&past_days={pastDays}&forecast_days={forecastDays}&timezone=auto";
        return Parse(await http.GetStringAsync(url, ct), true);
    }

    private List<DailyWeather> Parse(string json, bool withExtras)
    {
        using var doc = JsonDocument.Parse(json);
        var d = doc.RootElement.GetProperty("daily");
        var dates = d.GetProperty("time").EnumerateArray().Select(x => DateOnly.Parse(x.GetString()!, Inv)).ToList();
        double?[] Arr(string name) => d.TryGetProperty(name, out var a)
            ? a.EnumerateArray().Select(v => v.ValueKind == JsonValueKind.Number ? v.GetDouble() : (double?)null).ToArray()
            : new double?[dates.Count];

        var tmax = Arr("temperature_2m_max"); var tmin = Arr("temperature_2m_min");
        var pr = Arr("precipitation_sum"); var et0 = Arr("et0_fao_evapotranspiration");
        var wc = withExtras ? Arr("weather_code") : new double?[dates.Count];
        var pp = withExtras ? Arr("precipitation_probability_max") : new double?[dates.Count];

        var list = new List<DailyWeather>(dates.Count);
        for (int i = 0; i < dates.Count; i++)
        {
            if (tmax[i] is null || tmin[i] is null) continue; // giorni non ancora disponibili nell'archivio
            list.Add(new DailyWeather(dates[i], tmax[i]!.Value, tmin[i]!.Value, pr[i] ?? 0, et0[i] ?? 0,
                wc[i] is double w ? (int)w : null, pp[i] is double p ? (int)p : null));
        }
        log.LogDebug("Open-Meteo: {Count} giorni", list.Count);
        return list;
    }

    private static string? Str(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
}

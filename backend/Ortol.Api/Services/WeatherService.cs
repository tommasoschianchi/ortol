using Microsoft.Extensions.Caching.Memory;
using Ortol.Api.Models;

namespace Ortol.Api.Services;

public record WeatherSeries(List<DailyWeather> Days, DateOnly Today, bool Live)
{
    public IEnumerable<DailyWeather> Forecast => Days.Where(d => d.Date >= Today);
    public IEnumerable<DailyWeather> Past => Days.Where(d => d.Date < Today);
}

/// <summary>Serie meteo continua (storico + previsione) con cache; i buchi sono colmati con le normali climatiche.</summary>
public class WeatherService(OpenMeteoClient meteo, IMemoryCache cache, ILogger<WeatherService> log)
{
    private const int PastDays = 30;
    private const int ForecastDays = 10;

    public async Task<WeatherSeries> GetSeriesAsync(Garden g, DateOnly from, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var map = new Dictionary<DateOnly, DailyWeather>();
        bool live = true;

        try
        {
            var recent = await cache.GetOrCreateAsync($"fc:{g.Latitude:F2}:{g.Longitude:F2}", e =>
            {
                e.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
                return meteo.GetForecastAsync(g.Latitude, g.Longitude, PastDays, ForecastDays, ct);
            });
            foreach (var d in recent!) map[d.Date] = d;

            var recentStart = today.AddDays(-PastDays);
            if (from < recentStart)
            {
                var archFrom = from; var archTo = recentStart.AddDays(-1);
                var hist = await cache.GetOrCreateAsync($"ar:{g.Latitude:F2}:{g.Longitude:F2}:{archFrom}:{archTo}", e =>
                {
                    e.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(12);
                    return meteo.GetArchiveAsync(g.Latitude, g.Longitude, archFrom, archTo, ct);
                });
                foreach (var d in hist!) map.TryAdd(d.Date, d);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            log.LogWarning(ex, "Meteo non disponibile, uso le normali climatiche");
            live = false;
        }

        var end = today.AddDays(ForecastDays - 1);
        var days = new List<DailyWeather>();
        for (var d = from; d <= end; d = d.AddDays(1))
            days.Add(map.TryGetValue(d, out var w) ? w : ClimateService.AsWeather(g.Climate!, d));
        return new WeatherSeries(days, today, live);
    }
}

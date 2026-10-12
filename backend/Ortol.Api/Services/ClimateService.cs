using Ortol.Api.Models;

namespace Ortol.Api.Services;

/// <summary>Valori climatici normali per un singolo giorno dell'anno, interpolati dalle medie mensili.</summary>
public record DayNormal(double TMax, double TMin, double TMean, double Et0, double PrecipPerDay)
{
    /// <summary>Probabilità di gelata (Tmin &lt; 0 °C) assumendo dispersione normale σ = 3,5 °C.</summary>
    public double FrostProbability => ClimateService.NormalCdf(-TMin / 3.5);
}

public class ClimateService(OpenMeteoClient meteo, ILogger<ClimateService> log)
{
    public const int NormalsStartYear = 2015;
    public const int NormalsEndYear = 2024;

    /// <summary>Restituisce il profilo climatico della località, calcolandolo se manca o se era solo stimato.</summary>
    public async Task<ClimateProfile> EnsureProfileAsync(Garden garden, CancellationToken ct = default)
    {
        if (garden.Climate is { Estimated: false } existing) return existing;
        if (garden.Climate is { Estimated: true } est && DateTime.UtcNow - est.ComputedAt < TimeSpan.FromMinutes(30)) return est;

        try
        {
            var days = await meteo.GetArchiveAsync(garden.Latitude, garden.Longitude,
                new DateOnly(NormalsStartYear, 1, 1), new DateOnly(NormalsEndYear, 12, 31), ct);
            if (days.Count < 365 * 5) throw new InvalidOperationException("Serie storica troppo corta");
            garden.Climate = ComputeNormals(days, garden.Latitude);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            log.LogWarning(ex, "Archivio climatico non raggiungibile: uso una stima basata su latitudine e quota");
            garden.Climate = EstimateFromLocation(garden.Latitude, garden.Elevation ?? 0);
        }
        return garden.Climate;
    }

    public static ClimateProfile ComputeNormals(List<DailyWeather> days, double latitude)
    {
        int years = days.Select(d => d.Date.Year).Distinct().Count();
        var months = Enumerable.Range(1, 12).Select(m =>
        {
            var md = days.Where(d => d.Date.Month == m).ToList();
            return new MonthlyClimate
            {
                Month = m,
                TMax = Math.Round(md.Average(d => d.TMax), 1),
                TMin = Math.Round(md.Average(d => d.TMin), 1),
                TMean = Math.Round(md.Average(d => d.TMean), 1),
                Precipitation = Math.Round(md.Sum(d => d.Precipitation) / years, 0),
                Et0 = Math.Round(md.Sum(d => d.Et0) / years, 0),
                FrostDays = Math.Round(md.Count(d => d.TMin < 0) / (double)years, 1),
                HotDays = Math.Round(md.Count(d => d.TMax >= 32) / (double)years, 1),
            };
        }).ToList();

        // Date di gelo: per l'emisfero sud si sposta l'anno di 182 giorni così che "primavera" resti nella prima metà.
        int shift = latitude < 0 ? 182 : 0;
        var lastSpring = new List<int>(); var firstAutumn = new List<int>();
        int yearsWithFrost = 0;
        foreach (var yearGroup in days.GroupBy(d => d.Date.Year))
        {
            var frostDoys = yearGroup.Where(d => d.TMin < 0).Select(d => Shift(d.Date.DayOfYear, shift)).ToList();
            if (frostDoys.Count == 0) continue;
            yearsWithFrost++;
            var spring = frostDoys.Where(x => x < 183).ToList();
            var autumn = frostDoys.Where(x => x >= 183).ToList();
            if (spring.Count > 0) lastSpring.Add(spring.Max());
            if (autumn.Count > 0) firstAutumn.Add(autumn.Min());
        }

        int? ls = null, fa = null;
        int frostFree = 365;
        if (yearsWithFrost >= years / 2.0)
        {
            if (lastSpring.Count > 0) ls = Unshift(Median(lastSpring), shift);
            if (firstAutumn.Count > 0) fa = Unshift(Median(firstAutumn), shift);
            int lsS = lastSpring.Count > 0 ? Median(lastSpring) : 1;
            int faS = firstAutumn.Count > 0 ? Median(firstAutumn) : 365;
            frostFree = Math.Max(0, faS - lsS);
        }

        return new ClimateProfile
        {
            Source = "Open-Meteo Historical API (rianalisi ERA5)",
            Period = $"{days.Min(d => d.Date.Year)}–{days.Max(d => d.Date.Year)}",
            Estimated = false,
            Months = months,
            LastSpringFrostDoy = ls,
            FirstAutumnFrostDoy = fa,
            FrostFreeDays = frostFree,
            AnnualPrecipitation = months.Sum(m => m.Precipitation),
            AnnualMeanTemp = Math.Round(months.Average(m => m.TMean), 1),
        };
    }

    /// <summary>
    /// Stima di ripiego (solo se l'archivio non è raggiungibile): andamento sinusoidale della temperatura
    /// con media e ampiezza funzione della latitudine e gradiente termico verticale di 6,5 °C/km.
    /// </summary>
    public static ClimateProfile EstimateFromLocation(double lat, double elevation)
    {
        double absLat = Math.Abs(lat);
        double annual = 30 - 0.38 * absLat - 0.0065 * elevation;
        double amp = Math.Clamp(1.5 + 0.21 * absLat, 1, 16);
        int peak = lat >= 0 ? 7 : 1; // mese più caldo
        var months = Enumerable.Range(1, 12).Select(m =>
        {
            double tmean = annual + amp * Math.Cos(2 * Math.PI * (m - peak) / 12.0);
            double range = 9;
            double tmin = tmean - range / 2, tmax = tmean + range / 2;
            int dim = DateTime.DaysInMonth(2023, m);
            return new MonthlyClimate
            {
                Month = m,
                TMean = Math.Round(tmean, 1), TMax = Math.Round(tmax, 1), TMin = Math.Round(tmin, 1),
                Precipitation = 60,
                Et0 = Math.Round(Math.Max(0.5, 0.18 * tmean + 0.3) * dim, 0),
                FrostDays = Math.Round(dim * NormalCdf(-tmin / 3.5), 1),
                HotDays = Math.Round(dim * NormalCdf((tmax - 32) / 3.5), 1),
            };
        }).ToList();
        int frostFree = 365 - (int)months.Sum(m => m.FrostDays * 2.5);
        return new ClimateProfile
        {
            Source = "Stima teorica (archivio climatico non raggiungibile)",
            Period = "—", Estimated = true, Months = months,
            FrostFreeDays = Math.Clamp(frostFree, 0, 365),
            AnnualPrecipitation = 720, AnnualMeanTemp = Math.Round(months.Average(m => m.TMean), 1),
        };
    }

    /// <summary>Interpola linearmente i valori mensili (riferiti a metà mese) al giorno dell'anno richiesto.</summary>
    public static DayNormal Daily(ClimateProfile c, int dayOfYear)
    {
        // centro del mese m (0-based) ≈ 15 + 30.44*m
        double pos = (dayOfYear - 15.2) / 30.44;
        int i0 = (int)Math.Floor(pos);
        double w = pos - i0;
        var a = c.Months[((i0 % 12) + 12) % 12];
        var b = c.Months[(((i0 + 1) % 12) + 12) % 12];
        double L(double x, double y) => x + (y - x) * w;
        double daysA = DateTime.DaysInMonth(2023, a.Month), daysB = DateTime.DaysInMonth(2023, b.Month);
        return new DayNormal(L(a.TMax, b.TMax), L(a.TMin, b.TMin), L(a.TMean, b.TMean),
            L(a.Et0 / daysA, b.Et0 / daysB), L(a.Precipitation / daysA, b.Precipitation / daysB));
    }

    /// <summary>Ogni quanti giorni cade la pioggia nei giorni ricostruiti dalle medie climatiche.</summary>
    public const int RainEveryDays = 4;

    /// <summary>
    /// Giornata "tipo" ricavata dalle normali. La pioggia non è spalmata su tutti i giorni (2–3 mm al giorno
    /// coprirebbero sempre i consumi), ma concentrata in un evento ogni <see cref="RainEveryDays"/> giorni
    /// con la stessa quantità media, come avviene davvero.
    /// </summary>
    public static DailyWeather AsWeather(ClimateProfile c, DateOnly date)
    {
        var n = Daily(c, date.DayOfYear);
        double rain = date.DayNumber % RainEveryDays == 0 ? n.PrecipPerDay * RainEveryDays : 0;
        return new DailyWeather(date, n.TMax, n.TMin, rain, n.Et0);
    }

    public static double NormalCdf(double z)
    {
        // Approssimazione di Abramowitz-Stegun 7.1.26
        double t = 1 / (1 + 0.3275911 * Math.Abs(z) / Math.Sqrt(2));
        double y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.Exp(-z * z / 2);
        return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
    }

    private static int Shift(int doy, int shift) => ((doy - 1 + shift) % 365) + 1;
    private static int Unshift(int doy, int shift) => ((doy - 1 - shift + 365) % 365) + 1;
    private static int Median(List<int> v) { var s = v.Order().ToList(); return s[s.Count / 2]; }
}

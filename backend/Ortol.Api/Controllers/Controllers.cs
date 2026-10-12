using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Ortol.Api.Models;
using Ortol.Api.Services;

namespace Ortol.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/geo")]
public class GeoController(OpenMeteoClient meteo) : ControllerBase
{
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2) return Ok(Array.Empty<GeoResult>());
        try { return Ok(await meteo.SearchCityAsync(q.Trim(), ct)); }
        catch (HttpRequestException) { return Problem("Servizio di geocodifica non raggiungibile", statusCode: 503); }
    }
}

[ApiController]
[Authorize]
[Route("api/plants")]
public class PlantsController(PlantCatalog catalog, GardenStore store, ClimateService climate, FitnessService fitness, WeatherService weather) : ControllerBase
{
    private static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);

    /// <summary>Catalogo; con un orto, idoneità di ogni specie se messa a dimora oggi.</summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? gardenId, CancellationToken ct)
    {
        var g = gardenId is Guid id ? store.GetOwned(id, User.UserId()) : null;
        if (g is null) return Ok(catalog.All.Select(p => new PlantListItem(SpeciesSummary.From(p), null, null)));
        var c = await climate.EnsureProfileAsync(g, ct);
        var w = await weather.GetMapAsync(g, Today.AddDays(-3), ct);
        return Ok(catalog.All.Select(p =>
        {
            var f = fitness.Evaluate(p, c, g.Cultivation, Today, w, Today);
            return new PlantListItem(SpeciesSummary.From(p), f.Score, f.Label, f.Calendar, f.Summary);
        }));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id, [FromQuery] Guid? gardenId, CancellationToken ct)
    {
        var p = catalog.Get(id);
        if (p is null) return NotFound();
        var g = gardenId is Guid gid ? store.GetOwned(gid, User.UserId()) : null;
        FitnessResult? f = null;
        if (g is not null)
        {
            var c = await climate.EnsureProfileAsync(g, ct);
            f = fitness.Evaluate(p, c, g.Cultivation, Today, await weather.GetMapAsync(g, Today.AddDays(-3), ct), Today);
        }
        return Ok(new PlantDetailResponse(p, f));
    }
}

[ApiController]
[Authorize]
[Route("api/gardens")]
public class GardensController(
    GardenStore store, PlantCatalog catalog, ClimateService climate, FitnessService fitness,
    WeatherService weather, CareService care, IMemoryCache cache) : ControllerBase
{
    private static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);
    private const double MaxSide = 200;

    private Garden? Mine(Guid id) => store.GetOwned(id, User.UserId());

    [HttpGet]
    public IEnumerable<GardenSummary> List() => store.ListByOwner(User.UserId())
        .OrderByDescending(g => g.CreatedAt)
        .Select(g => new GardenSummary(g.Id, g.Name, g.City, g.Region, g.Country, g.Plants.Count(p => p.Active), g.CreatedAt,
            Math.Round(g.WidthM * g.LengthM, 2), g.Cultivation));

    /// <summary>Clima, piante consigliate per oggi e idoneità di tutte le specie per una località, prima di creare l'orto.</summary>
    [HttpPost("suggestions")]
    public async Task<SuggestionsResponse> Suggestions(LocationRequest req, CancellationToken ct)
    {
        var profile = await ProfileFor(req.Latitude, req.Longitude, req.Elevation, ct);
        var date = req.Date ?? Today;
        var place = new Garden { Latitude = req.Latitude, Longitude = req.Longitude, Elevation = req.Elevation, Climate = profile };
        var w = await weather.GetMapAsync(place, Today.AddDays(-3), ct);
        var all = catalog.All.Select(p =>
        {
            var f = fitness.Evaluate(p, profile, req.Cultivation, date, w, Today);
            return new PlantListItem(SpeciesSummary.From(p), f.Score, f.Label, f.Calendar, f.Summary);
        }).ToList();
        return new SuggestionsResponse(profile, ToDtos(fitness.Recommend(catalog.All, profile, date, req.Cultivation, w)), all, date);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateGardenRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { detail = "Il nome è obbligatorio" });
        var g = new Garden
        {
            OwnerId = User.UserId(),
            Name = req.Name.Trim(), City = req.City, Region = req.Region, Country = req.Country,
            Latitude = req.Latitude, Longitude = req.Longitude, Elevation = req.Elevation, Soil = req.Soil,
            Cultivation = req.Cultivation,
        };
        var err = ApplyLayout(g, new LayoutRequest(req.WidthM, req.LengthM, req.Lots ?? []));
        if (err is not null) return BadRequest(new { detail = err });
        g.Climate = await ProfileFor(g.Latitude, g.Longitude, g.Elevation, ct);
        store.Add(g);
        return CreatedAtAction(nameof(Dashboard), new { id = g.Id }, GardenInfo.From(g));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Dashboard(Guid id, CancellationToken ct)
    {
        var g = Mine(id);
        if (g is null) return NotFound();
        if (g.Climate is null or { Estimated: true })
        {
            var profile = await ProfileFor(g.Latitude, g.Longitude, g.Elevation, ct);
            store.Update(id, x => x.Climate = profile);
        }
        var c = g.Climate!;

        var active = g.Plants.Where(p => p.Active).ToList();
        var from = active.Count == 0 ? Today.AddDays(-30) : active.Min(p => p.PlantedOn);
        if (from > Today.AddDays(-30)) from = Today.AddDays(-30);
        if (from < Today.AddDays(-365)) from = Today.AddDays(-365);
        var ws = await weather.GetSeriesAsync(g, from, ct);
        var wmap = WeatherService.RealDays(ws);

        // Idoneità di ogni coltura sul suo ciclo: dalla messa a dimora, con il meteo osservato fino a oggi, le previsioni e poi le medie.
        var fitCache = new Dictionary<(string, DateOnly), FitnessResult>();
        var statuses = active
            .Select(gp => (gp, sp: catalog.Get(gp.SpeciesId)))
            .Where(x => x.sp is not null)
            .Select(x =>
            {
                var k = (x.sp!.Id, x.gp.PlantedOn);
                if (!fitCache.TryGetValue(k, out var f)) fitCache[k] = f = fitness.Evaluate(x.sp, c, g.Cultivation, x.gp.PlantedOn, wmap, Today);
                return care.Evaluate(g, x.gp, x.sp, ws, f);
            })
            .OrderBy(s => s.PlantedOn)
            .ToList();

        var recs = ToDtos(fitness.Recommend(catalog.All, c, Today, g.Cultivation, wmap));
        double harvested = g.Plants.Sum(p => p.Logs.Where(l => l.Type == CareType.Harvest).Sum(l => l.Amount ?? 0));
        return Ok(new DashboardResponse(
            GardenInfo.From(g), c, ws.Live,
            ws.Forecast.Select(ToDay).ToList(),
            ws.Past.Where(d => d.Date >= Today.AddDays(-7)).Select(ToDay).ToList(),
            statuses, BuildTasks(statuses), recs,
            Math.Round(statuses.Sum(s => s.ExpectedYieldKg), 1), Math.Round(harvested, 1)));
    }

    [HttpPut("{id:guid}")]
    public IActionResult Update(Guid id, UpdateGardenRequest req)
    {
        if (Mine(id) is null) return NotFound();
        store.Update(id, g =>
        {
            if (!string.IsNullOrWhiteSpace(req.Name)) g.Name = req.Name.Trim();
            if (req.Soil is SoilType s) g.Soil = s;
            return 0;
        });
        return NoContent();
    }

    /// <summary>Salva la disposizione vista dall'alto: dimensioni dell'orto, lotti e coltura di ciascun lotto.</summary>
    [HttpPut("{id:guid}/layout")]
    public IActionResult SaveLayout(Guid id, LayoutRequest req)
    {
        if (Mine(id) is null) return NotFound();
        string? err = null;
        store.Update(id, g => err = ApplyLayout(g, req));
        return err is null ? Ok(GardenInfo.From(Mine(id)!)) : BadRequest(new { detail = err });
    }

    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id) => Mine(id) is null ? NotFound() : store.Remove(id) ? NoContent() : NotFound();

    [HttpPut("{id:guid}/plants/{plantId:guid}")]
    public IActionResult UpdatePlant(Guid id, Guid plantId, UpdatePlantRequest req)
    {
        if (Mine(id) is not { } g || g.Plants.All(p => p.Id != plantId)) return NotFound();
        store.Update(id, x =>
        {
            var p = x.Plants.First(p => p.Id == plantId);
            if (req.Quantity is int q && q > 0) p.Quantity = q;
            if (req.PlantedOn is DateOnly d) p.PlantedOn = d;
            if (req.Label is not null) p.Label = string.IsNullOrWhiteSpace(req.Label) ? null : req.Label.Trim();
            if (req.Notes is not null) p.Notes = req.Notes;
            if (req.Active is bool a && a != p.Active) { p.Active = a; p.EndedOn = a ? null : Today; if (!a) p.LotId = null; }
            return 0;
        });
        return NoContent();
    }

    [HttpDelete("{id:guid}/plants/{plantId:guid}")]
    public IActionResult DeletePlant(Guid id, Guid plantId)
    {
        if (Mine(id) is null) return NotFound();
        var ok = store.Update(id, g => g.Plants.RemoveAll(p => p.Id == plantId) > 0);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/plants/{plantId:guid}/logs")]
    public IActionResult AddLog(Guid id, Guid plantId, NewLogRequest req)
    {
        if (Mine(id) is not { } g || g.Plants.All(p => p.Id != plantId)) return NotFound();
        if (req.Amount is < 0) return BadRequest(new { detail = "La quantità non può essere negativa." });
        var log = new CareLog { Type = req.Type, Date = req.Date ?? Today, Amount = req.Amount, Note = req.Note };
        store.Update(id, x => { x.Plants.First(p => p.Id == plantId).Logs.Add(log); return 0; });
        return Ok(log);
    }

    /// <summary>Registra la stessa operazione (es. irrigazione) su più piante in un colpo solo.</summary>
    [HttpPost("{id:guid}/logs")]
    public IActionResult AddLogBulk(Guid id, [FromQuery] Guid[] plantIds, NewLogRequest req)
    {
        if (Mine(id) is null) return NotFound();
        var date = req.Date ?? Today;
        int n = store.Update(id, g =>
        {
            var targets = g.Plants.Where(p => p.Active && (plantIds.Length == 0 || plantIds.Contains(p.Id))).ToList();
            foreach (var p in targets) p.Logs.Add(new CareLog { Type = req.Type, Date = date, Amount = req.Amount, Note = req.Note });
            return targets.Count;
        });
        return Ok(new { updated = n });
    }

    [HttpDelete("{id:guid}/plants/{plantId:guid}/logs/{logId:guid}")]
    public IActionResult DeleteLog(Guid id, Guid plantId, Guid logId)
    {
        if (Mine(id) is null) return NotFound();
        var ok = store.Update(id, g => g.Plants.FirstOrDefault(p => p.Id == plantId)?.Logs.RemoveAll(l => l.Id == logId) > 0);
        return ok ? NoContent() : NotFound();
    }

    /// <summary>Storico completo delle operazioni dell'orto, incluse le colture concluse.</summary>
    [HttpGet("{id:guid}/history")]
    public IActionResult History(Guid id)
    {
        var g = Mine(id);
        if (g is null) return NotFound();
        return Ok(g.Plants.SelectMany(p => p.Logs.Select((l, i) => new
        {
            Seq = i, l.CreatedAt,
            l.Id, l.Type, l.Date, l.Amount, l.Note, PlantId = p.Id, p.SpeciesId,
            PlantName = p.Label ?? catalog.Get(p.SpeciesId)?.Name ?? p.SpeciesId,
            Emoji = catalog.Get(p.SpeciesId)?.Emoji ?? "🌱", p.Active,
        })).OrderByDescending(x => x.Date).ThenByDescending(x => x.CreatedAt ?? DateTime.MinValue).ThenByDescending(x => x.Seq));
    }

    // ---------- helpers ----------

    /// <summary>
    /// Applica la disposizione: valida geometria, aggiorna i lotti e sincronizza le colture
    /// (una coltura attiva per lotto; cambiare specie conclude la precedente, eliminare un lotto conclude la sua coltura).
    /// </summary>
    private string? ApplyLayout(Garden g, LayoutRequest req)
    {
        if (req.WidthM is < 0.2 or > MaxSide || req.LengthM is < 0.2 or > MaxSide)
            return $"Le dimensioni dell'orto devono essere tra 0,2 e {MaxSide} m.";
        const double eps = 0.001;
        var lots = req.Lots ?? [];
        for (int i = 0; i < lots.Count; i++)
        {
            var l = lots[i];
            if (l.W < 0.1 || l.H < 0.1) return $"Il lotto {i + 1} è troppo piccolo (minimo 10 cm per lato).";
            if (l.X < -eps || l.Y < -eps || l.X + l.W > req.WidthM + eps || l.Y + l.H > req.LengthM + eps)
                return $"Il lotto \"{l.Name ?? $"Lotto {i + 1}"}\" esce dai confini dell'orto.";
            for (int j = 0; j < i; j++)
            {
                var o = lots[j];
                bool overlap = l.X < o.X + o.W - eps && o.X < l.X + l.W - eps && l.Y < o.Y + o.H - eps && o.Y < l.Y + l.H - eps;
                if (overlap) return $"I lotti \"{o.Name ?? $"Lotto {j + 1}"}\" e \"{l.Name ?? $"Lotto {i + 1}"}\" si sovrappongono.";
            }
            if (l.SpeciesId is { Length: > 0 } sid && catalog.Get(sid) is null) return $"Specie sconosciuta: {sid}";
        }

        g.WidthM = Math.Round(req.WidthM, 2);
        g.LengthM = Math.Round(req.LengthM, 2);
        g.AreaSqm = Math.Round(g.WidthM * g.LengthM, 2);

        var newLots = new List<Lot>();
        var keptIds = new HashSet<Guid>();
        int n = 1;
        foreach (var li in lots)
        {
            var lot = (li.Id is Guid lid ? g.Lots.FirstOrDefault(x => x.Id == lid) : null) ?? new Lot();
            lot.Name = string.IsNullOrWhiteSpace(li.Name) ? $"Lotto {n}" : li.Name.Trim();
            lot.X = Math.Round(Math.Max(0, li.X), 3); lot.Y = Math.Round(Math.Max(0, li.Y), 3);
            lot.W = Math.Round(li.W, 3); lot.H = Math.Round(li.H, 3);
            lot.DepthCm = g.Cultivation == Cultivation.Vaso ? Math.Clamp(li.DepthCm ?? 30, 5, 150) : null;
            newLots.Add(lot); keptIds.Add(lot.Id); n++;

            var crop = g.Plants.FirstOrDefault(p => p.Active && p.LotId == lot.Id);
            var species = string.IsNullOrWhiteSpace(li.SpeciesId) ? null : catalog.Get(li.SpeciesId);
            if (crop is not null && (species is null || crop.SpeciesId != species.Id))
            {
                crop.Active = false; crop.EndedOn = Today; crop.LotId = null; crop = null;
            }
            if (species is null) continue;
            if (crop is null)
            {
                crop = new GardenPlant { SpeciesId = species.Id, LotId = lot.Id, PlantedOn = li.PlantedOn ?? Today };
                g.Plants.Add(crop);
            }
            else if (li.PlantedOn is DateOnly pd) crop.PlantedOn = pd;
            crop.Quantity = Agronomy.PlantsInLot(species, lot, g.Cultivation);
        }
        // Lotti rimossi: la loro coltura viene conclusa (lo storico resta)
        foreach (var p in g.Plants.Where(p => p.Active && p.LotId is Guid l && !keptIds.Contains(l)))
        {
            p.Active = false; p.EndedOn = Today; p.LotId = null;
        }
        g.Lots = newLots;
        return null;
    }

    private async Task<ClimateProfile> ProfileFor(double lat, double lon, double? elev, CancellationToken ct)
    {
        var key = $"clim:{lat:F2}:{lon:F2}";
        if (cache.TryGetValue(key, out ClimateProfile? cached) && cached is not null) return cached;
        var tmp = new Garden { Latitude = lat, Longitude = lon, Elevation = elev };
        var profile = await climate.EnsureProfileAsync(tmp, ct);
        cache.Set(key, profile, profile.Estimated ? TimeSpan.FromMinutes(10) : TimeSpan.FromDays(7));
        return profile;
    }

    private static List<RecommendationDto> ToDtos(List<Recommendation> recs) => recs.Select(r => new RecommendationDto(
        SpeciesSummary.From(r.Species), r.Fitness.Score, r.Fitness.Label, r.Timing, r.Status.ToString(),
        r.ExpectedHarvest, r.Reason, r.Fitness.Calendar, r.OpenUntil, r.IdealUntil, r.SlowFactor, r.Fitness.Summary)).ToList();

    private static WeatherDay ToDay(DailyWeather d) => new(d.Date, Math.Round(d.TMax, 1), Math.Round(d.TMin, 1),
        Math.Round(d.Precipitation, 1), Math.Round(d.Et0, 1), d.WeatherCode, d.PrecipProbability);

    /// <summary>Attività di tutte le colture per i prossimi giorni, ordinate per data e priorità.</summary>
    private static List<TaskItem> BuildTasks(List<PlantStatus> plants)
    {
        var tasks = new List<TaskItem>();
        foreach (var p in plants)
        {
            var name = p.Label ?? p.Name;
            if (p.Harvest.Status == "ended")
            {
                tasks.Add(new("harvest", "low", p.Id, name, p.Emoji, "Fine ciclo", p.Harvest.Message, Today));
                continue;
            }
            if (!p.Upcoming.Any(u => u.Type == "protect"))
                foreach (var a in p.Alerts.Where(a => a.Level == "danger"))
                    tasks.Add(new("alert", "high", p.Id, name, p.Emoji, a.Title, a.Message, Today));
            foreach (var u in p.Upcoming)
            {
                string prio = u.Date > Today ? "low" : u.Type is "water" or "protect" ? "high" : "medium";
                tasks.Add(new(u.Type, prio, p.Id, name, p.Emoji, u.Title, u.Detail, u.Date, u.Estimated));
            }
        }
        return tasks
            .OrderBy(t => t.Date)
            .ThenBy(t => t.Priority switch { "high" => 0, "medium" => 1, _ => 2 })
            .ThenBy(t => t.Type switch { "protect" => 0, "alert" => 0, "water" => 1, "fertilize" => 2, _ => 3 })
            .ToList();
    }
}

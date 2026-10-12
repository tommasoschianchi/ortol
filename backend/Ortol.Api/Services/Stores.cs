using System.Text.Json;
using System.Text.Json.Serialization;
using Ortol.Api.Models;

namespace Ortol.Api.Services;

public static class Json
{
    public static readonly JsonSerializerOptions Options = Configure(new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true });

    /// <summary>
    /// Legge una lista da file JSON. File mancante o vuoto = lista vuota; file illeggibile = messo da parte
    /// come "*.corrotto-AAAAMMGG-HHMMSS.bak" e si riparte da una lista vuota, invece di bloccare l'avvio.
    /// </summary>
    public static List<T> ReadList<T>(string path)
    {
        if (!File.Exists(path)) return new();
        var text = File.ReadAllText(path);
        if (string.IsNullOrWhiteSpace(text)) return new();
        try { return JsonSerializer.Deserialize<List<T>>(text, Options) ?? new(); }
        catch (JsonException ex)
        {
            var bak = $"{path}.corrotto-{DateTime.Now:yyyyMMdd-HHmmss}.bak";
            File.Move(path, bak);
            Console.Error.WriteLine($"[Ortol] {Path.GetFileName(path)} non leggibile ({ex.Message}): spostato in {Path.GetFileName(bak)}, riparto da zero.");
            return new();
        }
    }

    public static JsonSerializerOptions Configure(JsonSerializerOptions o)
    {
        o.Converters.Add(new JsonStringEnumConverter());
        o.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        return o;
    }
}

/// <summary>Catalogo delle specie (sola lettura) caricato da Data/plants.json.</summary>
public class PlantCatalog
{
    private readonly Dictionary<string, PlantSpecies> _byId;
    public IReadOnlyList<PlantSpecies> All { get; }

    public PlantCatalog(IWebHostEnvironment env)
    {
        var path = Path.Combine(env.ContentRootPath, "Data", "plants.json");
        All = JsonSerializer.Deserialize<List<PlantSpecies>>(File.ReadAllText(path), Json.Options)
              ?? throw new InvalidOperationException("Catalogo piante vuoto");
        _byId = All.ToDictionary(p => p.Id);
    }

    public PlantSpecies? Get(string id) => _byId.GetValueOrDefault(id);
}

/// <summary>
/// Persistenza semplice su file JSON (App_Data/gardens.json), adatta a un uso personale.
/// Tutte le operazioni sono serializzate da un lock; il file è riscritto in modo atomico.
/// </summary>
public class GardenStore
{
    private readonly string _path;
    private readonly object _lock = new();
    private readonly List<Garden> _gardens;

    public GardenStore(IConfiguration cfg, IWebHostEnvironment env)
    {
        var dir = cfg["Storage:Directory"] is { Length: > 0 } d ? d : Path.Combine(env.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dir);
        _path = Path.Combine(dir, "gardens.json");
        _gardens = Json.ReadList<Garden>(_path);
        foreach (var g in _gardens) Normalize(g);
    }

    /// <summary>Orti salvati con versioni precedenti: ricava dimensioni dalla superficie.</summary>
    private static void Normalize(Garden g)
    {
        if (g.WidthM > 0 && g.LengthM > 0) return;
        double a = g.AreaSqm is > 0 ? g.AreaSqm.Value : 20;
        g.WidthM = Math.Round(Math.Sqrt(a * 1.25), 1);
        g.LengthM = Math.Round(a / g.WidthM, 1);
    }

    public List<Garden> ListByOwner(Guid owner) { lock (_lock) return _gardens.Where(g => g.OwnerId == owner).ToList(); }

    public Garden? GetOwned(Guid id, Guid owner) { lock (_lock) return _gardens.FirstOrDefault(g => g.Id == id && g.OwnerId == owner); }

    public void AssignOrphans(Guid owner) { lock (_lock) { foreach (var g in _gardens.Where(g => g.OwnerId is null)) g.OwnerId = owner; Save(); } }

    public void RemoveByOwner(Guid owner) { lock (_lock) { if (_gardens.RemoveAll(g => g.OwnerId == owner) > 0) Save(); } }

    public List<Garden> List() { lock (_lock) return _gardens.ToList(); }

    public Garden? Get(Guid id) { lock (_lock) return _gardens.FirstOrDefault(g => g.Id == id); }

    public void Add(Garden g) { lock (_lock) { _gardens.Add(g); Save(); } }

    public bool Remove(Guid id) { lock (_lock) { var ok = _gardens.RemoveAll(g => g.Id == id) > 0; if (ok) Save(); return ok; } }

    /// <summary>Esegue una modifica sotto lock e salva.</summary>
    public T Update<T>(Guid id, Func<Garden, T> change)
    {
        lock (_lock)
        {
            var g = _gardens.FirstOrDefault(x => x.Id == id) ?? throw new KeyNotFoundException();
            var r = change(g);
            Save();
            return r;
        }
    }

    private void Save()
    {
        var tmp = _path + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(_gardens, Json.Options));
        File.Move(tmp, _path, overwrite: true);
    }
}

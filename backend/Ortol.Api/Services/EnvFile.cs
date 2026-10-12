using Ortol.Api.Models;

namespace Ortol.Api.Services;

/// <summary>
/// Lettore minimale di file .env (KEY=VALORE, righe con # ignorate, virgolette opzionali).
/// Le variabili già presenti nell'ambiente hanno la precedenza e non vengono sovrascritte.
/// </summary>
public static class EnvFile
{
    public static string? Load()
    {
        foreach (var dir in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
        {
            var path = Path.Combine(dir, ".env");
            if (!File.Exists(path)) continue;
            foreach (var raw in File.ReadAllLines(path))
            {
                var line = raw.Trim();
                if (line.Length == 0 || line.StartsWith('#')) continue;
                if (line.StartsWith("export ")) line = line[7..].Trim();
                int eq = line.IndexOf('=');
                if (eq <= 0) continue;
                var key = line[..eq].Trim();
                var value = line[(eq + 1)..].Trim();
                if (value.Length >= 2 && (value[0] == '"' && value[^1] == '"' || value[0] == '\'' && value[^1] == '\''))
                    value = value[1..^1];
                if (Environment.GetEnvironmentVariable(key) is null) Environment.SetEnvironmentVariable(key, value);
            }
            return path;
        }
        return null;
    }
}

/// <summary>
/// Al primo avvio (nessun utente registrato) crea l'amministratore da ORTOL_ADMIN_USERNAME / ORTOL_ADMIN_PASSWORD.
/// La password viene salvata solo come hash: dopo il primo avvio il valore nel .env non viene più usato.
/// </summary>
public static class AdminSeeder
{
    public static void Seed(IServiceProvider sp)
    {
        var cfg = sp.GetRequiredService<IConfiguration>();
        var log = sp.GetRequiredService<ILoggerFactory>().CreateLogger("Ortol.Admin");
        var users = sp.GetRequiredService<UserStore>();
        string? username = cfg["ORTOL_ADMIN_USERNAME"], password = cfg["ORTOL_ADMIN_PASSWORD"];
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrEmpty(password)) return;

        if (users.Any())
        {
            log.LogInformation("Utenti già presenti: ORTOL_ADMIN_* nel .env viene ignorato (la password si cambia dall'app).");
            return;
        }
        if (PasswordHasher.Validate(password) is string err) { log.LogError("ORTOL_ADMIN_PASSWORD non valida: {Err}", err); return; }

        var u = new User
        {
            Username = username.Trim(),
            DisplayName = string.IsNullOrWhiteSpace(cfg["ORTOL_ADMIN_DISPLAYNAME"]) ? username.Trim() : cfg["ORTOL_ADMIN_DISPLAYNAME"]!.Trim(),
            PasswordHash = PasswordHasher.Hash(password),
            Role = UserRole.Admin,
        };
        if (users.TryAdd(u, onlyIfEmpty: true))
        {
            sp.GetRequiredService<GardenStore>().AssignOrphans(u.Id);
            log.LogInformation("Creato l'amministratore \"{User}\" dalle impostazioni del file .env.", u.Username);
        }
    }
}

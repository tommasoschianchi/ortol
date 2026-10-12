using System.Collections.Concurrent;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Ortol.Api.Models;

namespace Ortol.Api.Services;

/// <summary>Hash delle password con PBKDF2-SHA256 (600k iterazioni, sale casuale di 16 byte).</summary>
public static class PasswordHasher
{
    private const int Iterations = 600_000;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, 32);
        return $"pbkdf2-sha256${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string stored)
    {
        var parts = stored.Split('$');
        if (parts.Length != 4 || parts[0] != "pbkdf2-sha256" || !int.TryParse(parts[1], out var iter)) return false;
        var salt = Convert.FromBase64String(parts[2]);
        var expected = Convert.FromBase64String(parts[3]);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iter, HashAlgorithmName.SHA256, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    public static string? Validate(string? password) =>
        string.IsNullOrEmpty(password) || password.Length < 8 ? "La password deve avere almeno 8 caratteri." : null;
}

/// <summary>Utenti salvati in App_Data/users.json.</summary>
public class UserStore
{
    private readonly string _path;
    private readonly object _lock = new();
    private readonly List<User> _users;

    public UserStore(IConfiguration cfg, IWebHostEnvironment env)
    {
        var dir = cfg["Storage:Directory"] is { Length: > 0 } d ? d : Path.Combine(env.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dir);
        _path = Path.Combine(dir, "users.json");
        _users = Json.ReadList<User>(_path);
    }

    public bool Any() { lock (_lock) return _users.Count > 0; }
    public List<User> List() { lock (_lock) return _users.ToList(); }
    public User? Get(Guid id) { lock (_lock) return _users.FirstOrDefault(u => u.Id == id); }
    public User? ByUsername(string username)
    {
        lock (_lock) return _users.FirstOrDefault(u => string.Equals(u.Username, username.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>Aggiunge l'utente; restituisce false se lo username è già usato.</summary>
    public bool TryAdd(User u, bool onlyIfEmpty = false)
    {
        lock (_lock)
        {
            if (onlyIfEmpty && _users.Count > 0) return false;
            if (_users.Any(x => string.Equals(x.Username, u.Username, StringComparison.OrdinalIgnoreCase))) return false;
            _users.Add(u); Save(); return true;
        }
    }

    public T Update<T>(Guid id, Func<User, T> change)
    {
        lock (_lock)
        {
            var u = _users.FirstOrDefault(x => x.Id == id) ?? throw new KeyNotFoundException();
            var r = change(u); Save(); return r;
        }
    }

    public bool Remove(Guid id) { lock (_lock) { var ok = _users.RemoveAll(u => u.Id == id) > 0; if (ok) Save(); return ok; } }

    public int ActiveAdmins() { lock (_lock) return _users.Count(u => u.Role == UserRole.Admin && !u.Disabled); }

    private void Save()
    {
        var tmp = _path + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(_users, Json.Options));
        File.Move(tmp, _path, overwrite: true);
    }
}

/// <summary>Blocco temporaneo dopo ripetuti tentativi di accesso falliti (in memoria).</summary>
public class LoginThrottle
{
    private const int MaxFailures = 5;
    private static readonly TimeSpan LockTime = TimeSpan.FromMinutes(5);
    private readonly ConcurrentDictionary<string, (int Fails, DateTime Until)> _state = new(StringComparer.OrdinalIgnoreCase);

    public TimeSpan? LockedFor(string key)
    {
        if (_state.TryGetValue(key, out var s) && s.Until > DateTime.UtcNow) return s.Until - DateTime.UtcNow;
        return null;
    }

    public void Fail(string key) => _state.AddOrUpdate(key, (1, DateTime.MinValue), (_, s) =>
    {
        var fails = s.Until != DateTime.MinValue && s.Until < DateTime.UtcNow ? 1 : s.Fails + 1;
        return (fails, fails >= MaxFailures ? DateTime.UtcNow + LockTime : DateTime.MinValue);
    });

    public void Success(string key) => _state.TryRemove(key, out _);
}

public static class AuthExtensions
{
    public const string StampClaim = "ortol:stamp";

    public static Guid UserId(this ClaimsPrincipal p) => Guid.Parse(p.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public static ClaimsPrincipal ToPrincipal(this User u) => new(new ClaimsIdentity(
    [
        new Claim(ClaimTypes.NameIdentifier, u.Id.ToString()),
        new Claim(ClaimTypes.Name, u.Username),
        new Claim(ClaimTypes.Role, u.Role.ToString()),
        new Claim(StampClaim, u.SecurityStamp),
    ], CookieAuthenticationDefaults.AuthenticationScheme));

    public static void AddOrtolAuth(this IServiceCollection services)
    {
        services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(o =>
            {
                o.Cookie.Name = "ortol.auth";
                o.Cookie.HttpOnly = true;
                o.Cookie.SameSite = SameSiteMode.Strict;
                o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
                o.ExpireTimeSpan = TimeSpan.FromDays(30);
                o.SlidingExpiration = true;
                // API: niente redirect, solo codici HTTP
                o.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = 401; return Task.CompletedTask; };
                o.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = 403; return Task.CompletedTask; };
                // Sessione invalidata se l'utente è stato disattivato, eliminato o ha cambiato password/ruolo
                o.Events.OnValidatePrincipal = async ctx =>
                {
                    var users = ctx.HttpContext.RequestServices.GetRequiredService<UserStore>();
                    var idStr = ctx.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                    var u = Guid.TryParse(idStr, out var id) ? users.Get(id) : null;
                    if (u is null || u.Disabled || u.SecurityStamp != ctx.Principal!.FindFirstValue(StampClaim)
                        || u.Role.ToString() != ctx.Principal!.FindFirstValue(ClaimTypes.Role))
                    {
                        ctx.RejectPrincipal();
                        await ctx.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                    }
                };
            });
        services.AddAuthorization();
    }
}

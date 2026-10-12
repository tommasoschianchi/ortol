using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ortol.Api.Models;
using Ortol.Api.Services;

namespace Ortol.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(UserStore users, GardenStore gardens, LoginThrottle throttle) : ControllerBase
{
    [HttpGet("status")]
    [AllowAnonymous]
    public AuthStatus Status()
    {
        User? u = null;
        if (User.Identity?.IsAuthenticated == true) u = users.Get(User.UserId());
        return new AuthStatus(!users.Any(), u is null ? null : UserDto.From(u));
    }

    /// <summary>Primo avvio: crea l'account amministratore. Disponibile solo finché non esiste alcun utente.</summary>
    [HttpPost("setup")]
    [AllowAnonymous]
    public async Task<IActionResult> Setup(SetupRequest req)
    {
        if (users.Any()) return Conflict(new { detail = "La configurazione iniziale è già stata completata." });
        var err = ValidateUsername(req.Username) ?? PasswordHasher.Validate(req.Password);
        if (err is not null) return BadRequest(new { detail = err });

        var u = new User
        {
            Username = req.Username.Trim(), DisplayName = Clean(req.DisplayName, req.Username),
            PasswordHash = PasswordHasher.Hash(req.Password), Role = UserRole.Admin, LastLoginAt = DateTime.UtcNow,
        };
        if (!users.TryAdd(u, onlyIfEmpty: true)) return Conflict(new { detail = "La configurazione iniziale è già stata completata." });
        gardens.AssignOrphans(u.Id); // orti creati prima dell'introduzione degli account
        await SignIn(u, true);
        return Ok(UserDto.From(u));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var key = (req.Username ?? "").Trim();
        if (throttle.LockedFor(key) is TimeSpan wait)
            return StatusCode(429, new { detail = $"Troppi tentativi falliti. Riprova tra {Math.Ceiling(wait.TotalMinutes)} minuti." });

        var u = users.ByUsername(key);
        // Verifica sempre un hash per non rivelare, dai tempi di risposta, se l'utente esiste
        bool ok = PasswordHasher.Verify(req.Password ?? "", u?.PasswordHash ?? DummyHash) && u is not null;
        if (!ok) { throttle.Fail(key); return Unauthorized(new { detail = "Nome utente o password non corretti." }); }
        if (u!.Disabled) return StatusCode(403, new { detail = "Account disattivato. Contatta l'amministratore." });

        throttle.Success(key);
        users.Update(u.Id, x => x.LastLoginAt = DateTime.UtcNow);
        await SignIn(u, req.Remember);
        return Ok(UserDto.From(u));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [Authorize]
    [HttpPost("password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        var u = users.Get(User.UserId());
        if (u is null) return Unauthorized();
        if (!PasswordHasher.Verify(req.CurrentPassword ?? "", u.PasswordHash)) return BadRequest(new { detail = "La password attuale non è corretta." });
        if (PasswordHasher.Validate(req.NewPassword) is string err) return BadRequest(new { detail = err });
        var updated = users.Update(u.Id, x => { x.PasswordHash = PasswordHasher.Hash(req.NewPassword); x.SecurityStamp = Guid.NewGuid().ToString("N"); return x; });
        await SignIn(updated, true); // nuova sessione con il nuovo stamp: le altre sessioni vengono chiuse
        return NoContent();
    }

    private Task SignIn(User u, bool remember) => HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, u.ToPrincipal(),
        new AuthenticationProperties { IsPersistent = remember, AllowRefresh = true });

    private static readonly string DummyHash = PasswordHasher.Hash(Guid.NewGuid().ToString());

    internal static string? ValidateUsername(string? s)
    {
        s = s?.Trim();
        if (string.IsNullOrEmpty(s) || s.Length < 3 || s.Length > 40) return "Il nome utente deve avere tra 3 e 40 caratteri.";
        if (!s.All(c => char.IsLetterOrDigit(c) || c is '.' or '_' or '-' or '@')) return "Il nome utente può contenere solo lettere, numeri e . _ - @";
        return null;
    }

    internal static string Clean(string? display, string fallback) => string.IsNullOrWhiteSpace(display) ? fallback.Trim() : display.Trim();
}

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
public class AdminController(UserStore users, GardenStore gardens) : ControllerBase
{
    [HttpGet]
    public IEnumerable<AdminUserDto> List()
    {
        var all = gardens.List();
        return users.List().OrderBy(u => u.Username).Select(u =>
        {
            var mine = all.Where(g => g.OwnerId == u.Id).ToList();
            return new AdminUserDto(u.Id, u.Username, u.DisplayName, u.Role, u.Disabled, u.CreatedAt, u.LastLoginAt,
                mine.Count, mine.Sum(g => g.Plants.Count(p => p.Active)), mine.Sum(g => g.Plants.Sum(p => p.Logs.Count)));
        });
    }

    [HttpPost]
    public IActionResult Create(CreateUserRequest req)
    {
        var err = AuthController.ValidateUsername(req.Username) ?? PasswordHasher.Validate(req.Password);
        if (err is not null) return BadRequest(new { detail = err });
        var u = new User
        {
            Username = req.Username.Trim(), DisplayName = AuthController.Clean(req.DisplayName, req.Username),
            PasswordHash = PasswordHasher.Hash(req.Password), Role = req.Role,
        };
        if (!users.TryAdd(u)) return Conflict(new { detail = $"Lo username \"{u.Username}\" è già in uso." });
        return Ok(UserDto.From(u));
    }

    [HttpPut("{id:guid}")]
    public IActionResult Update(Guid id, UpdateUserRequest req)
    {
        var u = users.Get(id);
        if (u is null) return NotFound();
        bool self = id == User.UserId();
        if (self && (req.Disabled == true || req.Role == UserRole.User))
            return BadRequest(new { detail = "Non puoi disattivare o togliere i permessi di amministratore al tuo account." });
        bool losesAdmin = u.Role == UserRole.Admin && !u.Disabled && (req.Role == UserRole.User || req.Disabled == true);
        if (losesAdmin && users.ActiveAdmins() <= 1) return BadRequest(new { detail = "Deve restare almeno un amministratore attivo." });
        if (req.Password is not null && PasswordHasher.Validate(req.Password) is string perr) return BadRequest(new { detail = perr });

        var updated = users.Update(id, x =>
        {
            if (!string.IsNullOrWhiteSpace(req.DisplayName)) x.DisplayName = req.DisplayName.Trim();
            bool resetStamp = false;
            if (req.Role is UserRole r && r != x.Role) { x.Role = r; resetStamp = true; }
            if (req.Disabled is bool d && d != x.Disabled) { x.Disabled = d; resetStamp = true; }
            if (req.Password is not null) { x.PasswordHash = PasswordHasher.Hash(req.Password); resetStamp = true; }
            if (resetStamp && !self) x.SecurityStamp = Guid.NewGuid().ToString("N");
            return x;
        });
        return Ok(UserDto.From(updated));
    }

    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id)
    {
        if (id == User.UserId()) return BadRequest(new { detail = "Non puoi eliminare il tuo account." });
        var u = users.Get(id);
        if (u is null) return NotFound();
        if (u.Role == UserRole.Admin && !u.Disabled && users.ActiveAdmins() <= 1) return BadRequest(new { detail = "Deve restare almeno un amministratore attivo." });
        gardens.RemoveByOwner(id);
        users.Remove(id);
        return NoContent();
    }
}

namespace Ortol.Api.Models;

public enum UserRole { User, Admin }

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public UserRole Role { get; set; } = UserRole.User;
    public bool Disabled { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    /// <summary>Cambia a ogni reset password/disattivazione: invalida le sessioni aperte.</summary>
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");
}

public record UserDto(Guid Id, string Username, string DisplayName, UserRole Role, bool Disabled, DateTime CreatedAt, DateTime? LastLoginAt)
{
    public static UserDto From(User u) => new(u.Id, u.Username, u.DisplayName, u.Role, u.Disabled, u.CreatedAt, u.LastLoginAt);
}

public record AdminUserDto(Guid Id, string Username, string DisplayName, UserRole Role, bool Disabled, DateTime CreatedAt, DateTime? LastLoginAt,
    int Gardens, int Crops, int Logs);

public record AuthStatus(bool NeedsSetup, UserDto? User);
public record LoginRequest(string Username, string Password, bool Remember = true);
public record SetupRequest(string Username, string DisplayName, string Password);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record CreateUserRequest(string Username, string DisplayName, string Password, UserRole Role);
public record UpdateUserRequest(string? DisplayName, UserRole? Role, bool? Disabled, string? Password);

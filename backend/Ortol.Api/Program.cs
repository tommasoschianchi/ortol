using Microsoft.AspNetCore.DataProtection;
using Ortol.Api.Services;

// Variabili da .env (es. credenziali del primo amministratore), caricate prima della configurazione
EnvFile.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(o => Json.Configure(o.JsonSerializerOptions));
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<OpenMeteoClient>(c =>
{
    c.Timeout = TimeSpan.FromSeconds(30);
    c.DefaultRequestHeaders.UserAgent.ParseAdd("Ortol/1.0 (orto personale)");
});
builder.Services.AddSingleton<PlantCatalog>();
builder.Services.AddSingleton<GardenStore>();
builder.Services.AddSingleton<UserStore>();
builder.Services.AddSingleton<LoginThrottle>();
builder.Services.AddOrtolAuth();
// Chiavi dei cookie di sessione salvate con i dati: le sessioni sopravvivono ai riavvii
var dataDir = builder.Configuration["Storage:Directory"] is { Length: > 0 } sd ? sd : Path.Combine(builder.Environment.ContentRootPath, "App_Data");
builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(dataDir, "keys"))).SetApplicationName("Ortol");
builder.Services.AddSingleton<FitnessService>();
builder.Services.AddSingleton<CareService>();
builder.Services.AddScoped<ClimateService>();
builder.Services.AddScoped<WeatherService>();

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"])
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

AdminSeeder.Seed(app.Services);

app.UseDefaultFiles();
app.UseStaticFiles(); // in produzione serve la build React copiata in wwwroot
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));
app.MapFallbackToFile("index.html");

app.Run();

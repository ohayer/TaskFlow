using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using TaskFlow.Infrastructure.Auth;

namespace TaskFlow.Api.Controllers;

// Endpoint pomocniczy do diagnozy konfiguracji - sprawdza czy AI Vision jest podpiety
// (NIE ujawnia wartosci kluczy ani connection-stringow, tylko ich obecnosc)
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DiagnosticController : ControllerBase
{
    private readonly IOptions<AiVisionSettings> _aiVisionSettings;
    private readonly IConfiguration _config;

    public DiagnosticController(IOptions<AiVisionSettings> aiVisionSettings, IConfiguration config)
    {
        _aiVisionSettings = aiVisionSettings;
        _config = config;
    }

    [HttpGet("config-status")]
    public IActionResult ConfigStatus()
    {
        var ai = _aiVisionSettings.Value;
        var aiOk = !string.IsNullOrWhiteSpace(ai.Endpoint) && !string.IsNullOrWhiteSpace(ai.Key);

        return Ok(new
        {
            aiVision = new
            {
                configured = aiOk,
                endpointSet = !string.IsNullOrWhiteSpace(ai.Endpoint),
                keySet = !string.IsNullOrWhiteSpace(ai.Key),
                endpointPreview = string.IsNullOrEmpty(ai.Endpoint) ? null : ai.Endpoint.Substring(0, Math.Min(50, ai.Endpoint.Length)),
                keyLength = ai.Key?.Length ?? 0,
            },
            connectionStrings = new
            {
                sqlSet = !string.IsNullOrWhiteSpace(_config.GetConnectionString("Sql")),
                cosmosSet = !string.IsNullOrWhiteSpace(_config.GetConnectionString("Cosmos")),
                redisSet = !string.IsNullOrWhiteSpace(_config.GetConnectionString("Redis")),
                storageSet = !string.IsNullOrWhiteSpace(_config.GetConnectionString("Storage")),
                serviceBusSet = !string.IsNullOrWhiteSpace(_config.GetConnectionString("ServiceBus")),
            },
            jwt = new
            {
                secretSet = !string.IsNullOrWhiteSpace(_config["Jwt:Secret"]),
                secretLength = _config["Jwt:Secret"]?.Length ?? 0,
            },
        });
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using TaskFlow.Application.Abstractions;

namespace TaskFlow.Api.Auth;

public class CurrentUserService : ICurrentUser
{
    private readonly IHttpContextAccessor _http;

    public CurrentUserService(IHttpContextAccessor http) => _http = http;

    public bool IsAuthenticated => _http.HttpContext?.User?.Identity?.IsAuthenticated ?? false;

    public string? EntraObjectId => null;                                       // unused — JWT auth, ID idzie przez UserId

    public string? Email => _http.HttpContext?.User?.FindFirstValue(JwtRegisteredClaimNames.Email)
        ?? _http.HttpContext?.User?.FindFirstValue(ClaimTypes.Email);

    public Guid? UserId
    {
        get
        {
            var sub = _http.HttpContext?.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? _http.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }
}

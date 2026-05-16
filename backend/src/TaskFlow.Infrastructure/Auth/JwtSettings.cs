namespace TaskFlow.Infrastructure.Auth;

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "TaskFlow";
    public string Audience { get; set; } = "TaskFlow.Api";
    public int ExpiryMinutes { get; set; } = 60 * 24;                           // 24h domyślnie
}

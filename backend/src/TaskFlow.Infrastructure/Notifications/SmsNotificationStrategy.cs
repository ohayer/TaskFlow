using Microsoft.Extensions.Logging;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Notifications;

namespace TaskFlow.Infrastructure.Notifications;

public class SmsNotificationStrategy : INotificationStrategy
{
    private readonly ILogger<SmsNotificationStrategy> _logger;

    public SmsNotificationStrategy(ILogger<SmsNotificationStrategy> logger) => _logger = logger;

    public NotificationChannel Channel => NotificationChannel.Sms;

    public Task<bool> SendAsync(NotificationContext context, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(context.RecipientPhoneNumber))
        {
            _logger.LogWarning("SMS skipped — no phone number for user {UserId}", context.RecipientUserId);
            return Task.FromResult(false);
        }
        _logger.LogInformation("SMS -> {Phone}: {Body}", context.RecipientPhoneNumber, context.Body);
        return Task.FromResult(true);
    }
}

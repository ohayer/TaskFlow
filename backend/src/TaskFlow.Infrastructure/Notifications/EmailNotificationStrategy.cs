using Microsoft.Extensions.Logging;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Notifications;

namespace TaskFlow.Infrastructure.Notifications;

public class EmailNotificationStrategy : INotificationStrategy
{
    private readonly ILogger<EmailNotificationStrategy> _logger;

    public EmailNotificationStrategy(ILogger<EmailNotificationStrategy> logger) => _logger = logger;

    public NotificationChannel Channel => NotificationChannel.Email;

    public Task<bool> SendAsync(NotificationContext context, CancellationToken ct = default)
    {
        _logger.LogInformation("Email -> {Email}: {Subject}", context.RecipientEmail, context.Subject);
        return Task.FromResult(true);
    }
}

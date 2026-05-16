using Microsoft.Extensions.Logging;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Notifications;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.Infrastructure.Notifications;

public class InAppNotificationStrategy : INotificationStrategy
{
    private readonly IAuditRepository _audit;
    private readonly ILogger<InAppNotificationStrategy> _logger;

    public InAppNotificationStrategy(IAuditRepository audit, ILogger<InAppNotificationStrategy> logger)
    {
        _audit = audit;
        _logger = logger;
    }

    public NotificationChannel Channel => NotificationChannel.InApp;

    public async Task<bool> SendAsync(NotificationContext context, CancellationToken ct = default)
    {
        var entry = new AuditEntry
        {
            ProjectId = context.RelatedEntityId ?? context.RecipientUserId.ToString(),
            TaskId = context.RelatedEntityId ?? string.Empty,
            Action = "Notification",
            PerformedById = context.RecipientUserId,
            NewState = context.Body,
            Metadata = new Dictionary<string, object>
            {
                ["subject"] = context.Subject,
                ["channel"] = "InApp"
            }
        };
        await _audit.AddEntryAsync(entry, ct);
        _logger.LogInformation("InApp notification stored for user {UserId}", context.RecipientUserId);
        return true;
    }
}

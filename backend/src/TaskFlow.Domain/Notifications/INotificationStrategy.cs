using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Notifications;

public interface INotificationStrategy
{
    NotificationChannel Channel { get; }
    Task<bool> SendAsync(NotificationContext context, CancellationToken ct = default);
}

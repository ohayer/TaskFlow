using TaskFlow.Domain.Notifications;

namespace TaskFlow.Infrastructure.Messaging;

public interface INotificationPublisher
{
    Task PublishAsync(NotificationContext context, CancellationToken ct = default);
}

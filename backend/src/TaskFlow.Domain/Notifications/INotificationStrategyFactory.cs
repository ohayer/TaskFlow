using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Notifications;

public interface INotificationStrategyFactory
{
    INotificationStrategy Create(NotificationChannel channel);
}

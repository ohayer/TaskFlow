using Microsoft.Extensions.DependencyInjection;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Notifications;

namespace TaskFlow.Infrastructure.Notifications;

public class NotificationStrategyFactory : INotificationStrategyFactory
{
    private readonly IServiceProvider _serviceProvider;

    public NotificationStrategyFactory(IServiceProvider serviceProvider) => _serviceProvider = serviceProvider;

    public INotificationStrategy Create(NotificationChannel channel)
    {
        // wzorzec Factory — tworzy właściwą strategię powiadomień dla danego kanału

        // Refleksja — wyszukanie typu klasy po nazwie (np. Email -> EmailNotificationStrategy)
        var typeName = $"{channel}NotificationStrategy";
        var strategyType = typeof(EmailNotificationStrategy).Assembly
            .GetTypes()
            .First(t => t.Name == typeName && typeof(INotificationStrategy).IsAssignableFrom(t));

        return (INotificationStrategy)ActivatorUtilities.CreateInstance(_serviceProvider, strategyType);
    }
}

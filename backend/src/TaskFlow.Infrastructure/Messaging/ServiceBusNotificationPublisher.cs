using System.Text.Json;
using Azure.Messaging.ServiceBus;
using TaskFlow.Domain.Notifications;

namespace TaskFlow.Infrastructure.Messaging;

public class ServiceBusNotificationPublisher : INotificationPublisher, IAsyncDisposable
{
    private readonly ServiceBusClient _client;
    private readonly ServiceBusSender _sender;

    public ServiceBusNotificationPublisher(ServiceBusClient client, string queueName = "notifications")
    {
        _client = client;
        _sender = client.CreateSender(queueName);
    }

    public async Task PublishAsync(NotificationContext context, CancellationToken ct = default)
    {
        var payload = JsonSerializer.Serialize(context);
        var message = new ServiceBusMessage(payload)
        {
            ContentType = "application/json",
            Subject = context.Subject
        };
        await _sender.SendMessageAsync(message, ct);
    }

    public async ValueTask DisposeAsync()
    {
        await _sender.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}

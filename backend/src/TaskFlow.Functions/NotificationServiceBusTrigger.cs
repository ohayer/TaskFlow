using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using TaskFlow.Domain.Notifications;

namespace TaskFlow.Functions;

// ServiceBusTrigger: czyta z kolejki 'notifications' i wysyła przez wszystkie strategie (Strategy Pattern).
// W produkcji wybór jednej strategii odbywa się w NotificationService (na podstawie preferencji usera);
// tutaj funkcja jest fallbackiem dla wiadomości postawionych bezpośrednio do kolejki.
public class NotificationServiceBusTrigger
{
    private readonly IEnumerable<INotificationStrategy> _strategies;
    private readonly ILogger<NotificationServiceBusTrigger> _logger;

    public NotificationServiceBusTrigger(
        IEnumerable<INotificationStrategy> strategies,
        ILogger<NotificationServiceBusTrigger> logger)
    {
        _strategies = strategies;
        _logger = logger;
    }

    [Function(nameof(NotificationServiceBusTrigger))]
    public async Task Run(
        [ServiceBusTrigger("notifications", Connection = "ConnectionStrings:ServiceBus")] string messageBody,
        FunctionContext context)
    {
        _logger.LogInformation("ServiceBus message received, length={Len}", messageBody.Length);

        NotificationContext? ctx;
        try
        {
            ctx = JsonSerializer.Deserialize<NotificationContext>(messageBody);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Cannot parse notification message");
            return;
        }

        if (ctx is null)
        {
            _logger.LogWarning("Empty notification context");
            return;
        }

        // Domyślnie próbuj Email. Bardziej zaawansowana logika preferencji jest w NotificationService.
        var strategy = _strategies.FirstOrDefault(s => s.Channel == Domain.Enums.NotificationChannel.Email)
            ?? _strategies.First();
        await strategy.SendAsync(ctx, context.CancellationToken);
    }
}

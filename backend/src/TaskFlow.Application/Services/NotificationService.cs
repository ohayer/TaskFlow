using Microsoft.Extensions.Logging;
using TaskFlow.Domain.Notifications;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.Application.Services;

public class NotificationService : INotificationService
{
    private readonly IUserRepository _users;
    private readonly ITaskRepository _tasks;
    private readonly IEnumerable<INotificationStrategy> _strategies;            // Strategy Pattern: wszystkie zarejestrowane strategie
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        IUserRepository users,
        ITaskRepository tasks,
        IEnumerable<INotificationStrategy> strategies,
        ILogger<NotificationService> logger)
    {
        _users = users;
        _tasks = tasks;
        _strategies = strategies;
        _logger = logger;
    }

    public async Task<bool> NotifyTaskAssignedAsync(Guid taskId, Guid assigneeId, Guid assignedById, CancellationToken ct = default)
    {
        var assignee = await _users.GetByIdAsync(assigneeId, ct);
        var task = await _tasks.GetByIdAsync(taskId, ct);
        if (assignee is null || task is null) return false;

        var ctx = new NotificationContext(
            assignee.Id,
            assignee.Email,
            assignee.PhoneNumber,
            $"New task assigned: {task.Title}",
            $"You have been assigned to task '{task.Title}'. Due date: {task.DueDate?.ToString("yyyy-MM-dd") ?? "not set"}.",
            "Task",
            task.Id.ToString());

        return await SelectAndSendAsync(assignee.NotificationPreference, ctx, ct);
    }

    public async Task<bool> NotifyDeadlineApproachingAsync(Guid taskId, Guid recipientId, CancellationToken ct = default)
    {
        var recipient = await _users.GetByIdAsync(recipientId, ct);
        var task = await _tasks.GetByIdAsync(taskId, ct);
        if (recipient is null || task is null) return false;

        var ctx = new NotificationContext(
            recipient.Id,
            recipient.Email,
            recipient.PhoneNumber,
            $"Deadline approaching: {task.Title}",
            $"Task '{task.Title}' is due on {task.DueDate?.ToString("yyyy-MM-dd")}.",
            "Task",
            task.Id.ToString());

        return await SelectAndSendAsync(recipient.NotificationPreference, ctx, ct);
    }

    // Strategy Pattern: wybór strategii po preferencji użytkownika
    private async Task<bool> SelectAndSendAsync(Domain.Enums.NotificationChannel preferred, NotificationContext ctx, CancellationToken ct)
    {
        var strategy = _strategies.FirstOrDefault(s => s.Channel == preferred);
        if (strategy is null)
        {
            _logger.LogWarning("No strategy registered for channel {Channel}, falling back to first available", preferred);
            strategy = _strategies.FirstOrDefault();
        }
        if (strategy is null)
        {
            _logger.LogError("No notification strategies registered at all");
            return false;
        }
        return await strategy.SendAsync(ctx, ct);
    }
}

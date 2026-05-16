namespace TaskFlow.Application.Services;

public interface INotificationService
{
    Task<bool> NotifyTaskAssignedAsync(Guid taskId, Guid assigneeId, Guid assignedById, CancellationToken ct = default);
    Task<bool> NotifyDeadlineApproachingAsync(Guid taskId, Guid recipientId, CancellationToken ct = default);
}

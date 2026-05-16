using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Abstractions;

public interface ITaskListCache
{
    Task<IReadOnlyList<TaskItem>?> GetTasksAsync(Guid projectId, CancellationToken ct = default);
    Task SetTasksAsync(Guid projectId, IReadOnlyList<TaskItem> tasks, CancellationToken ct = default);
    Task InvalidateAsync(Guid projectId, CancellationToken ct = default);
}

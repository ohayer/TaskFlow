using System.Collections.Concurrent;
using TaskFlow.Application.Abstractions;
using TaskFlow.Domain.Entities;

namespace TaskFlow.IntegrationTests.Infrastructure;

public class InMemoryTaskListCache : ITaskListCache
{
    private readonly ConcurrentDictionary<Guid, IReadOnlyList<TaskItem>> _cache = new();

    public Task<IReadOnlyList<TaskItem>?> GetTasksAsync(Guid projectId, CancellationToken ct = default)
    {
        _cache.TryGetValue(projectId, out var tasks);
        return Task.FromResult<IReadOnlyList<TaskItem>?>(tasks);
    }

    public Task SetTasksAsync(Guid projectId, IReadOnlyList<TaskItem> tasks, CancellationToken ct = default)
    {
        _cache[projectId] = tasks;
        return Task.CompletedTask;
    }

    public Task InvalidateAsync(Guid projectId, CancellationToken ct = default)
    {
        _cache.TryRemove(projectId, out _);
        return Task.CompletedTask;
    }
}

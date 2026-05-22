using System.Collections.Concurrent;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.IntegrationTests.Infrastructure;

public class InMemoryAuditRepository : IAuditRepository
{
    private readonly ConcurrentBag<AuditEntry> _entries = new();

    public Task AddEntryAsync(AuditEntry entry, CancellationToken ct = default)
    {
        _entries.Add(entry);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<AuditEntry>> ListByTaskAsync(Guid projectId, Guid taskId, int limit = 50, CancellationToken ct = default)
    {
        IReadOnlyList<AuditEntry> result = _entries
            .Where(e => e.ProjectId == projectId.ToString() && e.TaskId == taskId.ToString())
            .OrderByDescending(e => e.Timestamp)
            .Take(limit)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<AuditEntry>> ListByProjectAsync(Guid projectId, int limit = 100, CancellationToken ct = default)
    {
        IReadOnlyList<AuditEntry> result = _entries
            .Where(e => e.ProjectId == projectId.ToString())
            .OrderByDescending(e => e.Timestamp)
            .Take(limit)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<AuditEntry>> ListByUserInProjectAsync(Guid projectId, Guid userId, int limit = 100, CancellationToken ct = default)
    {
        IReadOnlyList<AuditEntry> result = _entries
            .Where(e => e.ProjectId == projectId.ToString() && e.PerformedById == userId)
            .OrderByDescending(e => e.Timestamp)
            .Take(limit)
            .ToList();
        return Task.FromResult(result);
    }
}

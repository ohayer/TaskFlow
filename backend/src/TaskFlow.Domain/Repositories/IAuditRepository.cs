using TaskFlow.Domain.Entities;

namespace TaskFlow.Domain.Repositories;

public interface IAuditRepository
{
    Task AddEntryAsync(AuditEntry entry, CancellationToken ct = default);
    Task<IReadOnlyList<AuditEntry>> ListByTaskAsync(Guid projectId, Guid taskId, int limit = 50, CancellationToken ct = default);
    Task<IReadOnlyList<AuditEntry>> ListByProjectAsync(Guid projectId, int limit = 100, CancellationToken ct = default);
    Task<IReadOnlyList<AuditEntry>> ListByUserInProjectAsync(Guid projectId, Guid userId, int limit = 100, CancellationToken ct = default);
}

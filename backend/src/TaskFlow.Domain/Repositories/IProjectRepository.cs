using TaskFlow.Domain.Entities;

namespace TaskFlow.Domain.Repositories;

public interface IProjectRepository
{
    Task<Project?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Project>> ListByUserAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(Project project, CancellationToken ct = default);
    Task UpdateAsync(Project project, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<bool> IsMemberAsync(Guid projectId, Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<ProjectMember>> ListMembersWithUserAsync(Guid projectId, CancellationToken ct = default);
    Task<ProjectMember?> GetMemberAsync(Guid projectId, Guid userId, CancellationToken ct = default);
    Task UpdateMemberAsync(ProjectMember member, CancellationToken ct = default);
    Task RemoveMemberAsync(Guid projectId, Guid userId, CancellationToken ct = default);
}

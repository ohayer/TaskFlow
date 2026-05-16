using TaskFlow.Application.Dtos;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Services;

public interface IProjectService
{
    Task<IReadOnlyList<ProjectDto>> ListMineAsync(Guid userId, CancellationToken ct = default);
    Task<ProjectDto?> GetAsync(Guid id, Guid requesterId, CancellationToken ct = default);
    Task<ProjectDto> CreateAsync(CreateProjectDto dto, Guid ownerId, CancellationToken ct = default);
    Task<ProjectDto?> UpdateAsync(Guid id, UpdateProjectDto dto, Guid requesterId, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, Guid requesterId, CancellationToken ct = default);
    Task<AddMemberResult> AddMemberAsync(Guid projectId, string email, ProjectRole role, Guid requesterId, CancellationToken ct = default);
    Task<IReadOnlyList<ProjectMemberDto>> ListMembersAsync(Guid projectId, Guid requesterId, CancellationToken ct = default);
    Task<MemberOpResult> UpdateMemberRoleAsync(Guid projectId, Guid memberUserId, ProjectRole newRole, Guid requesterId, CancellationToken ct = default);
    Task<MemberOpResult> RemoveMemberAsync(Guid projectId, Guid memberUserId, Guid requesterId, CancellationToken ct = default);
    Task<IReadOnlyList<AuditEntryDto>> ListMemberAuditInProjectAsync(Guid projectId, Guid memberUserId, Guid requesterId, CancellationToken ct = default);
}

public enum AddMemberResult
{
    Success,
    NotOwner,
    UserNotFound,
    AlreadyMember,
    ProjectNotFound,
}

public enum MemberOpResult
{
    Success,
    NotOwner,
    ProjectNotFound,
    MemberNotFound,
    CannotModifyOwner,                                                          // owner nie moze zmienic/usunac samego siebie
}

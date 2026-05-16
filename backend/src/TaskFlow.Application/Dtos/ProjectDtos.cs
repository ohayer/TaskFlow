using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Dtos;

public record ProjectDto(Guid Id, string Name, string? Description, Guid OwnerId, DateTime CreatedAt, int MemberCount, int TaskCount);
public record CreateProjectDto(string Name, string? Description);
public record UpdateProjectDto(string Name, string? Description);
public record AddMemberDto(string Email, ProjectRole Role);

public record ProjectMemberDto(
    Guid UserId,
    string Email,
    string DisplayName,
    ProjectRole Role,
    DateTime JoinedAt,
    bool IsOwner);

public record UpdateMemberRoleDto(ProjectRole Role);

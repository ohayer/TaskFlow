using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Dtos;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.Application.Services;

public class ProjectService : IProjectService
{
    private readonly IProjectRepository _projects;
    private readonly IUserRepository _users;
    private readonly IAuditRepository _audit;
    private readonly ITaskListCache _cache;

    public ProjectService(IProjectRepository projects, IUserRepository users, IAuditRepository audit, ITaskListCache cache)
    {
        _projects = projects;
        _users = users;
        _audit = audit;
        _cache = cache;
    }

    public async Task<IReadOnlyList<ProjectDto>> ListMineAsync(Guid userId, CancellationToken ct = default)
    {
        var projects = await _projects.ListByUserAsync(userId, ct);
        return projects.Select(p => new ProjectDto(p.Id, p.Name, p.Description, p.OwnerId, p.CreatedAt, CountMembers(p), p.Tasks.Count)).ToList();
    }

    public async Task<ProjectDto?> GetAsync(Guid id, Guid requesterId, CancellationToken ct = default)
    {
        var project = await _projects.GetByIdAsync(id, ct);
        if (project is null) return null;
        if (project.OwnerId != requesterId && !project.Members.Any(m => m.UserId == requesterId)) return null;
        return new ProjectDto(project.Id, project.Name, project.Description, project.OwnerId, project.CreatedAt, CountMembers(project), project.Tasks.Count);
    }

    // Dla legacy projektow Owner moze nie miec wpisu w ProjectMembers - liczymy go syntetycznie
    private static int CountMembers(Project p)
        => p.Members.Count + (p.Members.Any(m => m.UserId == p.OwnerId) ? 0 : 1);

    public async Task<ProjectDto> CreateAsync(CreateProjectDto dto, Guid ownerId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new ArgumentException("Project name is required", nameof(dto));

        var project = new Project { Name = dto.Name.Trim(), Description = dto.Description?.Trim(), OwnerId = ownerId };
        project.Members.Add(new ProjectMember { ProjectId = project.Id, UserId = ownerId, Role = ProjectRole.Owner });
        await _projects.AddAsync(project, ct);
        return new ProjectDto(project.Id, project.Name, project.Description, project.OwnerId, project.CreatedAt, 1, 0);
    }

    public async Task<ProjectDto?> UpdateAsync(Guid id, UpdateProjectDto dto, Guid requesterId, CancellationToken ct = default)
    {
        var project = await _projects.GetByIdAsync(id, ct);
        if (project is null) return null;
        if (project.OwnerId != requesterId) return null;

        project.Name = dto.Name.Trim();
        project.Description = dto.Description?.Trim();
        await _projects.UpdateAsync(project, ct);
        return new ProjectDto(project.Id, project.Name, project.Description, project.OwnerId, project.CreatedAt, project.Members.Count, project.Tasks.Count);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid requesterId, CancellationToken ct = default)
    {
        var project = await _projects.GetByIdAsync(id, ct);
        if (project is null || project.OwnerId != requesterId) return false;
        await _projects.DeleteAsync(id, ct);
        await _cache.InvalidateAsync(id, ct);
        return true;
    }

    public async Task<AddMemberResult> AddMemberAsync(Guid projectId, string email, ProjectRole role, Guid requesterId, CancellationToken ct = default)
    {
        var project = await _projects.GetByIdAsync(projectId, ct);
        if (project is null) return AddMemberResult.ProjectNotFound;
        if (project.OwnerId != requesterId) return AddMemberResult.NotOwner;

        var user = await _users.GetByEmailAsync(email.Trim().ToLowerInvariant(), ct);
        if (user is null) return AddMemberResult.UserNotFound;
        if (project.Members.Any(m => m.UserId == user.Id) || project.OwnerId == user.Id) return AddMemberResult.AlreadyMember;

        project.Members.Add(new ProjectMember { ProjectId = projectId, UserId = user.Id, Role = role });
        await _projects.UpdateAsync(project, ct);

        await _audit.AddEntryAsync(new AuditEntry
        {
            ProjectId = projectId.ToString(),
            TaskId = string.Empty,
            Action = "MemberAdded",
            PerformedById = requesterId,
            NewState = $"{user.DisplayName} ({user.Email}) jako {role}",
        }, ct);
        return AddMemberResult.Success;
    }

    public async Task<IReadOnlyList<ProjectMemberDto>> ListMembersAsync(Guid projectId, Guid requesterId, CancellationToken ct = default)
    {
        // Sprawdzenie dostepu - czlonek (lub owner) moze widziec liste
        var project = await _projects.GetByIdAsync(projectId, ct);
        if (project is null) return Array.Empty<ProjectMemberDto>();
        if (project.OwnerId != requesterId && !project.Members.Any(m => m.UserId == requesterId))
            return Array.Empty<ProjectMemberDto>();

        var members = await _projects.ListMembersWithUserAsync(projectId, ct);
        var result = new List<ProjectMemberDto>();

        // Owner moze nie miec wpisu w ProjectMembers (legacy lub edge case) - dodajemy go zawsze syntetycznie
        var owner = await _users.GetByIdAsync(project.OwnerId, ct);
        if (owner is not null && members.All(m => m.UserId != owner.Id))
        {
            result.Add(new ProjectMemberDto(owner.Id, owner.Email, owner.DisplayName, ProjectRole.Owner, project.CreatedAt, true));
        }

        foreach (var m in members)
        {
            if (m.User is null) continue;
            result.Add(new ProjectMemberDto(m.UserId, m.User.Email, m.User.DisplayName, m.Role, m.JoinedAt, m.UserId == project.OwnerId));
        }
        return result.OrderByDescending(m => m.IsOwner).ThenBy(m => m.JoinedAt).ToList();
    }

    public async Task<MemberOpResult> UpdateMemberRoleAsync(Guid projectId, Guid memberUserId, ProjectRole newRole, Guid requesterId, CancellationToken ct = default)
    {
        var project = await _projects.GetByIdAsync(projectId, ct);
        if (project is null) return MemberOpResult.ProjectNotFound;
        if (project.OwnerId != requesterId) return MemberOpResult.NotOwner;
        if (project.OwnerId == memberUserId) return MemberOpResult.CannotModifyOwner;

        var member = await _projects.GetMemberAsync(projectId, memberUserId, ct);
        if (member is null) return MemberOpResult.MemberNotFound;

        var oldRole = member.Role;
        member.Role = newRole;
        await _projects.UpdateMemberAsync(member, ct);

        await _audit.AddEntryAsync(new AuditEntry
        {
            ProjectId = projectId.ToString(),
            TaskId = string.Empty,
            Action = "MemberRoleChanged",
            PerformedById = requesterId,
            PreviousState = $"{member.User?.DisplayName ?? memberUserId.ToString()}: {oldRole}",
            NewState = $"{member.User?.DisplayName ?? memberUserId.ToString()}: {newRole}",
        }, ct);
        return MemberOpResult.Success;
    }

    public async Task<MemberOpResult> RemoveMemberAsync(Guid projectId, Guid memberUserId, Guid requesterId, CancellationToken ct = default)
    {
        var project = await _projects.GetByIdAsync(projectId, ct);
        if (project is null) return MemberOpResult.ProjectNotFound;
        if (project.OwnerId != requesterId) return MemberOpResult.NotOwner;
        if (project.OwnerId == memberUserId) return MemberOpResult.CannotModifyOwner;

        var member = await _projects.GetMemberAsync(projectId, memberUserId, ct);
        if (member is null) return MemberOpResult.MemberNotFound;
        var memberName = member.User?.DisplayName ?? memberUserId.ToString();

        await _projects.RemoveMemberAsync(projectId, memberUserId, ct);

        await _audit.AddEntryAsync(new AuditEntry
        {
            ProjectId = projectId.ToString(),
            TaskId = string.Empty,
            Action = "MemberRemoved",
            PerformedById = requesterId,
            PreviousState = $"{memberName} ({member.Role})",
        }, ct);
        return MemberOpResult.Success;
    }

    public async Task<IReadOnlyList<AuditEntryDto>> ListMemberAuditInProjectAsync(Guid projectId, Guid memberUserId, Guid requesterId, CancellationToken ct = default)
    {
        var project = await _projects.GetByIdAsync(projectId, ct);
        if (project is null) return Array.Empty<AuditEntryDto>();
        if (project.OwnerId != requesterId && !project.Members.Any(m => m.UserId == requesterId))
            return Array.Empty<AuditEntryDto>();

        var entries = await _audit.ListByUserInProjectAsync(projectId, memberUserId, 100, ct);
        var user = await _users.GetByIdAsync(memberUserId, ct);
        var name = user?.DisplayName;
        var email = user?.Email;

        return entries.Select(e => new AuditEntryDto(e.Id, e.Action, e.PerformedById, name, email, e.Timestamp, e.PreviousState, e.NewState)).ToList();
    }
}

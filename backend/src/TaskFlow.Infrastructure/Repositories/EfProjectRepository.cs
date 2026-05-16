using Microsoft.EntityFrameworkCore;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Repositories;
using TaskFlow.Infrastructure.Persistence;

namespace TaskFlow.Infrastructure.Repositories;

public class EfProjectRepository : IProjectRepository
{
    private readonly TaskFlowDbContext _db;

    public EfProjectRepository(TaskFlowDbContext db) => _db = db;

    public Task<Project?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _db.Projects
            .Include(p => p.Members)
            .Include(p => p.Tasks)                                              // bez tego ProjectDto.TaskCount = 0
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<IReadOnlyList<Project>> ListByUserAsync(Guid userId, CancellationToken ct = default)
        => await _db.Projects
            .Include(p => p.Members)                                            // bez tego ProjectDto.MemberCount = 0
            .Include(p => p.Tasks)                                              // bez tego ProjectDto.TaskCount = 0
            .Where(p => p.OwnerId == userId || p.Members.Any(m => m.UserId == userId))
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);

    public async Task AddAsync(Project project, CancellationToken ct = default)
    {
        _db.Projects.Add(project);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Project project, CancellationToken ct = default)
    {
        _db.Projects.Update(project);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var p = await _db.Projects.FindAsync(new object[] { id }, ct);
        if (p is null) return;
        _db.Projects.Remove(p);
        await _db.SaveChangesAsync(ct);
    }

    public Task<bool> IsMemberAsync(Guid projectId, Guid userId, CancellationToken ct = default)
        // Owner ZAWSZE jest member (nawet jesli ProjectMember row brakuje z legacy danych).
        // Czystsza semantyka: "owner ma pelne uprawnienia bez wymogu osobnego wpisu w ProjectMembers".
        => _db.Projects.AnyAsync(p =>
            p.Id == projectId &&
            (p.OwnerId == userId || p.Members.Any(m => m.UserId == userId)), ct);

    public async Task<IReadOnlyList<ProjectMember>> ListMembersWithUserAsync(Guid projectId, CancellationToken ct = default)
        => await _db.ProjectMembers.AsNoTracking()
            .Include(m => m.User)
            .Where(m => m.ProjectId == projectId)
            .OrderBy(m => m.JoinedAt)
            .ToListAsync(ct);

    public Task<ProjectMember?> GetMemberAsync(Guid projectId, Guid userId, CancellationToken ct = default)
        => _db.ProjectMembers
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId, ct);

    public async Task UpdateMemberAsync(ProjectMember member, CancellationToken ct = default)
    {
        _db.ProjectMembers.Update(member);
        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveMemberAsync(Guid projectId, Guid userId, CancellationToken ct = default)
    {
        var m = await _db.ProjectMembers.FirstOrDefaultAsync(x => x.ProjectId == projectId && x.UserId == userId, ct);
        if (m is null) return;
        _db.ProjectMembers.Remove(m);
        await _db.SaveChangesAsync(ct);
    }
}

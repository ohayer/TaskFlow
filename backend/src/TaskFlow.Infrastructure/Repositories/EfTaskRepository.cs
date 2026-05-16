using Microsoft.EntityFrameworkCore;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Repositories;
using TaskFlow.Infrastructure.Persistence;

namespace TaskFlow.Infrastructure.Repositories;

public class EfTaskRepository : ITaskRepository
{
    private readonly TaskFlowDbContext _db;

    public EfTaskRepository(TaskFlowDbContext db) => _db = db;

    public Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _db.Tasks.Include(t => t.Attachments).FirstOrDefaultAsync(t => t.Id == id, ct);

    public async Task<IReadOnlyList<TaskItem>> ListByProjectAsync(Guid projectId, TaskItemStatus? statusFilter = null, CancellationToken ct = default)
    {
        var q = _db.Tasks.AsNoTracking().Where(t => t.ProjectId == projectId);
        if (statusFilter.HasValue) q = q.Where(t => t.Status == statusFilter.Value);
        return await q.OrderByDescending(t => t.CreatedAt).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<TaskItem>> ListByAssigneeAsync(Guid assigneeId, CancellationToken ct = default)
        => await _db.Tasks.AsNoTracking()
            .Where(t => t.AssigneeId == assigneeId && t.Status != TaskItemStatus.Done && t.Status != TaskItemStatus.Cancelled)
            .OrderBy(t => t.DueDate ?? DateTime.MaxValue)
            .ToListAsync(ct);

    public async Task AddAsync(TaskItem task, CancellationToken ct = default)
    {
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(TaskItem task, CancellationToken ct = default)
    {
        task.UpdatedAt = DateTime.UtcNow;
        _db.Tasks.Update(task);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var t = await _db.Tasks.FindAsync(new object[] { id }, ct);
        if (t is null) return;
        _db.Tasks.Remove(t);
        await _db.SaveChangesAsync(ct);
    }

    public async Task AddAttachmentAsync(Attachment attachment, CancellationToken ct = default)
    {
        _db.Attachments.Add(attachment);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<Attachment>> ListAttachmentsAsync(Guid taskId, CancellationToken ct = default)
        => await _db.Attachments.AsNoTracking()
            .Where(a => a.TaskId == taskId)
            .OrderByDescending(a => a.UploadedAt)
            .ToListAsync(ct);

    public Task<Attachment?> GetAttachmentByIdAsync(Guid attachmentId, CancellationToken ct = default)
        => _db.Attachments.FirstOrDefaultAsync(a => a.Id == attachmentId, ct);

    public async Task DeleteAttachmentAsync(Guid attachmentId, CancellationToken ct = default)
    {
        var a = await _db.Attachments.FindAsync(new object[] { attachmentId }, ct);
        if (a is null) return;
        _db.Attachments.Remove(a);
        await _db.SaveChangesAsync(ct);
    }
}

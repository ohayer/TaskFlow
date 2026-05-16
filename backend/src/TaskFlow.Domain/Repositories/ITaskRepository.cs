using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Repositories;

public interface ITaskRepository
{
    Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<TaskItem>> ListByProjectAsync(Guid projectId, TaskItemStatus? statusFilter = null, CancellationToken ct = default);
    Task<IReadOnlyList<TaskItem>> ListByAssigneeAsync(Guid assigneeId, CancellationToken ct = default);
    Task AddAsync(TaskItem task, CancellationToken ct = default);
    Task UpdateAsync(TaskItem task, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task AddAttachmentAsync(Attachment attachment, CancellationToken ct = default);
    Task<IReadOnlyList<Attachment>> ListAttachmentsAsync(Guid taskId, CancellationToken ct = default);
    Task<Attachment?> GetAttachmentByIdAsync(Guid attachmentId, CancellationToken ct = default);
    Task DeleteAttachmentAsync(Guid attachmentId, CancellationToken ct = default);
}

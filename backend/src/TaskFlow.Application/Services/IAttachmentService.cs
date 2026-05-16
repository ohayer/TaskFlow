using TaskFlow.Application.Dtos;

namespace TaskFlow.Application.Services;

public interface IAttachmentService
{
    Task<AttachmentDto?> UploadAsync(Guid taskId, Stream content, string fileName, string mimeType, Guid uploaderId, CancellationToken ct = default);
    Task<IReadOnlyList<AttachmentDto>> ListByTaskAsync(Guid taskId, Guid requesterId, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid taskId, Guid attachmentId, Guid requesterId, CancellationToken ct = default);
    Task<IReadOnlyList<AuditEntryDto>> ListAuditByTaskAsync(Guid taskId, Guid requesterId, CancellationToken ct = default);
}

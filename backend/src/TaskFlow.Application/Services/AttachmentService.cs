using System.Text.Json;
using Microsoft.Extensions.Logging;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Dtos;
using TaskFlow.Domain.Attachments;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.Application.Services;

public class AttachmentService : IAttachmentService
{
    private readonly ITaskRepository _tasks;
    private readonly IProjectRepository _projects;
    private readonly IUserRepository _users;
    private readonly IAuditRepository _audit;
    private readonly IAttachmentBlobStorage _blobs;
    private readonly IEnumerable<IAttachmentProcessor> _processors;
    private readonly ILogger<AttachmentService> _logger;

    public AttachmentService(
        ITaskRepository tasks,
        IProjectRepository projects,
        IUserRepository users,
        IAuditRepository audit,
        IAttachmentBlobStorage blobs,
        IEnumerable<IAttachmentProcessor> processors,
        ILogger<AttachmentService> logger)
    {
        _tasks = tasks;
        _projects = projects;
        _users = users;
        _audit = audit;
        _blobs = blobs;
        _processors = processors;
        _logger = logger;
    }

    public async Task<AttachmentDto?> UploadAsync(Guid taskId, Stream content, string fileName, string mimeType, Guid uploaderId, CancellationToken ct = default)
    {
        var task = await _tasks.GetByIdAsync(taskId, ct);
        if (task is null) return null;
        if (!await _projects.IsMemberAsync(task.ProjectId, uploaderId, ct)) return null;

        // Buforuj stream zeby przeczytac dwa razy: do uploadu blob i do procesora (AI Vision)
        using var ms = new MemoryStream();
        await content.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();

        // Upload oryginalu
        var blobUrl = await _blobs.UploadAsync(fileName, mimeType, new MemoryStream(bytes), ct);

        // Wybor procesora (Strategy Pattern) i wykonanie - tagowanie + thumbnail
        var processor = _processors.FirstOrDefault(p => p.CanProcess(mimeType)) ?? _processors.Last();
        var processingResult = await processor.ProcessAsync(new MemoryStream(bytes), fileName, mimeType, ct);

        var attachment = new Attachment
        {
            TaskId = taskId,
            FileName = fileName,
            MimeType = mimeType,
            SizeBytes = bytes.LongLength,
            BlobUrl = blobUrl,
            ThumbnailUrl = processingResult.ThumbnailUrl,
            AiTagsJson = processingResult.AiTagsJson,
            UploadedById = uploaderId,
        };
        await _tasks.AddAttachmentAsync(attachment, ct);

        await _audit.AddEntryAsync(new AuditEntry
        {
            ProjectId = task.ProjectId.ToString(),
            TaskId = task.Id.ToString(),
            Action = "AttachmentUploaded",
            PerformedById = uploaderId,
            NewState = $"{fileName} ({bytes.Length / 1024.0:F1} KB)",
        }, ct);

        _logger.LogInformation("Uploaded {File} ({Bytes}B) for task {TaskId}", fileName, bytes.Length, taskId);
        return ToDto(attachment);
    }

    public async Task<IReadOnlyList<AttachmentDto>> ListByTaskAsync(Guid taskId, Guid requesterId, CancellationToken ct = default)
    {
        var task = await _tasks.GetByIdAsync(taskId, ct);
        if (task is null) return Array.Empty<AttachmentDto>();
        if (!await _projects.IsMemberAsync(task.ProjectId, requesterId, ct)) return Array.Empty<AttachmentDto>();

        var atts = await _tasks.ListAttachmentsAsync(taskId, ct);
        return atts.Select(ToDto).ToList();
    }

    public async Task<bool> DeleteAsync(Guid taskId, Guid attachmentId, Guid requesterId, CancellationToken ct = default)
    {
        var task = await _tasks.GetByIdAsync(taskId, ct);
        if (task is null) return false;
        if (!await _projects.IsMemberAsync(task.ProjectId, requesterId, ct)) return false;

        var attachment = await _tasks.GetAttachmentByIdAsync(attachmentId, ct);
        if (attachment is null || attachment.TaskId != taskId) return false;

        // Usun blob (oryginal) + thumbnail z Azure Storage
        try { await _blobs.DeleteByUrlAsync(attachment.BlobUrl, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Blob delete failed for {Url}", attachment.BlobUrl); }
        if (!string.IsNullOrEmpty(attachment.ThumbnailUrl))
        {
            try { await _blobs.DeleteByUrlAsync(attachment.ThumbnailUrl, ct); }
            catch (Exception ex) { _logger.LogWarning(ex, "Thumb delete failed for {Url}", attachment.ThumbnailUrl); }
        }

        await _tasks.DeleteAttachmentAsync(attachmentId, ct);

        await _audit.AddEntryAsync(new AuditEntry
        {
            ProjectId = task.ProjectId.ToString(),
            TaskId = task.Id.ToString(),
            Action = "AttachmentDeleted",
            PerformedById = requesterId,
            PreviousState = attachment.FileName,
        }, ct);

        _logger.LogInformation("Deleted attachment {Id} ({File}) from task {TaskId}", attachmentId, attachment.FileName, taskId);
        return true;
    }

    public async Task<IReadOnlyList<AuditEntryDto>> ListAuditByTaskAsync(Guid taskId, Guid requesterId, CancellationToken ct = default)
    {
        var task = await _tasks.GetByIdAsync(taskId, ct);
        if (task is null) return Array.Empty<AuditEntryDto>();
        if (!await _projects.IsMemberAsync(task.ProjectId, requesterId, ct)) return Array.Empty<AuditEntryDto>();

        var entries = await _audit.ListByTaskAsync(task.ProjectId, taskId, 50, ct);

        // Batch lookup user names - audit log w Cosmos przechowuje tylko UserId, dohydratujemy DisplayName/Email z SQL
        var userIds = entries.Select(e => e.PerformedById).Distinct().ToList();
        var users = new Dictionary<Guid, (string? Name, string? Email)>();
        foreach (var id in userIds)
        {
            var u = await _users.GetByIdAsync(id, ct);
            if (u is not null) users[id] = (u.DisplayName, u.Email);
        }

        return entries.Select(e =>
        {
            users.TryGetValue(e.PerformedById, out var info);
            return new AuditEntryDto(e.Id, e.Action, e.PerformedById, info.Name, info.Email, e.Timestamp, e.PreviousState, e.NewState);
        }).ToList();
    }

    private AttachmentDto ToDto(Attachment a)
    {
        var tags = Array.Empty<string>().AsEnumerable();
        string? caption = null;
        if (!string.IsNullOrEmpty(a.AiTagsJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(a.AiTagsJson);
                if (doc.RootElement.TryGetProperty("tags", out var t) && t.ValueKind == JsonValueKind.Array)
                    tags = t.EnumerateArray().Select(x => x.GetString() ?? "").Where(s => s.Length > 0).ToList();
                if (doc.RootElement.TryGetProperty("caption", out var c) && c.ValueKind == JsonValueKind.String)
                    caption = c.GetString();
            }
            catch { /* ignore malformed JSON */ }
        }

        // Generuj time-limited SAS URL (1h read-only) zamiast direct blob URL - container 'attachments' jest private
        var downloadUrl = _blobs.GenerateReadSasUrl(a.BlobUrl, TimeSpan.FromHours(1));

        return new AttachmentDto(a.Id, a.TaskId, a.FileName, a.MimeType, a.SizeBytes, downloadUrl, a.ThumbnailUrl, tags.ToList(), caption, a.UploadedAt);
    }
}

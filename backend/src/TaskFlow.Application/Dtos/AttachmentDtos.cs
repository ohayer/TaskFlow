namespace TaskFlow.Application.Dtos;

public record AttachmentDto(
    Guid Id,
    Guid TaskId,
    string FileName,
    string MimeType,
    long SizeBytes,
    string DownloadUrl,
    string? ThumbnailUrl,
    IReadOnlyList<string> AiTags,
    string? AiCaption,
    DateTime UploadedAt);

public record AuditEntryDto(
    string Id,
    string Action,
    Guid PerformedById,
    string? PerformedByName,
    string? PerformedByEmail,
    DateTime Timestamp,
    string? PreviousState,
    string? NewState);

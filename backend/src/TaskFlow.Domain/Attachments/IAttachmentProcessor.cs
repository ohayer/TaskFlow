namespace TaskFlow.Domain.Attachments;

public record AttachmentProcessingResult(
    bool Success,
    string? ThumbnailUrl,
    string? ErrorMessage = null,
    string? AiTagsJson = null                                                  // JSON z tagami z Azure AI Vision (opcjonalnie, tylko obrazy)
);

public interface IAttachmentProcessor
{
    bool CanProcess(string mimeType);
    Task<AttachmentProcessingResult> ProcessAsync(Stream sourceStream, string fileName, string mimeType, CancellationToken ct = default);
}

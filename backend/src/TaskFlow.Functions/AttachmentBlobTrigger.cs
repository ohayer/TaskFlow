using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using TaskFlow.Application.Abstractions;
using TaskFlow.Domain.Attachments;

namespace TaskFlow.Functions;

// BlobTrigger: po wrzuceniu pliku do containera 'attachments' uruchamia processory (Strategy Pattern)
// i zapisuje thumbnail/preview do containera 'thumbnails'.
public class AttachmentBlobTrigger
{
    private readonly IEnumerable<IAttachmentProcessor> _processors;
    private readonly IAttachmentBlobStorage _storage;
    private readonly ILogger<AttachmentBlobTrigger> _logger;

    public AttachmentBlobTrigger(
        IEnumerable<IAttachmentProcessor> processors,
        IAttachmentBlobStorage storage,
        ILogger<AttachmentBlobTrigger> logger)
    {
        _processors = processors;
        _storage = storage;
        _logger = logger;
    }

    [Function(nameof(AttachmentBlobTrigger))]
    public async Task Run(
        [BlobTrigger("attachments/{name}", Connection = "ConnectionStrings:Storage")] Stream blobStream,
        string name,
        FunctionContext context)
    {
        _logger.LogInformation("Blob trigger: processing {Name}", name);

        var mimeType = GuessMimeType(name);
        var processor = _processors.FirstOrDefault(p => p.CanProcess(mimeType))
            ?? _processors.Last();                                              // GenericFileProcessor jako fallback

        var result = await processor.ProcessAsync(blobStream, name, mimeType, context.CancellationToken);
        if (!result.Success)
        {
            _logger.LogWarning("Processing failed for {Name}: {Error}", name, result.ErrorMessage);
            return;
        }

        _logger.LogInformation("Processed {Name}, thumbnail: {Thumb}", name, result.ThumbnailUrl ?? "(none)");
    }

    private static string GuessMimeType(string fileName) =>
        Path.GetExtension(fileName).ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };
}

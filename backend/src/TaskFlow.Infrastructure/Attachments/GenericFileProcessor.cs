using Microsoft.Extensions.Logging;
using TaskFlow.Domain.Attachments;

namespace TaskFlow.Infrastructure.Attachments;

public class GenericFileProcessor : IAttachmentProcessor
{
    private readonly ILogger<GenericFileProcessor> _logger;

    public GenericFileProcessor(ILogger<GenericFileProcessor> logger) => _logger = logger;

    public bool CanProcess(string mimeType) => true;                         // fallback - akceptuje wszystko

    public Task<AttachmentProcessingResult> ProcessAsync(Stream sourceStream, string fileName, string mimeType, CancellationToken ct = default)
    {
        _logger.LogInformation("Generic processor handling {File} ({Mime}) — no thumbnail generated", fileName, mimeType);
        return Task.FromResult(new AttachmentProcessingResult(true, ThumbnailUrl: null));
    }
}

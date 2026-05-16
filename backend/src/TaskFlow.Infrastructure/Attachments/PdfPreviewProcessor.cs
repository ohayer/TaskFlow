using Microsoft.Extensions.Logging;
using TaskFlow.Domain.Attachments;

namespace TaskFlow.Infrastructure.Attachments;

public class PdfPreviewProcessor : IAttachmentProcessor
{
    private readonly ILogger<PdfPreviewProcessor> _logger;

    public PdfPreviewProcessor(ILogger<PdfPreviewProcessor> logger) => _logger = logger;

    public bool CanProcess(string mimeType) => string.Equals(mimeType, "application/pdf", StringComparison.OrdinalIgnoreCase);

    public Task<AttachmentProcessingResult> ProcessAsync(Stream sourceStream, string fileName, string mimeType, CancellationToken ct = default)
    {
        _logger.LogInformation("PDF processor handling {File}", fileName);
        // TODO: integracja z PdfPig lub iTextSharp do extract pierwszej strony
        var thumbnailUrl = $"thumbnails/{Path.GetFileNameWithoutExtension(fileName)}_preview.png";
        return Task.FromResult(new AttachmentProcessingResult(true, thumbnailUrl));
    }
}

using System.Text.Json;
using Microsoft.Extensions.Logging;
using TaskFlow.Application.Abstractions;
using TaskFlow.Domain.Attachments;

namespace TaskFlow.Infrastructure.Attachments;

public class ImageThumbnailProcessor : IAttachmentProcessor
{
    private static readonly string[] SupportedTypes = { "image/jpeg", "image/png", "image/gif", "image/webp" };
    private readonly ILogger<ImageThumbnailProcessor> _logger;
    private readonly IImageAnalyzer _analyzer;
    private readonly IAttachmentBlobStorage _blobs;

    public ImageThumbnailProcessor(IImageAnalyzer analyzer, IAttachmentBlobStorage blobs, ILogger<ImageThumbnailProcessor> logger)
    {
        _analyzer = analyzer;
        _blobs = blobs;
        _logger = logger;
    }

    public bool CanProcess(string mimeType) => SupportedTypes.Contains(mimeType, StringComparer.OrdinalIgnoreCase);

    public async Task<AttachmentProcessingResult> ProcessAsync(Stream sourceStream, string fileName, string mimeType, CancellationToken ct = default)
    {
        _logger.LogInformation("Image processor handling {File} ({Mime})", fileName, mimeType);

        // Buforowanie - analiza, thumbnail upload czytaja ten sam strumien dwa razy
        var ms = new MemoryStream();
        await sourceStream.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();

        // Azure AI Vision: tagi + caption
        ms.Position = 0;
        var analysis = await _analyzer.AnalyzeAsync(ms, ct);

        // Upload thumbnail do public containera (TODO future: SkiaSharp resize 200x200)
        string? thumbnailUrl = null;
        try
        {
            using var copy = new MemoryStream(bytes);
            thumbnailUrl = await _blobs.UploadThumbnailAsync(fileName, mimeType, copy, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Thumbnail upload failed for {File}", fileName);
        }

        var tagsJson = analysis is not null
            ? JsonSerializer.Serialize(new { tags = analysis.Tags, caption = analysis.Caption })
            : null;

        return new AttachmentProcessingResult(true, thumbnailUrl, AiTagsJson: tagsJson);
    }
}

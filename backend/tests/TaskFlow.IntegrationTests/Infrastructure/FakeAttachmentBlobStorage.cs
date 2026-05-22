using System.Collections.Concurrent;
using TaskFlow.Application.Abstractions;

namespace TaskFlow.IntegrationTests.Infrastructure;

public class FakeAttachmentBlobStorage : IAttachmentBlobStorage
{
    private readonly ConcurrentDictionary<string, byte[]> _blobs = new();

    public async Task<string> UploadAsync(string fileName, string mimeType, Stream content, CancellationToken ct = default)
    {
        using var ms = new MemoryStream();
        await content.CopyToAsync(ms, ct);
        var key = $"fake://attachments/{Guid.NewGuid():N}-{fileName}";
        _blobs[key] = ms.ToArray();
        return key;
    }

    public Task<Stream> DownloadAsync(string blobName, CancellationToken ct = default)
    {
        var bytes = _blobs.TryGetValue(blobName, out var b) ? b : Array.Empty<byte>();
        return Task.FromResult<Stream>(new MemoryStream(bytes));
    }

    public Task DeleteByUrlAsync(string blobUrl, CancellationToken ct = default)
    {
        _blobs.TryRemove(blobUrl, out _);
        return Task.CompletedTask;
    }

    public async Task<string> UploadThumbnailAsync(string fileName, string mimeType, Stream content, CancellationToken ct = default)
        => await UploadAsync($"thumb-{fileName}", mimeType, content, ct);

    public string GenerateReadSasUrl(string blobUrl, TimeSpan validFor) => blobUrl + "?sas=fake";
}

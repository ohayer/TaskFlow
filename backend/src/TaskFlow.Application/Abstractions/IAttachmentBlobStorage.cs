namespace TaskFlow.Application.Abstractions;

public interface IAttachmentBlobStorage
{
    Task<string> UploadAsync(string fileName, string mimeType, Stream content, CancellationToken ct = default);
    Task<Stream> DownloadAsync(string blobName, CancellationToken ct = default);
    Task DeleteByUrlAsync(string blobUrl, CancellationToken ct = default);
    Task<string> UploadThumbnailAsync(string fileName, string mimeType, Stream content, CancellationToken ct = default);
    string GenerateReadSasUrl(string blobUrl, TimeSpan validFor);
}

using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using TaskFlow.Application.Abstractions;

namespace TaskFlow.Infrastructure.Storage;

public class AttachmentBlobStorage : IAttachmentBlobStorage
{
    private readonly BlobServiceClient _service;
    private readonly BlobContainerClient _attachments;
    private readonly BlobContainerClient _thumbnails;

    public AttachmentBlobStorage(BlobServiceClient blobService)
    {
        _service = blobService;
        _attachments = blobService.GetBlobContainerClient("attachments");
        _thumbnails = blobService.GetBlobContainerClient("thumbnails");
    }

    public async Task<string> UploadAsync(string fileName, string mimeType, Stream content, CancellationToken ct = default)
    {
        var blobName = $"{Guid.NewGuid():N}/{fileName}";
        var blob = _attachments.GetBlobClient(blobName);
        await blob.UploadAsync(content, new BlobHttpHeaders { ContentType = mimeType }, cancellationToken: ct);
        return blob.Uri.ToString();
    }

    public async Task<Stream> DownloadAsync(string blobName, CancellationToken ct = default)
    {
        var blob = _attachments.GetBlobClient(blobName);
        var response = await blob.DownloadStreamingAsync(cancellationToken: ct);
        return response.Value.Content;
    }

    public async Task DeleteByUrlAsync(string blobUrl, CancellationToken ct = default)
    {
        // URL format: https://account.blob.core.windows.net/{container}/{blobName...}
        var uri = new Uri(blobUrl);
        var segments = uri.AbsolutePath.TrimStart('/').Split('/', 2);
        if (segments.Length < 2) return;
        var containerName = segments[0];
        var blobName = Uri.UnescapeDataString(segments[1]);
        var container = _service.GetBlobContainerClient(containerName);
        await container.GetBlobClient(blobName).DeleteIfExistsAsync(cancellationToken: ct);
    }

    public async Task<string> UploadThumbnailAsync(string fileName, string mimeType, Stream content, CancellationToken ct = default)
    {
        // Public thumbnail container - prosta kopia oryginalu (TODO: resize przez SkiaSharp/ImageSharp)
        var blobName = $"{Guid.NewGuid():N}/{fileName}";
        var blob = _thumbnails.GetBlobClient(blobName);
        await blob.UploadAsync(content, new BlobHttpHeaders { ContentType = mimeType }, cancellationToken: ct);
        return blob.Uri.ToString();
    }

    public string GenerateReadSasUrl(string blobUrl, TimeSpan validFor)
    {
        // Generuje time-limited SAS URL (Read-only) dla prywatnego bloba.
        var uri = new Uri(blobUrl);
        var segments = uri.AbsolutePath.TrimStart('/').Split('/', 2);
        if (segments.Length < 2) return blobUrl;                                // zostaw oryginal jesli niepoprawny URL
        var containerName = segments[0];
        var blobName = Uri.UnescapeDataString(segments[1]);

        var blobClient = _service.GetBlobContainerClient(containerName).GetBlobClient(blobName);
        if (!blobClient.CanGenerateSasUri) return blobUrl;                      // brak permisji do SAS (np. anon credential)

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = containerName,
            BlobName = blobName,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(validFor),
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        return blobClient.GenerateSasUri(sasBuilder).ToString();
    }
}

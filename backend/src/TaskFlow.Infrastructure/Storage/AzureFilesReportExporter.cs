using Azure.Storage.Files.Shares;
using Azure.Storage.Files.Shares.Models;
using Microsoft.Extensions.Logging;
using TaskFlow.Application.Abstractions;

namespace TaskFlow.Infrastructure.Storage;

public class AzureFilesReportExporter : IReportExporter
{
    private const string ShareName = "exports";
    private readonly ShareClient _share;
    private readonly ILogger<AzureFilesReportExporter> _logger;

    public AzureFilesReportExporter(ShareServiceClient shareService, ILogger<AzureFilesReportExporter> logger)
    {
        _share = shareService.GetShareClient(ShareName);
        _logger = logger;
    }

    private static string SafeFolderName(Guid projectId) => $"project-{projectId:N}";
    private static string GenerateFileName(string projectName, string ext)
    {
        var safe = string.Join("_", projectName.Split(Path.GetInvalidFileNameChars()));
        return $"{safe}_{DateTime.UtcNow:yyyyMMdd-HHmmss}.{ext}";
    }

    public async Task<ExportedReport> ExportProjectAsync(Guid projectId, string projectName, byte[] csvBytes, CancellationToken ct = default)
    {
        await _share.CreateIfNotExistsAsync(cancellationToken: ct);
        var folder = _share.GetDirectoryClient(SafeFolderName(projectId));
        await folder.CreateIfNotExistsAsync(cancellationToken: ct);

        var fileName = GenerateFileName(projectName, "csv");
        var file = folder.GetFileClient(fileName);

        using var ms = new MemoryStream(csvBytes);
        await file.CreateAsync(csvBytes.Length, cancellationToken: ct);
        await file.UploadAsync(ms, cancellationToken: ct);

        _logger.LogInformation("Exported {Bytes} bytes to {Url}", csvBytes.Length, file.Uri);
        return new ExportedReport(fileName, file.Uri.ToString(), csvBytes.Length, DateTime.UtcNow);
    }

    public async Task<IReadOnlyList<ExportedReport>> ListAsync(Guid projectId, CancellationToken ct = default)
    {
        await _share.CreateIfNotExistsAsync(cancellationToken: ct);
        var folder = _share.GetDirectoryClient(SafeFolderName(projectId));
        if (!await folder.ExistsAsync(ct)) return Array.Empty<ExportedReport>();

        var results = new List<ExportedReport>();
        await foreach (ShareFileItem item in folder.GetFilesAndDirectoriesAsync(cancellationToken: ct))
        {
            if (item.IsDirectory) continue;
            var f = folder.GetFileClient(item.Name);
            var props = await f.GetPropertiesAsync(cancellationToken: ct);
            results.Add(new ExportedReport(item.Name, f.Uri.ToString(), props.Value.ContentLength, props.Value.LastModified.UtcDateTime));
        }
        return results.OrderByDescending(r => r.CreatedAt).ToList();
    }

    public async Task<Stream?> DownloadAsync(string fileName, CancellationToken ct = default)
    {
        // Skanuje wszystkie foldery projektow zeby znalezc plik (uproszczenie - w prod warto trzymac mapping)
        await foreach (var dir in _share.GetRootDirectoryClient().GetFilesAndDirectoriesAsync(cancellationToken: ct))
        {
            if (!dir.IsDirectory) continue;
            var folder = _share.GetDirectoryClient(dir.Name);
            var file = folder.GetFileClient(fileName);
            if (await file.ExistsAsync(ct))
            {
                var resp = await file.DownloadAsync(cancellationToken: ct);
                return resp.Value.Content;
            }
        }
        return null;
    }
}

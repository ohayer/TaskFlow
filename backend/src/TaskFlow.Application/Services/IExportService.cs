using TaskFlow.Application.Abstractions;

namespace TaskFlow.Application.Services;

public interface IExportService
{
    Task<ExportedReport?> ExportProjectTasksToCsvAsync(Guid projectId, Guid requesterId, CancellationToken ct = default);
    Task<IReadOnlyList<ExportedReport>> ListExportsAsync(Guid projectId, Guid requesterId, CancellationToken ct = default);
    Task<Stream?> DownloadExportAsync(string fileName, Guid projectId, Guid requesterId, CancellationToken ct = default);
}

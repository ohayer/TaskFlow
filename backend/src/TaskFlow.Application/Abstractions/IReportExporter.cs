namespace TaskFlow.Application.Abstractions;

public record ExportedReport(string FileName, string Url, long SizeBytes, DateTime CreatedAt);

public interface IReportExporter
{
    Task<ExportedReport> ExportProjectAsync(Guid projectId, string projectName, byte[] csvBytes, CancellationToken ct = default);
    Task<IReadOnlyList<ExportedReport>> ListAsync(Guid projectId, CancellationToken ct = default);
    Task<Stream?> DownloadAsync(string fileName, CancellationToken ct = default);
}

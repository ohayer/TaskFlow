using System.Collections.Concurrent;
using TaskFlow.Application.Abstractions;

namespace TaskFlow.IntegrationTests.Infrastructure;

public class FakeReportExporter : IReportExporter
{
    private readonly ConcurrentDictionary<string, (ExportedReport meta, byte[] bytes)> _store = new();

    public Task<ExportedReport> ExportProjectAsync(Guid projectId, string projectName, byte[] csvBytes, CancellationToken ct = default)
    {
        var fileName = $"export-{projectId:N}-{DateTime.UtcNow.Ticks}.csv";
        var report = new ExportedReport(fileName, $"fake://exports/{fileName}", csvBytes.LongLength, DateTime.UtcNow);
        _store[fileName] = (report, csvBytes);
        return Task.FromResult(report);
    }

    public Task<IReadOnlyList<ExportedReport>> ListAsync(Guid projectId, CancellationToken ct = default)
    {
        IReadOnlyList<ExportedReport> list = _store.Values
            .Select(v => v.meta)
            .Where(m => m.FileName.Contains(projectId.ToString("N")))
            .ToList();
        return Task.FromResult(list);
    }

    public Task<Stream?> DownloadAsync(string fileName, CancellationToken ct = default)
    {
        if (_store.TryGetValue(fileName, out var entry))
            return Task.FromResult<Stream?>(new MemoryStream(entry.bytes));
        return Task.FromResult<Stream?>(null);
    }
}

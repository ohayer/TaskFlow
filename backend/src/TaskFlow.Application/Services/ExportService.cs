using System.Globalization;
using System.Text;
using TaskFlow.Application.Abstractions;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.Application.Services;

public class ExportService : IExportService
{
    private readonly IProjectRepository _projects;
    private readonly ITaskRepository _tasks;
    private readonly IReportExporter _exporter;

    public ExportService(IProjectRepository projects, ITaskRepository tasks, IReportExporter exporter)
    {
        _projects = projects;
        _tasks = tasks;
        _exporter = exporter;
    }

    public async Task<ExportedReport?> ExportProjectTasksToCsvAsync(Guid projectId, Guid requesterId, CancellationToken ct = default)
    {
        var project = await _projects.GetByIdAsync(projectId, ct);
        if (project is null) return null;
        if (project.OwnerId != requesterId && !project.Members.Any(m => m.UserId == requesterId)) return null;

        var tasks = await _tasks.ListByProjectAsync(projectId, null, ct);
        var csv = BuildCsv(tasks);
        return await _exporter.ExportProjectAsync(projectId, project.Name, csv, ct);
    }

    public async Task<IReadOnlyList<ExportedReport>> ListExportsAsync(Guid projectId, Guid requesterId, CancellationToken ct = default)
    {
        var project = await _projects.GetByIdAsync(projectId, ct);
        if (project is null) return Array.Empty<ExportedReport>();
        if (project.OwnerId != requesterId && !project.Members.Any(m => m.UserId == requesterId)) return Array.Empty<ExportedReport>();
        return await _exporter.ListAsync(projectId, ct);
    }

    public async Task<Stream?> DownloadExportAsync(string fileName, Guid projectId, Guid requesterId, CancellationToken ct = default)
    {
        var project = await _projects.GetByIdAsync(projectId, ct);
        if (project is null) return null;
        if (project.OwnerId != requesterId && !project.Members.Any(m => m.UserId == requesterId)) return null;
        return await _exporter.DownloadAsync(fileName, ct);
    }

    private static byte[] BuildCsv(IReadOnlyList<Domain.Entities.TaskItem> tasks)
    {
        var rows = new string[tasks.Count];
        // Wielowątkowość — równoległe formatowanie wierszy CSV
        Parallel.For(0, tasks.Count, i => rows[i] = FormatCsvRow(tasks[i]));

        var sb = new StringBuilder();
        sb.AppendLine("Id;Title;Description;Status;AssigneeId;DueDate;CreatedAt;UpdatedAt");
        foreach (var row in rows)
            sb.AppendLine(row);
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static string FormatCsvRow(Domain.Entities.TaskItem t) =>
        string.Join(';',
            t.Id,
            Escape(t.Title),
            Escape(t.Description ?? ""),
            t.Status,
            t.AssigneeId,
            t.DueDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "",
            t.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture),
            t.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture));

    private static string Escape(string s) => s.Contains(';') || s.Contains('"') || s.Contains('\n')
        ? $"\"{s.Replace("\"", "\"\"")}\""
        : s;
}

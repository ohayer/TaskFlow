using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Services;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class ExportsController : ControllerBase
{
    private readonly IExportService _exports;
    private readonly ICurrentUser _current;

    public ExportsController(IExportService exports, ICurrentUser current)
    {
        _exports = exports;
        _current = current;
    }

    [HttpPost("projects/{projectId:guid}/exports")]
    public async Task<ActionResult<ExportedReport>> Export(Guid projectId, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var report = await _exports.ExportProjectTasksToCsvAsync(projectId, _current.UserId.Value, ct);
        return report is null ? Forbid() : Ok(report);
    }

    [HttpGet("projects/{projectId:guid}/exports")]
    public async Task<ActionResult<IReadOnlyList<ExportedReport>>> List(Guid projectId, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var reports = await _exports.ListExportsAsync(projectId, _current.UserId.Value, ct);
        return Ok(reports);
    }

    [HttpGet("projects/{projectId:guid}/exports/{fileName}")]
    public async Task<IActionResult> Download(Guid projectId, string fileName, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var stream = await _exports.DownloadExportAsync(fileName, projectId, _current.UserId.Value, ct);
        return stream is null ? NotFound() : File(stream, "text/csv", fileName);
    }
}

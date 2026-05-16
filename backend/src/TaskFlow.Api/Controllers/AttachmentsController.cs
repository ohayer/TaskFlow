using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Dtos;
using TaskFlow.Application.Services;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/tasks/{taskId:guid}")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly IAttachmentService _service;
    private readonly ICurrentUser _current;

    public AttachmentsController(IAttachmentService service, ICurrentUser current)
    {
        _service = service;
        _current = current;
    }

    [HttpPost("attachments")]
    [RequestSizeLimit(20 * 1024 * 1024)]                                       // 20 MB
    public async Task<ActionResult<AttachmentDto>> Upload(Guid taskId, IFormFile file, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        if (file is null || file.Length == 0) return BadRequest(new { error = "File is required" });

        await using var stream = file.OpenReadStream();
        var result = await _service.UploadAsync(taskId, stream, file.FileName, file.ContentType ?? "application/octet-stream", _current.UserId.Value, ct);
        return result is null
            ? NotFound(new { error = "Task not found or no access" })
            : CreatedAtAction(nameof(List), new { taskId }, result);
    }

    [HttpGet("attachments")]
    public async Task<ActionResult<IReadOnlyList<AttachmentDto>>> List(Guid taskId, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var atts = await _service.ListByTaskAsync(taskId, _current.UserId.Value, ct);
        return Ok(atts);
    }

    [HttpDelete("attachments/{attachmentId:guid}")]
    public async Task<IActionResult> Delete(Guid taskId, Guid attachmentId, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var deleted = await _service.DeleteAsync(taskId, attachmentId, _current.UserId.Value, ct);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("audit")]
    public async Task<ActionResult<IReadOnlyList<AuditEntryDto>>> Audit(Guid taskId, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var entries = await _service.ListAuditByTaskAsync(taskId, _current.UserId.Value, ct);
        return Ok(entries);
    }
}

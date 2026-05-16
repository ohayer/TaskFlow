using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Dtos;
using TaskFlow.Application.Services;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService _service;
    private readonly ICurrentUser _current;

    public TasksController(ITaskService service, ICurrentUser current)
    {
        _service = service;
        _current = current;
    }

    [HttpGet("projects/{projectId:guid}/tasks")]
    public async Task<ActionResult<IReadOnlyList<TaskDto>>> ListByProject(Guid projectId, [FromQuery] TaskItemStatus? status, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var tasks = await _service.ListByProjectAsync(projectId, _current.UserId.Value, status, ct);
        return Ok(tasks);
    }

    [HttpGet("tasks/{id:guid}")]
    public async Task<ActionResult<TaskDto>> Get(Guid id, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var task = await _service.GetAsync(id, _current.UserId.Value, ct);
        return task is null ? NotFound() : Ok(task);
    }

    [HttpPost("projects/{projectId:guid}/tasks")]
    public async Task<ActionResult<TaskDto>> Create(Guid projectId, [FromBody] CreateTaskDto dto, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        try
        {
            var created = await _service.CreateAsync(projectId, dto, _current.UserId.Value, ct);
            return created is null ? Forbid() : CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("tasks/{id:guid}")]
    public async Task<ActionResult<TaskDto>> Update(Guid id, [FromBody] UpdateTaskDto dto, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var updated = await _service.UpdateAsync(id, dto, _current.UserId.Value, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("tasks/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var deleted = await _service.DeleteAsync(id, _current.UserId.Value, ct);
        return deleted ? NoContent() : NotFound();
    }
}

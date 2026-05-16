using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Dtos;
using TaskFlow.Application.Services;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _service;
    private readonly ICurrentUser _current;

    public ProjectsController(IProjectService service, ICurrentUser current)
    {
        _service = service;
        _current = current;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectDto>>> List(CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var projects = await _service.ListMineAsync(_current.UserId.Value, ct);
        return Ok(projects);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProjectDto>> Get(Guid id, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var project = await _service.GetAsync(id, _current.UserId.Value, ct);
        return project is null ? NotFound() : Ok(project);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create([FromBody] CreateProjectDto dto, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        try
        {
            var created = await _service.CreateAsync(dto, _current.UserId.Value, ct);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProjectDto>> Update(Guid id, [FromBody] UpdateProjectDto dto, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var updated = await _service.UpdateAsync(id, dto, _current.UserId.Value, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var deleted = await _service.DeleteAsync(id, _current.UserId.Value, ct);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddMemberDto dto, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var result = await _service.AddMemberAsync(id, dto.Email, dto.Role, _current.UserId.Value, ct);
        return result switch
        {
            AddMemberResult.Success => NoContent(),
            AddMemberResult.UserNotFound => NotFound(new { error = "Użytkownik z tym email nie istnieje" }),
            AddMemberResult.AlreadyMember => Conflict(new { error = "Ten użytkownik jest już członkiem projektu" }),
            AddMemberResult.NotOwner => StatusCode(403, new { error = "Tylko właściciel może dodawać członków" }),
            AddMemberResult.ProjectNotFound => NotFound(new { error = "Projekt nie istnieje" }),
            _ => BadRequest(),
        };
    }

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<IReadOnlyList<ProjectMemberDto>>> ListMembers(Guid id, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var members = await _service.ListMembersAsync(id, _current.UserId.Value, ct);
        return Ok(members);
    }

    [HttpPatch("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> UpdateMemberRole(Guid id, Guid userId, [FromBody] UpdateMemberRoleDto dto, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var result = await _service.UpdateMemberRoleAsync(id, userId, dto.Role, _current.UserId.Value, ct);
        return result switch
        {
            MemberOpResult.Success => NoContent(),
            MemberOpResult.NotOwner => StatusCode(403, new { error = "Tylko właściciel może zmieniać role" }),
            MemberOpResult.ProjectNotFound => NotFound(new { error = "Projekt nie istnieje" }),
            MemberOpResult.MemberNotFound => NotFound(new { error = "Członek nie istnieje" }),
            MemberOpResult.CannotModifyOwner => BadRequest(new { error = "Nie można zmienić roli właściciela" }),
            _ => BadRequest(),
        };
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var result = await _service.RemoveMemberAsync(id, userId, _current.UserId.Value, ct);
        return result switch
        {
            MemberOpResult.Success => NoContent(),
            MemberOpResult.NotOwner => StatusCode(403, new { error = "Tylko właściciel może usuwać członków" }),
            MemberOpResult.ProjectNotFound => NotFound(new { error = "Projekt nie istnieje" }),
            MemberOpResult.MemberNotFound => NotFound(new { error = "Członek nie istnieje" }),
            MemberOpResult.CannotModifyOwner => BadRequest(new { error = "Nie można usunąć właściciela projektu" }),
            _ => BadRequest(),
        };
    }

    [HttpGet("{id:guid}/members/{userId:guid}/audit")]
    public async Task<ActionResult<IReadOnlyList<AuditEntryDto>>> MemberAudit(Guid id, Guid userId, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var entries = await _service.ListMemberAuditInProjectAsync(id, userId, _current.UserId.Value, ct);
        return Ok(entries);
    }
}

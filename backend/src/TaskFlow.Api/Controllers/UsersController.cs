using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Dtos;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly ICurrentUser _current;

    public UsersController(IUserRepository users, ICurrentUser current)
    {
        _users = users;
        _current = current;
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me(CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var user = await _users.GetByIdAsync(_current.UserId.Value, ct);
        return user is null ? NotFound() : Ok(new UserDto(user.Id, user.Email, user.DisplayName, user.NotificationPreference));
    }

    [HttpPut("me/notification-preference")]
    public async Task<IActionResult> UpdateNotificationPreference([FromBody] UpdateNotificationPreferenceDto dto, CancellationToken ct)
    {
        if (_current.UserId is null) return Unauthorized();
        var user = await _users.GetByIdAsync(_current.UserId.Value, ct);
        if (user is null) return NotFound();

        user.NotificationPreference = dto.Channel;
        if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) user.PhoneNumber = dto.PhoneNumber.Trim();
        await _users.UpdateAsync(user, ct);
        return NoContent();
    }
}

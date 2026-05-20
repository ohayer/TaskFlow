using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Dtos;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.Application.Services;
public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly IJwtTokenGenerator _jwt;

    public AuthService(IUserRepository users, IPasswordHasher hasher, IJwtTokenGenerator jwt)
    {
        _users = users;
        _hasher = hasher;
        _jwt = jwt;
    }
    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || !dto.Email.Contains('@'))
            throw new ArgumentException("Invalid email", nameof(dto));
        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 8)
            throw new ArgumentException("Password must be at least 8 characters", nameof(dto));
        if (string.IsNullOrWhiteSpace(dto.DisplayName))
            throw new ArgumentException("Display name is required", nameof(dto));

        var existing = await _users.GetByEmailAsync(dto.Email.Trim().ToLowerInvariant(), ct);
        if (existing is not null) return null;                                  // email zajęty

        var user = new User
        {
            Email = dto.Email.Trim().ToLowerInvariant(),
            DisplayName = dto.DisplayName.Trim(),
            PasswordHash = _hasher.Hash(dto.Password),
        };
        await _users.AddAsync(user, ct);

        var (token, expiresAt) = _jwt.Generate(user);
        return new AuthResponseDto(token, expiresAt,
            new UserDto(user.Id, user.Email, user.DisplayName, user.NotificationPreference));
    }
    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return null;

        var user = await _users.GetByEmailAsync(dto.Email.Trim().ToLowerInvariant(), ct);
        if (user is null) return null;
        if (!_hasher.Verify(dto.Password, user.PasswordHash)) return null;

        var (token, expiresAt) = _jwt.Generate(user);
        return new AuthResponseDto(token, expiresAt,
            new UserDto(user.Id, user.Email, user.DisplayName, user.NotificationPreference));
    }
}

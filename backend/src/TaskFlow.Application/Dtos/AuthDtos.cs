namespace TaskFlow.Application.Dtos;

public record RegisterDto(string Email, string Password, string DisplayName);
public record LoginDto(string Email, string Password);
public record AuthResponseDto(string Token, DateTime ExpiresAt, UserDto User);

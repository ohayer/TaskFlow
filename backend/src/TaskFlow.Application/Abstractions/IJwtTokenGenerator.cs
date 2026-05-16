using TaskFlow.Domain.Entities;

namespace TaskFlow.Application.Abstractions;

public interface IJwtTokenGenerator
{
    (string Token, DateTime ExpiresAt) Generate(User user);
}

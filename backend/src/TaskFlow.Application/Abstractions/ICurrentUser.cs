namespace TaskFlow.Application.Abstractions;

public interface ICurrentUser
{
    Guid? UserId { get; }
    string? EntraObjectId { get; }
    string? Email { get; }
    bool IsAuthenticated { get; }
}

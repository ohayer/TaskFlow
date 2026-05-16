using TaskFlow.Domain.Enums;

namespace TaskFlow.Domain.Entities;

public class ProjectMember
{
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public ProjectRole Role { get; set; } = ProjectRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Project? Project { get; set; }
    public User? User { get; set; }
}

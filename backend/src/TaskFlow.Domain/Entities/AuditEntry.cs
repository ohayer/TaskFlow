namespace TaskFlow.Domain.Entities;

public class AuditEntry
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ProjectId { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public Guid PerformedById { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? PreviousState { get; set; }
    public string? NewState { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

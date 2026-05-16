using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Dtos;

public record TaskDto(
    Guid Id,
    Guid ProjectId,
    string Title,
    string? Description,
    TaskItemStatus Status,
    Guid? AssigneeId,
    DateTime? DueDate,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int AttachmentCount);

public record CreateTaskDto(string Title, string? Description, Guid? AssigneeId, DateTime? DueDate);
public record UpdateTaskDto(string Title, string? Description, TaskItemStatus Status, Guid? AssigneeId, DateTime? DueDate);

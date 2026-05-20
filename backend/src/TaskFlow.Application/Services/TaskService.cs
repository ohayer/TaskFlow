using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Dtos;
using TaskFlow.Application.Events;
using TaskFlow.Application.Extensions;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.Application.Services;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _tasks;
    private readonly IProjectRepository _projects;
    private readonly IAuditRepository _audit;
    private readonly ITaskListCache _cache;
    private readonly INotificationService _notifications;

    public TaskService(
        ITaskRepository tasks,
        IProjectRepository projects,
        IAuditRepository audit,
        ITaskListCache cache,
        INotificationService notifications)
    {
        _tasks = tasks;
        _projects = projects;
        _audit = audit;
        _cache = cache;
        _notifications = notifications;
    }

    private static TaskDto ToDto(TaskItem t) =>
        new(t.Id, t.ProjectId, t.Title, t.Description, t.Status, t.AssigneeId, t.DueDate, t.CreatedAt, t.UpdatedAt, t.Attachments.Count);

    public async Task<IReadOnlyList<TaskDto>> ListByProjectAsync(Guid projectId, Guid requesterId, TaskItemStatus? statusFilter = null, CancellationToken ct = default)
    {
        if (!await _projects.IsMemberAsync(projectId, requesterId, ct)) return Array.Empty<TaskDto>();

        if (statusFilter is null)
        {
            var cached = await _cache.GetTasksAsync(projectId, ct);
            if (cached is not null) return cached.Select(ToDto).ToList();
        }

        var tasks = await _tasks.ListByProjectAsync(projectId, statusFilter, ct);
        if (statusFilter is null) await _cache.SetTasksAsync(projectId, tasks, ct);
        return tasks.Select(ToDto).ToList();
    }

    public async Task<TaskDto?> GetAsync(Guid taskId, Guid requesterId, CancellationToken ct = default)
    {
        var task = await _tasks.GetByIdAsync(taskId, ct);
        if (task is null) return null;
        if (!await _projects.IsMemberAsync(task.ProjectId, requesterId, ct)) return null;
        return ToDto(task);
    }

    public async Task<TaskDto?> CreateAsync(Guid projectId, CreateTaskDto dto, Guid requesterId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Title)) throw new ArgumentException("Task title is required");
        if (!await _projects.IsMemberAsync(projectId, requesterId, ct)) return null;

        var task = new TaskItem
        {
            ProjectId = projectId,
            Title = dto.Title.TrimOrEmpty(), // metody rozszerzające
            Description = dto.Description?.Trim(),
            AssigneeId = dto.AssigneeId,
            DueDate = dto.DueDate,
            Status = TaskItemStatus.Todo
        };
        await _tasks.AddAsync(task, ct);
        await _cache.InvalidateAsync(projectId, ct);
        await _audit.AddEntryAsync(new AuditEntry
        {
            ProjectId = projectId.ToString(),
            TaskId = task.Id.ToString(),
            Action = "Created",
            PerformedById = requesterId,
            NewState = task.Title
        }, ct);

        if (task.AssigneeId.HasValue && task.AssigneeId != requesterId)
        {
            await _notifications.NotifyTaskAssignedAsync(task.Id, task.AssigneeId.Value, requesterId, ct);
            // Zdarzenia (events)
            TaskEvents.RaiseTaskAssigned(new TaskAssignedEventArgs { TaskId = task.Id, AssigneeId = task.AssigneeId.Value });
        }

        return ToDto(task);
    }

    public async Task<TaskDto?> UpdateAsync(Guid taskId, UpdateTaskDto dto, Guid requesterId, CancellationToken ct = default)
    {
        var task = await _tasks.GetByIdAsync(taskId, ct);
        if (task is null) return null;
        if (!await _projects.IsMemberAsync(task.ProjectId, requesterId, ct)) return null;

        var previousAssignee = task.AssigneeId;
        var previousState = $"{task.Title} | {task.Status}";
        task.Title = dto.Title.Trim();
        task.Description = dto.Description?.Trim();
        task.Status = dto.Status;
        task.AssigneeId = dto.AssigneeId;
        task.DueDate = dto.DueDate;
        await _tasks.UpdateAsync(task, ct);
        await _cache.InvalidateAsync(task.ProjectId, ct);
        await _audit.AddEntryAsync(new AuditEntry
        {
            ProjectId = task.ProjectId.ToString(),
            TaskId = task.Id.ToString(),
            Action = "Updated",
            PerformedById = requesterId,
            PreviousState = previousState,
            NewState = $"{task.Title} | {task.Status}"
        }, ct);

        if (task.AssigneeId.HasValue && task.AssigneeId != previousAssignee && task.AssigneeId != requesterId)
        {
            await _notifications.NotifyTaskAssignedAsync(task.Id, task.AssigneeId.Value, requesterId, ct);
            // Zdarzenia (events)
            TaskEvents.RaiseTaskAssigned(new TaskAssignedEventArgs { TaskId = task.Id, AssigneeId = task.AssigneeId.Value });
        }

        return ToDto(task);
    }

    public async Task<bool> DeleteAsync(Guid taskId, Guid requesterId, CancellationToken ct = default)
    {
        var task = await _tasks.GetByIdAsync(taskId, ct);
        if (task is null) return false;
        if (!await _projects.IsMemberAsync(task.ProjectId, requesterId, ct)) return false;
        await _tasks.DeleteAsync(taskId, ct);
        await _cache.InvalidateAsync(task.ProjectId, ct);
        await _audit.AddEntryAsync(new AuditEntry
        {
            ProjectId = task.ProjectId.ToString(),
            TaskId = task.Id.ToString(),
            Action = "Deleted",
            PerformedById = requesterId,
            PreviousState = task.Title
        }, ct);
        return true;
    }
}

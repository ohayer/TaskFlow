using TaskFlow.Application.Dtos;
using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Services;

public interface ITaskService
{
    Task<IReadOnlyList<TaskDto>> ListByProjectAsync(Guid projectId, Guid requesterId, TaskItemStatus? statusFilter = null, CancellationToken ct = default);
    Task<TaskDto?> GetAsync(Guid taskId, Guid requesterId, CancellationToken ct = default);
    Task<TaskDto?> CreateAsync(Guid projectId, CreateTaskDto dto, Guid requesterId, CancellationToken ct = default);
    Task<TaskDto?> UpdateAsync(Guid taskId, UpdateTaskDto dto, Guid requesterId, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid taskId, Guid requesterId, CancellationToken ct = default);
}

using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Dtos;
using TaskFlow.Application.Services;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.UnitTests.Services;

public class TaskServiceTests
{
    private readonly Mock<ITaskRepository> _tasks = new();
    private readonly Mock<IProjectRepository> _projects = new();
    private readonly Mock<IAuditRepository> _audit = new();
    private readonly Mock<ITaskListCache> _cache = new();
    private readonly Mock<INotificationService> _notifications = new();

    private TaskService Sut() => new(_tasks.Object, _projects.Object, _audit.Object, _cache.Object, _notifications.Object);

    [Fact]
    public async Task Create_throws_when_title_empty()
    {
        var sut = Sut();
        await Assert.ThrowsAsync<ArgumentException>(() =>
            sut.CreateAsync(Guid.NewGuid(), new CreateTaskDto("", null, null, null), Guid.NewGuid()));
    }

    [Fact]
    public async Task Create_returns_null_when_user_not_member()
    {
        _projects.Setup(p => p.IsMemberAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), default)).ReturnsAsync(false);

        var result = await Sut().CreateAsync(Guid.NewGuid(), new CreateTaskDto("Test", null, null, null), Guid.NewGuid());

        result.Should().BeNull();
        _tasks.Verify(t => t.AddAsync(It.IsAny<TaskItem>(), default), Times.Never);
    }

    [Fact]
    public async Task Create_persists_task_invalidates_cache_and_writes_audit()
    {
        var projectId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        _projects.Setup(p => p.IsMemberAsync(projectId, userId, default)).ReturnsAsync(true);

        var result = await Sut().CreateAsync(projectId, new CreateTaskDto("Test task", null, null, null), userId);

        result.Should().NotBeNull();
        result!.Title.Should().Be("Test task");
        result.Status.Should().Be(TaskItemStatus.Todo);
        _tasks.Verify(t => t.AddAsync(It.IsAny<TaskItem>(), default), Times.Once);
        _cache.Verify(c => c.InvalidateAsync(projectId, default), Times.Once);
        _audit.Verify(a => a.AddEntryAsync(It.Is<AuditEntry>(e => e.Action == "Created"), default), Times.Once);
    }

    [Fact]
    public async Task Create_with_assignee_other_than_creator_triggers_notification()
    {
        var projectId = Guid.NewGuid();
        var creatorId = Guid.NewGuid();
        var assigneeId = Guid.NewGuid();
        _projects.Setup(p => p.IsMemberAsync(projectId, creatorId, default)).ReturnsAsync(true);

        await Sut().CreateAsync(projectId, new CreateTaskDto("T", null, assigneeId, null), creatorId);

        _notifications.Verify(n => n.NotifyTaskAssignedAsync(It.IsAny<Guid>(), assigneeId, creatorId, default), Times.Once);
    }

    [Fact]
    public async Task ListByProject_returns_empty_when_user_not_member()
    {
        _projects.Setup(p => p.IsMemberAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), default)).ReturnsAsync(false);

        var result = await Sut().ListByProjectAsync(Guid.NewGuid(), Guid.NewGuid());

        result.Should().BeEmpty();
        _tasks.Verify(t => t.ListByProjectAsync(It.IsAny<Guid>(), It.IsAny<TaskItemStatus?>(), default), Times.Never);
    }

    [Fact]
    public async Task ListByProject_uses_cache_when_no_filter_and_cache_hit()
    {
        var projectId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var cached = new List<TaskItem> { new() { ProjectId = projectId, Title = "From cache" } };
        _projects.Setup(p => p.IsMemberAsync(projectId, userId, default)).ReturnsAsync(true);
        _cache.Setup(c => c.GetTasksAsync(projectId, default)).ReturnsAsync(cached);

        var result = await Sut().ListByProjectAsync(projectId, userId);

        result.Should().HaveCount(1);
        result[0].Title.Should().Be("From cache");
        _tasks.Verify(t => t.ListByProjectAsync(It.IsAny<Guid>(), It.IsAny<TaskItemStatus?>(), default), Times.Never);
    }

    [Fact]
    public async Task ListByProject_writes_to_cache_on_miss()
    {
        var projectId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        _projects.Setup(p => p.IsMemberAsync(projectId, userId, default)).ReturnsAsync(true);
        _cache.Setup(c => c.GetTasksAsync(projectId, default)).ReturnsAsync((IReadOnlyList<TaskItem>?)null);
        _tasks.Setup(t => t.ListByProjectAsync(projectId, null, default)).ReturnsAsync(new List<TaskItem>());

        await Sut().ListByProjectAsync(projectId, userId);

        _cache.Verify(c => c.SetTasksAsync(projectId, It.IsAny<IReadOnlyList<TaskItem>>(), default), Times.Once);
    }

    [Fact]
    public async Task Delete_invalidates_cache_when_successful()
    {
        var task = new TaskItem { Id = Guid.NewGuid(), ProjectId = Guid.NewGuid(), Title = "T" };
        var userId = Guid.NewGuid();
        _tasks.Setup(t => t.GetByIdAsync(task.Id, default)).ReturnsAsync(task);
        _projects.Setup(p => p.IsMemberAsync(task.ProjectId, userId, default)).ReturnsAsync(true);

        var result = await Sut().DeleteAsync(task.Id, userId);

        result.Should().BeTrue();
        _cache.Verify(c => c.InvalidateAsync(task.ProjectId, default), Times.Once);
    }
}

using FluentAssertions;
using Moq;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Dtos;
using TaskFlow.Application.Services;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.UnitTests.Services;

public class ProjectServiceTests
{
    private readonly Mock<IProjectRepository> _projects = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IAuditRepository> _audit = new();
    private readonly Mock<ITaskListCache> _cache = new();

    private ProjectService Sut() => new(_projects.Object, _users.Object, _audit.Object, _cache.Object);

    [Fact]
    public async Task Create_throws_when_name_empty()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            Sut().CreateAsync(new CreateProjectDto("", null), Guid.NewGuid()));
    }

    [Fact]
    public async Task Create_adds_owner_as_owner_member()
    {
        var ownerId = Guid.NewGuid();
        Project? captured = null;
        _projects.Setup(p => p.AddAsync(It.IsAny<Project>(), default))
            .Callback<Project, CancellationToken>((p, _) => captured = p)
            .Returns(Task.CompletedTask);

        var dto = await Sut().CreateAsync(new CreateProjectDto("My Project", "Desc"), ownerId);

        dto.Name.Should().Be("My Project");
        captured.Should().NotBeNull();
        captured!.OwnerId.Should().Be(ownerId);
        captured.Members.Should().ContainSingle(m => m.UserId == ownerId && m.Role == ProjectRole.Owner);
    }

    [Fact]
    public async Task Get_returns_null_when_user_is_not_member_or_owner()
    {
        var project = new Project { Id = Guid.NewGuid(), Name = "X", OwnerId = Guid.NewGuid() };
        _projects.Setup(p => p.GetByIdAsync(project.Id, default)).ReturnsAsync(project);

        var result = await Sut().GetAsync(project.Id, Guid.NewGuid());          // inny user

        result.Should().BeNull();
    }

    [Fact]
    public async Task Update_only_owner_can_update()
    {
        var project = new Project { Id = Guid.NewGuid(), Name = "X", OwnerId = Guid.NewGuid() };
        _projects.Setup(p => p.GetByIdAsync(project.Id, default)).ReturnsAsync(project);

        var result = await Sut().UpdateAsync(project.Id, new UpdateProjectDto("Y", null), Guid.NewGuid());

        result.Should().BeNull();
        _projects.Verify(p => p.UpdateAsync(It.IsAny<Project>(), default), Times.Never);
    }

    [Fact]
    public async Task Delete_invalidates_cache()
    {
        var ownerId = Guid.NewGuid();
        var project = new Project { Id = Guid.NewGuid(), Name = "X", OwnerId = ownerId };
        _projects.Setup(p => p.GetByIdAsync(project.Id, default)).ReturnsAsync(project);

        var result = await Sut().DeleteAsync(project.Id, ownerId);

        result.Should().BeTrue();
        _cache.Verify(c => c.InvalidateAsync(project.Id, default), Times.Once);
    }
}

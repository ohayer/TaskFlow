using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Infrastructure.Persistence;
using TaskFlow.Infrastructure.Repositories;

namespace TaskFlow.UnitTests.Repositories;

public class EfRepositoriesTests
{
    private static TaskFlowDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<TaskFlowDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new TaskFlowDbContext(options);
    }

    [Fact]
    public async Task ProjectRepository_AddAsync_persists()
    {
        await using var db = NewDb();
        var sut = new EfProjectRepository(db);
        var project = new Project { Name = "P1", OwnerId = Guid.NewGuid() };

        await sut.AddAsync(project);

        var found = await db.Projects.FindAsync(project.Id);
        found.Should().NotBeNull();
        found!.Name.Should().Be("P1");
    }

    [Fact]
    public async Task ProjectRepository_ListByUserAsync_returns_owned_and_member_projects()
    {
        await using var db = NewDb();
        var sut = new EfProjectRepository(db);
        var userId = Guid.NewGuid();
        var owned = new Project { Name = "Owned", OwnerId = userId };
        var memberOf = new Project { Name = "Member", OwnerId = Guid.NewGuid() };
        memberOf.Members.Add(new ProjectMember { ProjectId = memberOf.Id, UserId = userId, Role = ProjectRole.Member });
        var unrelated = new Project { Name = "Other", OwnerId = Guid.NewGuid() };
        db.Projects.AddRange(owned, memberOf, unrelated);
        await db.SaveChangesAsync();

        var result = await sut.ListByUserAsync(userId);

        result.Should().HaveCount(2);
        result.Select(p => p.Name).Should().BeEquivalentTo(new[] { "Owned", "Member" });
    }

    [Fact]
    public async Task TaskRepository_ListByProjectAsync_filters_by_status()
    {
        await using var db = NewDb();
        var sut = new EfTaskRepository(db);
        var projectId = Guid.NewGuid();
        db.Tasks.AddRange(
            new TaskItem { ProjectId = projectId, Title = "T1", Status = TaskItemStatus.Todo },
            new TaskItem { ProjectId = projectId, Title = "T2", Status = TaskItemStatus.Done },
            new TaskItem { ProjectId = projectId, Title = "T3", Status = TaskItemStatus.Todo });
        await db.SaveChangesAsync();

        var todo = await sut.ListByProjectAsync(projectId, TaskItemStatus.Todo);

        todo.Should().HaveCount(2);
        todo.Should().OnlyContain(t => t.Status == TaskItemStatus.Todo);
    }

    [Fact]
    public async Task UserRepository_GetByEmailAsync_finds_user()
    {
        await using var db = NewDb();
        var sut = new EfUserRepository(db);
        db.Users.Add(new User { Email = "u@x", DisplayName = "U", PasswordHash = "h" });
        await db.SaveChangesAsync();

        var found = await sut.GetByEmailAsync("u@x");

        found.Should().NotBeNull();
        found!.DisplayName.Should().Be("U");
    }

    [Fact]
    public async Task ProjectRepository_IsMemberAsync_returns_true_for_member_or_owner()
    {
        await using var db = NewDb();
        var sut = new EfProjectRepository(db);
        var projectId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        db.Projects.Add(new Project { Id = projectId, Name = "P", OwnerId = ownerId });
        db.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = memberId, Role = ProjectRole.Member });
        await db.SaveChangesAsync();

        var isOwner = await sut.IsMemberAsync(projectId, ownerId);              // owner traktowany jako member
        var isMember = await sut.IsMemberAsync(projectId, memberId);
        var isNotMember = await sut.IsMemberAsync(projectId, Guid.NewGuid());

        isOwner.Should().BeTrue();
        isMember.Should().BeTrue();
        isNotMember.Should().BeFalse();
    }
}

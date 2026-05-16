using System.Text;
using FluentAssertions;
using Moq;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Services;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.UnitTests.Services;

public class ExportServiceTests
{
    private readonly Mock<IProjectRepository> _projects = new();
    private readonly Mock<ITaskRepository> _tasks = new();
    private readonly Mock<IReportExporter> _exporter = new();

    private ExportService Sut() => new(_projects.Object, _tasks.Object, _exporter.Object);

    [Fact]
    public async Task Export_returns_null_when_user_not_member_or_owner()
    {
        var project = new Project { Id = Guid.NewGuid(), Name = "P", OwnerId = Guid.NewGuid() };
        _projects.Setup(p => p.GetByIdAsync(project.Id, default)).ReturnsAsync(project);

        var result = await Sut().ExportProjectTasksToCsvAsync(project.Id, Guid.NewGuid());

        result.Should().BeNull();
        _exporter.Verify(e => e.ExportProjectAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<byte[]>(), default), Times.Never);
    }

    [Fact]
    public async Task Export_writes_csv_with_header_when_user_is_owner()
    {
        var ownerId = Guid.NewGuid();
        var project = new Project { Id = Guid.NewGuid(), Name = "MyProj", OwnerId = ownerId };
        _projects.Setup(p => p.GetByIdAsync(project.Id, default)).ReturnsAsync(project);
        _tasks.Setup(t => t.ListByProjectAsync(project.Id, null, default))
            .ReturnsAsync(new List<TaskItem>
            {
                new() { Id = Guid.NewGuid(), Title = "Task 1", Status = TaskItemStatus.Todo },
                new() { Id = Guid.NewGuid(), Title = "Task 2; with semicolon", Status = TaskItemStatus.Done },
            });

        byte[]? capturedCsv = null;
        _exporter.Setup(e => e.ExportProjectAsync(project.Id, "MyProj", It.IsAny<byte[]>(), default))
            .Callback<Guid, string, byte[], CancellationToken>((_, _, csv, _) => capturedCsv = csv)
            .ReturnsAsync(new ExportedReport("file.csv", "https://x", 100, DateTime.UtcNow));

        var result = await Sut().ExportProjectTasksToCsvAsync(project.Id, ownerId);

        result.Should().NotBeNull();
        capturedCsv.Should().NotBeNull();
        var csv = Encoding.UTF8.GetString(capturedCsv!);
        csv.Should().Contain("Id;Title;Description;Status;AssigneeId;DueDate;CreatedAt;UpdatedAt");
        csv.Should().Contain("Task 1");
        csv.Should().Contain("\"Task 2; with semicolon\"");                     // escape semicolon
    }

    [Fact]
    public async Task List_returns_empty_when_user_has_no_access()
    {
        var project = new Project { Id = Guid.NewGuid(), Name = "P", OwnerId = Guid.NewGuid() };
        _projects.Setup(p => p.GetByIdAsync(project.Id, default)).ReturnsAsync(project);

        var result = await Sut().ListExportsAsync(project.Id, Guid.NewGuid());

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task List_returns_reports_for_owner()
    {
        var ownerId = Guid.NewGuid();
        var project = new Project { Id = Guid.NewGuid(), Name = "P", OwnerId = ownerId };
        _projects.Setup(p => p.GetByIdAsync(project.Id, default)).ReturnsAsync(project);
        _exporter.Setup(e => e.ListAsync(project.Id, default))
            .ReturnsAsync(new List<ExportedReport>
            {
                new("a.csv", "https://x/a", 100, DateTime.UtcNow),
                new("b.csv", "https://x/b", 200, DateTime.UtcNow.AddMinutes(-10)),
            });

        var result = await Sut().ListExportsAsync(project.Id, ownerId);

        result.Should().HaveCount(2);
    }
}

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using TaskFlow.Application.Dtos;
using TaskFlow.Domain.Enums;
using TaskFlow.IntegrationTests.Infrastructure;

namespace TaskFlow.IntegrationTests;

public class TasksEndpointsTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;

    public TasksEndpointsTests(TestWebAppFactory factory) => _factory = factory;

    [Fact]
    public async Task CreateTask_ThenList_ReturnsCreatedTask()
    {
        var client = await CreateAuthenticatedClientAsync();
        var project = await CreateProjectAsync(client, "Backlog");

        var create = await client.PostAsJsonAsync(
            $"/api/projects/{project.Id}/tasks",
            new CreateTaskDto("Wire up CI", "GitHub Actions pipeline", AssigneeId: null, DueDate: null));

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await create.Content.ReadFromJsonAsync<TaskDto>();
        created!.Title.Should().Be("Wire up CI");
        created.Status.Should().Be(TaskItemStatus.Todo);

        var list = await client.GetFromJsonAsync<List<TaskDto>>($"/api/projects/{project.Id}/tasks");
        list.Should().ContainSingle(t => t.Id == created.Id);
    }

    [Fact]
    public async Task UpdateTaskStatus_ToDone_PersistsAndReturnsUpdated()
    {
        var client = await CreateAuthenticatedClientAsync();
        var project = await CreateProjectAsync(client, "Sprint");
        var created = await CreateTaskAsync(client, project.Id, "Write tests");

        var update = await client.PutAsJsonAsync($"/api/tasks/{created.Id}", new UpdateTaskDto(
            Title: created.Title,
            Description: created.Description,
            Status: TaskItemStatus.Done,
            AssigneeId: null,
            DueDate: null));

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = (await update.Content.ReadFromJsonAsync<TaskDto>())!;
        updated.Status.Should().Be(TaskItemStatus.Done);

        var fetched = await client.GetFromJsonAsync<TaskDto>($"/api/tasks/{created.Id}");
        fetched!.Status.Should().Be(TaskItemStatus.Done);
    }

    [Fact]
    public async Task ListTasks_WithStatusFilter_ReturnsOnlyMatching()
    {
        var client = await CreateAuthenticatedClientAsync();
        var project = await CreateProjectAsync(client, "Filterland");
        var todo = await CreateTaskAsync(client, project.Id, "Stays todo");
        var willBeDone = await CreateTaskAsync(client, project.Id, "Will be done");

        var put = await client.PutAsJsonAsync($"/api/tasks/{willBeDone.Id}", new UpdateTaskDto(
            willBeDone.Title, willBeDone.Description, TaskItemStatus.Done, null, null));
        put.EnsureSuccessStatusCode();

        var doneOnly = await client.GetFromJsonAsync<List<TaskDto>>(
            $"/api/projects/{project.Id}/tasks?status={(int)TaskItemStatus.Done}");

        doneOnly.Should().ContainSingle(t => t.Id == willBeDone.Id);
        doneOnly.Should().NotContain(t => t.Id == todo.Id);
    }

    [Fact]
    public async Task DeleteTask_RemovesItFromList()
    {
        var client = await CreateAuthenticatedClientAsync();
        var project = await CreateProjectAsync(client, "Cleanup");
        var task = await CreateTaskAsync(client, project.Id, "Temporary");

        var delete = await client.DeleteAsync($"/api/tasks/{task.Id}");
        delete.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var list = await client.GetFromJsonAsync<List<TaskDto>>($"/api/projects/{project.Id}/tasks");
        list.Should().NotContain(t => t.Id == task.Id);
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync()
    {
        var client = _factory.CreateClient();
        var dto = new RegisterDto($"user-{Guid.NewGuid():N}@taskflow.test", "Pa$$w0rd!", "Test User");
        var resp = await client.PostAsJsonAsync("/api/auth/register", dto);
        resp.EnsureSuccessStatusCode();
        var body = (await resp.Content.ReadFromJsonAsync<AuthResponseDto>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.Token);
        return client;
    }

    private static async Task<ProjectDto> CreateProjectAsync(HttpClient client, string name)
    {
        var resp = await client.PostAsJsonAsync("/api/projects", new CreateProjectDto(name, null));
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<ProjectDto>())!;
    }

    private static async Task<TaskDto> CreateTaskAsync(HttpClient client, Guid projectId, string title)
    {
        var resp = await client.PostAsJsonAsync($"/api/projects/{projectId}/tasks",
            new CreateTaskDto(title, null, null, null));
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<TaskDto>())!;
    }
}

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using TaskFlow.Application.Dtos;
using TaskFlow.IntegrationTests.Infrastructure;

namespace TaskFlow.IntegrationTests;

public class ProjectsEndpointsTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;

    public ProjectsEndpointsTests(TestWebAppFactory factory) => _factory = factory;

    [Fact]
    public async Task ListProjects_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/projects");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateProject_ThenList_ReturnsCreatedProject()
    {
        var client = await CreateAuthenticatedClientAsync();

        var create = await client.PostAsJsonAsync("/api/projects", new CreateProjectDto("Project Apollo", "moon mission"));

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await create.Content.ReadFromJsonAsync<ProjectDto>();
        created!.Name.Should().Be("Project Apollo");

        var list = await client.GetFromJsonAsync<List<ProjectDto>>("/api/projects");
        list.Should().NotBeNull();
        list!.Should().ContainSingle(p => p.Id == created.Id && p.Name == "Project Apollo");
    }

    [Fact]
    public async Task GetProject_ById_ReturnsProject()
    {
        var client = await CreateAuthenticatedClientAsync();
        var created = await CreateProjectAsync(client, "Project Gemini");

        var fetched = await client.GetFromJsonAsync<ProjectDto>($"/api/projects/{created.Id}");

        fetched.Should().NotBeNull();
        fetched!.Id.Should().Be(created.Id);
        fetched.Description.Should().Be(created.Description);
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
        var resp = await client.PostAsJsonAsync("/api/projects", new CreateProjectDto(name, $"desc-{name}"));
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<ProjectDto>())!;
    }
}

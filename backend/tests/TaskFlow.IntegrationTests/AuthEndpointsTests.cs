using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using TaskFlow.Application.Dtos;
using TaskFlow.IntegrationTests.Infrastructure;

namespace TaskFlow.IntegrationTests;

public class AuthEndpointsTests : IClassFixture<TestWebAppFactory>
{
    private readonly HttpClient _client;

    public AuthEndpointsTests(TestWebAppFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Register_NewUser_Returns200_WithToken()
    {
        var dto = new RegisterDto($"alice-{Guid.NewGuid():N}@taskflow.test", "Pa$$w0rd!", "Alice");

        var response = await _client.PostAsJsonAsync("/api/auth/register", dto);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        body.Should().NotBeNull();
        body!.Token.Should().NotBeNullOrWhiteSpace();
        body.User.Email.Should().Be(dto.Email);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        var dto = new RegisterDto($"bob-{Guid.NewGuid():N}@taskflow.test", "Pa$$w0rd!", "Bob");
        (await _client.PostAsJsonAsync("/api/auth/register", dto)).EnsureSuccessStatusCode();

        var second = await _client.PostAsJsonAsync("/api/auth/register", dto);

        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Login_WithValidCredentials_Returns200()
    {
        var register = new RegisterDto($"carol-{Guid.NewGuid():N}@taskflow.test", "Pa$$w0rd!", "Carol");
        (await _client.PostAsJsonAsync("/api/auth/register", register)).EnsureSuccessStatusCode();

        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginDto(register.Email, register.Password));

        login.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await login.Content.ReadFromJsonAsync<AuthResponseDto>();
        body!.Token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        var register = new RegisterDto($"dave-{Guid.NewGuid():N}@taskflow.test", "Pa$$w0rd!", "Dave");
        (await _client.PostAsJsonAsync("/api/auth/register", register)).EnsureSuccessStatusCode();

        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginDto(register.Email, "wrong-password"));

        login.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}

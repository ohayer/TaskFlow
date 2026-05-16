using FluentAssertions;
using Moq;
using TaskFlow.Application.Abstractions;
using TaskFlow.Application.Dtos;
using TaskFlow.Application.Services;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.UnitTests.Services;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IPasswordHasher> _hasher = new();
    private readonly Mock<IJwtTokenGenerator> _jwt = new();

    private AuthService Sut() => new(_users.Object, _hasher.Object, _jwt.Object);

    [Fact]
    public async Task Register_throws_when_email_invalid()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            Sut().RegisterAsync(new RegisterDto("not-an-email", "password123", "Name")));
    }

    [Fact]
    public async Task Register_throws_when_password_too_short()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            Sut().RegisterAsync(new RegisterDto("a@b.com", "short", "Name")));
    }

    [Fact]
    public async Task Register_returns_null_when_email_already_exists()
    {
        _users.Setup(u => u.GetByEmailAsync("a@b.com", default))
            .ReturnsAsync(new User { Email = "a@b.com", DisplayName = "X", PasswordHash = "h" });

        var result = await Sut().RegisterAsync(new RegisterDto("a@b.com", "password123", "Name"));

        result.Should().BeNull();
    }

    [Fact]
    public async Task Register_hashes_password_and_generates_token()
    {
        _users.Setup(u => u.GetByEmailAsync(It.IsAny<string>(), default)).ReturnsAsync((User?)null);
        _hasher.Setup(h => h.Hash("password123")).Returns("hashed-pwd");
        _jwt.Setup(j => j.Generate(It.IsAny<User>())).Returns(("jwt-token", DateTime.UtcNow.AddHours(1)));

        var result = await Sut().RegisterAsync(new RegisterDto("a@b.com", "password123", "Name"));

        result.Should().NotBeNull();
        result!.Token.Should().Be("jwt-token");
        _hasher.Verify(h => h.Hash("password123"), Times.Once);
        _users.Verify(u => u.AddAsync(It.Is<User>(usr => usr.PasswordHash == "hashed-pwd"), default), Times.Once);
    }

    [Fact]
    public async Task Login_returns_null_when_user_not_found()
    {
        _users.Setup(u => u.GetByEmailAsync(It.IsAny<string>(), default)).ReturnsAsync((User?)null);

        var result = await Sut().LoginAsync(new LoginDto("a@b.com", "password123"));

        result.Should().BeNull();
    }

    [Fact]
    public async Task Login_returns_null_when_password_wrong()
    {
        _users.Setup(u => u.GetByEmailAsync("a@b.com", default))
            .ReturnsAsync(new User { Email = "a@b.com", DisplayName = "X", PasswordHash = "stored-hash" });
        _hasher.Setup(h => h.Verify("wrong", "stored-hash")).Returns(false);

        var result = await Sut().LoginAsync(new LoginDto("a@b.com", "wrong"));

        result.Should().BeNull();
    }

    [Fact]
    public async Task Login_returns_token_when_credentials_valid()
    {
        var user = new User { Email = "a@b.com", DisplayName = "X", PasswordHash = "hash" };
        _users.Setup(u => u.GetByEmailAsync("a@b.com", default)).ReturnsAsync(user);
        _hasher.Setup(h => h.Verify("correct", "hash")).Returns(true);
        _jwt.Setup(j => j.Generate(user)).Returns(("jwt", DateTime.UtcNow.AddHours(1)));

        var result = await Sut().LoginAsync(new LoginDto("a@b.com", "correct"));

        result.Should().NotBeNull();
        result!.Token.Should().Be("jwt");
        result.User.Email.Should().Be("a@b.com");
    }
}

using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TaskFlow.Domain.Enums;
using TaskFlow.Domain.Notifications;
using TaskFlow.Domain.Repositories;
using TaskFlow.Infrastructure.Notifications;

namespace TaskFlow.UnitTests.Strategies;

public class NotificationStrategyTests
{
    private static NotificationContext CtxWithPhone() =>
        new(Guid.NewGuid(), "user@example.com", "+48123456789", "Subj", "Body");

    private static NotificationContext CtxNoPhone() =>
        new(Guid.NewGuid(), "user@example.com", null, "Subj", "Body");

    [Fact]
    public async Task Email_strategy_returns_true_and_uses_email_channel()
    {
        var sut = new EmailNotificationStrategy(NullLogger<EmailNotificationStrategy>.Instance);
        sut.Channel.Should().Be(NotificationChannel.Email);

        var result = await sut.SendAsync(CtxWithPhone());

        result.Should().BeTrue();
    }

    [Fact]
    public async Task Sms_strategy_returns_false_when_phone_missing()
    {
        var sut = new SmsNotificationStrategy(NullLogger<SmsNotificationStrategy>.Instance);

        var result = await sut.SendAsync(CtxNoPhone());

        result.Should().BeFalse();
    }

    [Fact]
    public async Task Sms_strategy_returns_true_when_phone_present()
    {
        var sut = new SmsNotificationStrategy(NullLogger<SmsNotificationStrategy>.Instance);

        var result = await sut.SendAsync(CtxWithPhone());

        result.Should().BeTrue();
    }

    [Fact]
    public async Task InApp_strategy_writes_to_audit_repository()
    {
        var audit = new Mock<IAuditRepository>();
        var sut = new InAppNotificationStrategy(audit.Object, NullLogger<InAppNotificationStrategy>.Instance);

        var result = await sut.SendAsync(CtxWithPhone());

        result.Should().BeTrue();
        audit.Verify(a => a.AddEntryAsync(It.IsAny<TaskFlow.Domain.Entities.AuditEntry>(), default), Times.Once);
    }

    [Fact]
    public void Each_strategy_has_unique_channel()
    {
        var email = new EmailNotificationStrategy(NullLogger<EmailNotificationStrategy>.Instance);
        var sms = new SmsNotificationStrategy(NullLogger<SmsNotificationStrategy>.Instance);
        var inApp = new InAppNotificationStrategy(Mock.Of<IAuditRepository>(), NullLogger<InAppNotificationStrategy>.Instance);

        new[] { email.Channel, sms.Channel, inApp.Channel }.Should().OnlyHaveUniqueItems();
    }
}

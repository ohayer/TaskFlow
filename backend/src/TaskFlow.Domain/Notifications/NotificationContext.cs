namespace TaskFlow.Domain.Notifications;

public record NotificationContext(
    Guid RecipientUserId,
    string RecipientEmail,
    string? RecipientPhoneNumber,
    string Subject,
    string Body,
    string? RelatedEntityType = null,
    string? RelatedEntityId = null
);

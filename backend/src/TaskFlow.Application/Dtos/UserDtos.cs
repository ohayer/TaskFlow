using TaskFlow.Domain.Enums;

namespace TaskFlow.Application.Dtos;

public record UserDto(Guid Id, string Email, string DisplayName, NotificationChannel NotificationPreference);
public record UpdateNotificationPreferenceDto(NotificationChannel Channel, string? PhoneNumber);

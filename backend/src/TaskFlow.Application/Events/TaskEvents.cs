namespace TaskFlow.Application.Events;

public sealed class TaskAssignedEventArgs : EventArgs
{
    public Guid TaskId { get; init; }
    public Guid AssigneeId { get; init; }
}

public static class TaskEvents
{
    // Zdarzenia (events) — subskrybenci mogą reagować na przypisanie zadania
    public static event EventHandler<TaskAssignedEventArgs>? TaskAssigned;

    public static void RaiseTaskAssigned(TaskAssignedEventArgs args) =>
        TaskAssigned?.Invoke(null, args);
}

namespace TaskFlow.Application.Extensions;

public static class StringExtensions
{
    // metody rozszerzające
    public static string TrimOrEmpty(this string? value) =>
        string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
}

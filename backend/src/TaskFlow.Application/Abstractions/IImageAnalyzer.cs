namespace TaskFlow.Application.Abstractions;

public record ImageAnalysisResult(IReadOnlyList<string> Tags, string? Caption);

public interface IImageAnalyzer
{
    Task<ImageAnalysisResult?> AnalyzeAsync(Stream imageStream, CancellationToken ct = default);
}

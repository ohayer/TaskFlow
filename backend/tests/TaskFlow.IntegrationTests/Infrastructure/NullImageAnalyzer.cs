using TaskFlow.Application.Abstractions;

namespace TaskFlow.IntegrationTests.Infrastructure;

public class NullImageAnalyzer : IImageAnalyzer
{
    public Task<ImageAnalysisResult?> AnalyzeAsync(Stream imageStream, CancellationToken ct = default)
        => Task.FromResult<ImageAnalysisResult?>(null);
}

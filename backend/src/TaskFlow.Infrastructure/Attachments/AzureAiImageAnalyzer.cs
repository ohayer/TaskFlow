using Azure;
using Azure.AI.Vision.ImageAnalysis;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TaskFlow.Application.Abstractions;
using TaskFlow.Infrastructure.Auth;
using AppAnalysisResult = TaskFlow.Application.Abstractions.ImageAnalysisResult;

namespace TaskFlow.Infrastructure.Attachments;

public class AzureAiImageAnalyzer : IImageAnalyzer
{
    private readonly ImageAnalysisClient? _client;
    private readonly ILogger<AzureAiImageAnalyzer> _logger;

    public bool IsConfigured => _client is not null;
    public string? Endpoint { get; }

    public AzureAiImageAnalyzer(IOptions<AiVisionSettings> settings, ILogger<AzureAiImageAnalyzer> logger)
    {
        _logger = logger;
        var s = settings.Value;
        Endpoint = s.Endpoint;
        if (string.IsNullOrWhiteSpace(s.Endpoint) || string.IsNullOrWhiteSpace(s.Key))
        {
            _logger.LogWarning("[AI Vision] NIE skonfigurowane - brak AiVision:Endpoint lub AiVision:Key w user-secrets/Key Vault. Analyzer bedzie no-op (tagi zawsze null)");
            _client = null;
            return;
        }
        _logger.LogInformation("[AI Vision] Skonfigurowane: endpoint={Endpoint}, klucz dlugosci={KeyLen}", s.Endpoint, s.Key.Length);
        _client = new ImageAnalysisClient(new Uri(s.Endpoint), new AzureKeyCredential(s.Key));
    }

    public async Task<AppAnalysisResult?> AnalyzeAsync(Stream imageStream, CancellationToken ct = default)
    {
        if (_client is null)
        {
            _logger.LogWarning("[AI Vision] AnalyzeAsync wywolane ale klient null - sekrety nie skonfigurowane");
            return null;
        }

        try
        {
            var ms = new MemoryStream();
            await imageStream.CopyToAsync(ms, ct);
            var sizeKb = ms.Length / 1024.0;
            ms.Position = 0;

            _logger.LogInformation("[AI Vision] Wysylam obraz {SizeKb:F1}KB do {Endpoint}", sizeKb, Endpoint);

            // UWAGA: VisualFeatures.Caption NIE jest wspierane w regionie 'swedencentral'
            // (zwraca HTTP 400 'feature is not supported in this region').
            // Caption dziala m.in. w eastus/westus/westeurope/koreacentral/southeastasia.
            // W swedencentral wywolujemy tylko Tags.
            var result = await _client.AnalyzeAsync(
                BinaryData.FromStream(ms),
                VisualFeatures.Tags,
                cancellationToken: ct);

            var allTags = result.Value.Tags?.Values?.ToList() ?? new();
            var tags = allTags
                .Where(t => t.Confidence >= 0.5)                                // tylko pewne tagi
                .Select(t => t.Name)
                .Take(10)
                .ToList();
            string? caption = null;                                             // Caption nie wspierane w swedencentral - zostaje null

            _logger.LogInformation("[AI Vision] OK - wszystkich tagow={All}, po filtrze conf>=0.5={Filtered}, caption='{Caption}'",
                allTags.Count, tags.Count, caption);
            return new AppAnalysisResult(tags, caption);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AI Vision] BLAD wywolania AnalyzeAsync - sprawdz quota F0 (5000/mies), region (swedencentral) i klucz");
            return null;
        }
    }
}

using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using TaskFlow.Application.Abstractions;
using TaskFlow.Domain.Attachments;
using TaskFlow.Infrastructure.Attachments;

namespace TaskFlow.UnitTests.Strategies;

internal class NoopImageAnalyzer : IImageAnalyzer
{
    public Task<ImageAnalysisResult?> AnalyzeAsync(Stream imageStream, CancellationToken ct = default)
        => Task.FromResult<ImageAnalysisResult?>(null);
}

internal class NoopBlobStorage : IAttachmentBlobStorage
{
    public Task<string> UploadAsync(string fileName, string mimeType, Stream content, CancellationToken ct = default) => Task.FromResult($"https://test/{fileName}");
    public Task<Stream> DownloadAsync(string blobName, CancellationToken ct = default) => Task.FromResult<Stream>(new MemoryStream());
    public Task DeleteByUrlAsync(string blobUrl, CancellationToken ct = default) => Task.CompletedTask;
    public Task<string> UploadThumbnailAsync(string fileName, string mimeType, Stream content, CancellationToken ct = default) => Task.FromResult($"https://test/thumb/{fileName}");
    public string GenerateReadSasUrl(string blobUrl, TimeSpan validFor) => $"{blobUrl}?sas=test";
}

public class AttachmentProcessorTests
{
    [Theory]
    [InlineData("image/jpeg", true)]
    [InlineData("image/png", true)]
    [InlineData("image/gif", true)]
    [InlineData("application/pdf", false)]
    [InlineData("text/plain", false)]
    public void ImageProcessor_recognizes_image_mime_types_only(string mime, bool expected)
    {
        var sut = new ImageThumbnailProcessor(new NoopImageAnalyzer(), new NoopBlobStorage(), NullLogger<ImageThumbnailProcessor>.Instance);
        sut.CanProcess(mime).Should().Be(expected);
    }

    [Theory]
    [InlineData("application/pdf", true)]
    [InlineData("image/jpeg", false)]
    [InlineData("text/plain", false)]
    public void PdfProcessor_recognizes_pdf_only(string mime, bool expected)
    {
        var sut = new PdfPreviewProcessor(NullLogger<PdfPreviewProcessor>.Instance);
        sut.CanProcess(mime).Should().Be(expected);
    }

    [Fact]
    public void GenericProcessor_accepts_anything()
    {
        var sut = new GenericFileProcessor(NullLogger<GenericFileProcessor>.Instance);

        sut.CanProcess("application/zip").Should().BeTrue();
        sut.CanProcess("video/mp4").Should().BeTrue();
        sut.CanProcess("anything/whatever").Should().BeTrue();
    }

    [Fact]
    public async Task ImageProcessor_produces_thumbnail_url()
    {
        var sut = new ImageThumbnailProcessor(new NoopImageAnalyzer(), new NoopBlobStorage(), NullLogger<ImageThumbnailProcessor>.Instance);
        var stream = new MemoryStream(new byte[] { 1, 2, 3 });

        var result = await sut.ProcessAsync(stream, "photo.jpg", "image/jpeg");

        result.Success.Should().BeTrue();
        result.ThumbnailUrl.Should().NotBeNullOrEmpty();
        result.ThumbnailUrl.Should().Contain("photo");
    }

    [Fact]
    public async Task GenericProcessor_returns_no_thumbnail()
    {
        var sut = new GenericFileProcessor(NullLogger<GenericFileProcessor>.Instance);
        var stream = new MemoryStream(new byte[] { 0 });

        var result = await sut.ProcessAsync(stream, "data.zip", "application/zip");

        result.Success.Should().BeTrue();
        result.ThumbnailUrl.Should().BeNull();
    }

    [Fact]
    public void Selecting_processor_by_mime_type_picks_first_match()
    {
        // Symuluje selection logic z AttachmentBlobTrigger
        var processors = new IAttachmentProcessor[]
        {
            new ImageThumbnailProcessor(new NoopImageAnalyzer(), new NoopBlobStorage(), NullLogger<ImageThumbnailProcessor>.Instance),
            new PdfPreviewProcessor(NullLogger<PdfPreviewProcessor>.Instance),
            new GenericFileProcessor(NullLogger<GenericFileProcessor>.Instance)
        };

        var imageProc = processors.FirstOrDefault(p => p.CanProcess("image/png"));
        var pdfProc = processors.FirstOrDefault(p => p.CanProcess("application/pdf"));
        var fallback = processors.FirstOrDefault(p => p.CanProcess("application/zip"));

        imageProc.Should().BeOfType<ImageThumbnailProcessor>();
        pdfProc.Should().BeOfType<PdfPreviewProcessor>();
        fallback.Should().BeOfType<GenericFileProcessor>();
    }
}

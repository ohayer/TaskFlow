using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TaskFlow.Application.Abstractions;
using TaskFlow.Domain.Repositories;
using TaskFlow.Infrastructure.Persistence;

namespace TaskFlow.IntegrationTests.Infrastructure;

public class TestWebAppFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"TaskFlowTests-{Guid.NewGuid():N}";

    static TestWebAppFactory()
    {
        // Program.cs reads these via `builder.Configuration[...]` at startup — they MUST exist
        // before Main runs, so set them as env vars (double-underscore = ":" in keys).
        SetIfMissing("Jwt__Secret", "test-secret-key-at-least-32-bytes-long-for-hmac-sha256!!");
        SetIfMissing("Jwt__Issuer", "TaskFlow.Tests");
        SetIfMissing("Jwt__Audience", "TaskFlow.Tests");
        SetIfMissing("ConnectionStrings__Sql", "Server=fake;Database=fake;Trusted_Connection=True;");
        SetIfMissing("ConnectionStrings__Cosmos", "AccountEndpoint=https://fake/;AccountKey=ZmFrZQ==;");
        SetIfMissing("ConnectionStrings__Redis", "localhost:6379,abortConnect=False");
        SetIfMissing("ConnectionStrings__Storage", "UseDevelopmentStorage=true");
        SetIfMissing("ConnectionStrings__ServiceBus", "Endpoint=sb://fake.servicebus.windows.net/;SharedAccessKeyName=k;SharedAccessKey=ZmFrZQ==");
        SetIfMissing("AiVision__Endpoint", "https://fake.cognitiveservices.azure.com/");
        SetIfMissing("AiVision__Key", "fake");
    }

    private static void SetIfMissing(string key, string value)
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
            Environment.SetEnvironmentVariable(key, value);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Non-Development to skip Program.cs dev block (MigrateAsync + IImageAnalyzer eager resolve).
        builder.UseEnvironment("Testing");

        builder.ConfigureTestServices(services =>
        {
            ReplaceDbContextWithInMemory(services);

            Replace<IAuditRepository, InMemoryAuditRepository>(services, ServiceLifetime.Scoped);
            Replace<ITaskListCache, InMemoryTaskListCache>(services, ServiceLifetime.Singleton);
            Replace<IAttachmentBlobStorage, FakeAttachmentBlobStorage>(services, ServiceLifetime.Singleton);
            Replace<IReportExporter, FakeReportExporter>(services, ServiceLifetime.Singleton);
            Replace<IImageAnalyzer, NullImageAnalyzer>(services, ServiceLifetime.Singleton);
        });
    }

    private void ReplaceDbContextWithInMemory(IServiceCollection services)
    {
        var toRemove = services
            .Where(d =>
                d.ServiceType == typeof(DbContextOptions<TaskFlowDbContext>) ||
                d.ServiceType == typeof(DbContextOptions) ||
                d.ServiceType == typeof(TaskFlowDbContext))
            .ToList();
        foreach (var d in toRemove) services.Remove(d);

        services.AddDbContext<TaskFlowDbContext>(opt => opt.UseInMemoryDatabase(_dbName));
    }

    private static void Replace<TService, TImpl>(IServiceCollection services, ServiceLifetime lifetime)
        where TService : class
        where TImpl : class, TService
    {
        var existing = services.Where(d => d.ServiceType == typeof(TService)).ToList();
        foreach (var d in existing) services.Remove(d);
        services.Add(new ServiceDescriptor(typeof(TService), typeof(TImpl), lifetime));
    }
}

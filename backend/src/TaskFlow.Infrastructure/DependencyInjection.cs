using Azure.Messaging.ServiceBus;
using Azure.Storage.Blobs;
using Azure.Storage.Files.Shares;
using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TaskFlow.Application.Abstractions;
using TaskFlow.Domain.Attachments;
using TaskFlow.Domain.Notifications;
using TaskFlow.Domain.Repositories;
using TaskFlow.Infrastructure.Attachments;
using TaskFlow.Infrastructure.Auth;
using TaskFlow.Infrastructure.Caching;
using TaskFlow.Infrastructure.Messaging;
using TaskFlow.Infrastructure.Notifications;
using TaskFlow.Infrastructure.Persistence;
using TaskFlow.Infrastructure.Repositories;
using TaskFlow.Infrastructure.Storage;

namespace TaskFlow.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddTaskFlowInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // SQL via EF Core
        services.AddDbContext<TaskFlowDbContext>(opt =>
            opt.UseSqlServer(config.GetConnectionString("Sql") ?? throw new InvalidOperationException("ConnectionStrings:Sql missing")));

        // Repository Pattern - rejestracja konkretnych implementacji za interfejsami
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddScoped<IProjectRepository, EfProjectRepository>();
        services.AddScoped<ITaskRepository, EfTaskRepository>();

        // Cosmos
        services.AddSingleton(_ =>
        {
            var conn = config.GetConnectionString("Cosmos") ?? throw new InvalidOperationException("ConnectionStrings:Cosmos missing");
            return new CosmosClient(conn, new CosmosClientOptions { SerializerOptions = new CosmosSerializationOptions { PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase } });
        });
        services.AddScoped<IAuditRepository>(sp => new CosmosAuditRepository(sp.GetRequiredService<CosmosClient>(), "taskflow", "audit-log"));

        // Redis (cache list zadań — wymóg z wymagania.txt)
        services.AddStackExchangeRedisCache(opt =>
        {
            opt.Configuration = config.GetConnectionString("Redis") ?? throw new InvalidOperationException("ConnectionStrings:Redis missing");
            opt.InstanceName = "taskflow:";
        });
        services.AddSingleton<ITaskListCache, RedisTaskListCache>();

        // Blob Storage
        services.AddSingleton(_ =>
        {
            var conn = config.GetConnectionString("Storage") ?? throw new InvalidOperationException("ConnectionStrings:Storage missing");
            return new BlobServiceClient(conn);
        });
        services.AddSingleton<IAttachmentBlobStorage, AttachmentBlobStorage>();

        // Azure Files (eksport raportow CSV)
        services.AddSingleton(_ =>
        {
            var conn = config.GetConnectionString("Storage") ?? throw new InvalidOperationException("ConnectionStrings:Storage missing");
            return new ShareServiceClient(conn);
        });
        services.AddSingleton<IReportExporter, AzureFilesReportExporter>();

        // Service Bus
        services.AddSingleton(_ =>
        {
            var conn = config.GetConnectionString("ServiceBus") ?? throw new InvalidOperationException("ConnectionStrings:ServiceBus missing");
            return new ServiceBusClient(conn);
        });
        services.AddSingleton<INotificationPublisher, ServiceBusNotificationPublisher>();

        // Strategy Pattern: notyfikacje (rejestracja wszystkich strategii — serwis wybiera po kanale)
        services.AddScoped<INotificationStrategy, EmailNotificationStrategy>();
        services.AddScoped<INotificationStrategy, SmsNotificationStrategy>();
        services.AddScoped<INotificationStrategy, InAppNotificationStrategy>();

        // Strategy Pattern: procesory załączników (Function App wybiera po MIME type)
        services.AddScoped<IAttachmentProcessor, ImageThumbnailProcessor>();
        services.AddScoped<IAttachmentProcessor, PdfPreviewProcessor>();
        services.AddScoped<IAttachmentProcessor, GenericFileProcessor>();          // fallback - musi być rejestrowany ostatni

        // Auth: BCrypt + JWT
        services.Configure<JwtSettings>(config.GetSection("Jwt"));
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();

        // Azure AI Vision (auto-tagowanie zalacznikow)
        services.Configure<AiVisionSettings>(config.GetSection("AiVision"));
        services.AddSingleton<IImageAnalyzer, AzureAiImageAnalyzer>();

        return services;
    }
}

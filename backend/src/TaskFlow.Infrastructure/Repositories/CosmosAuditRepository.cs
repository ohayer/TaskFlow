using Microsoft.Azure.Cosmos;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Repositories;

namespace TaskFlow.Infrastructure.Repositories;

public class CosmosAuditRepository : IAuditRepository
{
    private readonly Container _container;

    public CosmosAuditRepository(CosmosClient client, string databaseName, string containerName)
    {
        _container = client.GetContainer(databaseName, containerName);
    }

    public async Task AddEntryAsync(AuditEntry entry, CancellationToken ct = default)
    {
        await _container.CreateItemAsync(entry, new PartitionKey(entry.ProjectId), cancellationToken: ct);
    }

    public async Task<IReadOnlyList<AuditEntry>> ListByTaskAsync(Guid projectId, Guid taskId, int limit = 50, CancellationToken ct = default)
    {
        var query = new QueryDefinition($"SELECT TOP @limit * FROM c WHERE c.taskId = @taskId ORDER BY c.timestamp DESC")
            .WithParameter("@taskId", taskId.ToString())
            .WithParameter("@limit", limit);

        var iterator = _container.GetItemQueryIterator<AuditEntry>(
            query,
            requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(projectId.ToString()) });

        var results = new List<AuditEntry>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync(ct));
        return results;
    }

    public async Task<IReadOnlyList<AuditEntry>> ListByProjectAsync(Guid projectId, int limit = 100, CancellationToken ct = default)
    {
        var query = new QueryDefinition("SELECT TOP @limit * FROM c ORDER BY c.timestamp DESC")
            .WithParameter("@limit", limit);

        var iterator = _container.GetItemQueryIterator<AuditEntry>(
            query,
            requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(projectId.ToString()) });

        var results = new List<AuditEntry>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync(ct));
        return results;
    }

    public async Task<IReadOnlyList<AuditEntry>> ListByUserInProjectAsync(Guid projectId, Guid userId, int limit = 100, CancellationToken ct = default)
    {
        // PartitionKey = projectId, filter po performedById (Cosmos serializuje Guid jako string)
        var query = new QueryDefinition("SELECT TOP @limit * FROM c WHERE c.performedById = @userId ORDER BY c.timestamp DESC")
            .WithParameter("@userId", userId.ToString())
            .WithParameter("@limit", limit);

        var iterator = _container.GetItemQueryIterator<AuditEntry>(
            query,
            requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(projectId.ToString()) });

        var results = new List<AuditEntry>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync(ct));
        return results;
    }
}

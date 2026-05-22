using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using TaskFlow.Application.Abstractions;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Infrastructure.Caching;
public class RedisTaskListCache : ITaskListCache
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<RedisTaskListCache> _logger;
    private static readonly TimeSpan DefaultTtl = TimeSpan.FromMinutes(5);

    public RedisTaskListCache(IDistributedCache cache, ILogger<RedisTaskListCache> logger)
    {
        _cache = cache;
        _logger = logger;
    }
    private static string Key(Guid projectId) => $"project:{projectId}:tasks";

    public async Task<IReadOnlyList<TaskItem>?> GetTasksAsync(Guid projectId, CancellationToken ct = default)
    {
        try
        {
            var bytes = await _cache.GetAsync(Key(projectId), ct);
            if (bytes is null) return null;
            return JsonSerializer.Deserialize<List<TaskItem>>(bytes);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache read failed for project {ProjectId}", projectId);
            return null;
        }
    }
    public async Task SetTasksAsync(Guid projectId, IReadOnlyList<TaskItem> tasks, CancellationToken ct = default)
    {
        try
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(tasks);
            await _cache.SetAsync(Key(projectId), bytes, new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = DefaultTtl }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache write failed for project {ProjectId}", projectId);
        }
    }
    public async Task InvalidateAsync(Guid projectId, CancellationToken ct = default)
    {
        try
        {
            await _cache.RemoveAsync(Key(projectId), ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache invalidation failed for project {ProjectId}", projectId);
        }
    }
}

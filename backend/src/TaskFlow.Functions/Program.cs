using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using TaskFlow.Application;
using TaskFlow.Infrastructure;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureAppConfiguration(c =>
    {
        c.AddEnvironmentVariables();
    })
    .ConfigureServices((context, services) =>
    {
        services.AddTaskFlowApplication();
        services.AddTaskFlowInfrastructure(context.Configuration);
    })
    .Build();

await host.RunAsync();

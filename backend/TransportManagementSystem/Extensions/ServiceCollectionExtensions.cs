using TransportManagementSystem.Repositories;
using TransportManagementSystem.Services;

namespace TransportManagementSystem.Extensions;

public static class ServiceCollectionExtensions
{

    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Camion
        services.AddScoped<ICamionRepository, CamionRepository>();
        services.AddScoped<ICamionService, CamionService>();

        return services;
    }
}

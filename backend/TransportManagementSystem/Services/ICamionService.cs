using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Services;

public interface ICamionService
{
    Task<IEnumerable<Camion>> GetAllAsync();
    Task<Camion> GetByIdAsync(int id);
    Task AddAsync(Camion camion);
    Task UpdateAsync(Camion camion);
    Task DeleteAsync(int id);
}

using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Data;

public interface ICamionRepository
{
    Task<IEnumerable<Camion>> GetAllAsync();
    Task<Camion> GetByIdAsync(int id);
    Task AddAsync(Camion camion);
    Task UpdateAsync(Camion camion);
    Task DeleteAsync(int id);
}

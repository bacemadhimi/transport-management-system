using TransportManagementSystem.Entity;
using TransportManagementSystem.Repositories;

namespace TransportManagementSystem.Services;

public class CamionService : ICamionService
{
    private readonly ICamionRepository _repository;

    public CamionService(ICamionRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<Camion>> GetAllAsync() => await _repository.GetAllAsync();

    public async Task<Camion> GetByIdAsync(int id) => await _repository.GetByIdAsync(id);

    public async Task AddAsync(Camion camion) => await _repository.AddAsync(camion);

    public async Task UpdateAsync(Camion camion) => await _repository.UpdateAsync(camion);

    public async Task DeleteAsync(int id) => await _repository.DeleteAsync(id);
}

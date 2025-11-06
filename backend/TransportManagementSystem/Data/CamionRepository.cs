using TransportManagementSystem.Entity;
using Microsoft.EntityFrameworkCore;


namespace TransportManagementSystem.Data;

public class CamionRepository : ICamionRepository
{
    private readonly ApplicationDbContext _context;

    public CamionRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Camion>> GetAllAsync()
    {
        return await _context.Camions.ToListAsync();
    }

    public async Task<Camion> GetByIdAsync(int id)
    {
        return await _context.Camions.FindAsync(id);
    }

    public async Task AddAsync(Camion camion)
    {
        _context.Camions.Add(camion);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Camion camion)
    {
        _context.Camions.Update(camion);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var camion = await _context.Camions.FindAsync(id);
        if (camion != null)
        {
            _context.Camions.Remove(camion);
            await _context.SaveChangesAsync();
        }
    }
}

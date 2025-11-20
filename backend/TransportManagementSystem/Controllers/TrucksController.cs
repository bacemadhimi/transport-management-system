using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Data; 
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TrucksController : ControllerBase
{
    private readonly IRepository<Truck> TruckRepository;

    public TrucksController(IRepository<Truck> TruckRepository)
    {
        this.TruckRepository = TruckRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Truck>>> GetAll()
    {
        var Trucks = await TruckRepository.GetAll();
        return Ok(Trucks);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Truck>> Get(int id)
    {
        var Truck = await TruckRepository.FindByIdAsync(id);
        if (Truck is null)
            return NotFound();

        return Ok(Truck);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] TruckDto dto)
    {
        var Truck = new Truck
        {
            Immatriculation = dto.Immatriculation,
            Capacity = dto.Capacity,
            TechnicalVisitDate = dto.TechnicalVisitDate,
            Brand = dto.Brand,
            Status = dto.Status
        };

        await TruckRepository.AddAsync(Truck);
        await TruckRepository.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = Truck.Id }, Truck);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, [FromBody] TruckDto dto)
    {
        var Truck = await TruckRepository.FindByIdAsync(id);
        if (Truck is null)
            return NotFound();

        Truck.Immatriculation = dto.Immatriculation;
        Truck.Capacity = dto.Capacity;
        Truck.TechnicalVisitDate = dto.TechnicalVisitDate;
        Truck.Brand = dto.Brand;
        Truck.Status = dto.Status;

        TruckRepository.Update(Truck);
        await TruckRepository.SaveChangesAsync();

        return Ok(new
        {
            message = "Truck updated successfully",
            Truck
        });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var Truck = await TruckRepository.FindByIdAsync(id);

        if (Truck is null)
            return NotFound(); 

        await TruckRepository.DeleteAsync(id);
        await TruckRepository.SaveChangesAsync();

        return Ok(new
        {
            message = "Truck deleted successfully",
            id
        });
    }

}

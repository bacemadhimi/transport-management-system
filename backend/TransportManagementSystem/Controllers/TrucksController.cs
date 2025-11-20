using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
//[Authorize]
public class TrucksController : ControllerBase
{
    private readonly IRepository<Truck> truckRepository;

    public TrucksController(IRepository<Truck> truckRepository)
    {
        this.truckRepository = truckRepository;
    }


    [HttpGet]
    public async Task<IActionResult> GetTrucks([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<Truck>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await truckRepository.GetAll();
        }
        else
        {
            DateTime? searchDate = null;

            if (DateTime.TryParseExact(searchOption.Search, "dd/MM/yyyy", null, System.Globalization.DateTimeStyles.None, out var parsedDate))
            {
                searchDate = parsedDate.Date;
            }

            pagedData.Data = await truckRepository.GetAll(x =>
                x.Brand.Contains(searchOption.Search) ||
                x.Immatriculation.Contains(searchOption.Search) ||
                x.Status.Contains(searchOption.Search) ||
                x.Capacity.ToString().Contains(searchOption.Search) ||
                (searchDate.HasValue && x.TechnicalVisitDate.Date == searchDate.Value)
            );
        }

        pagedData.TotalData = pagedData.Data.Count;

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            pagedData.Data = pagedData.Data
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value)
                .ToList();
        }

        return Ok(pagedData);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTruckById(int id)
    {
        var truck = await truckRepository.FindByIdAsync(id);
        if (truck == null)
        {
            return NotFound();
        }
        return Ok(truck);
    }

    [HttpPost]
    public async Task<IActionResult> AddTruck([FromBody] TruckDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existingTruck = (await truckRepository.GetAll(x => x.Immatriculation == model.Immatriculation))
                            .FirstOrDefault();

        if (existingTruck != null)
            return BadRequest("Un camion avec cette immatriculation existe déjà");

        var truck = new Truck
        {
            Immatriculation = model.Immatriculation,
            Capacity = model.Capacity,
            TechnicalVisitDate = model.TechnicalVisitDate,
            Brand = model.Brand,
            Status = model.Status
        };

        await truckRepository.AddAsync(truck);
        await truckRepository.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTruckById), new { id = truck.Id }, truck);
    }


    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTruck(int id, [FromBody] TruckDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var truck = await truckRepository.FindByIdAsync(id);
        if (truck == null)
            return NotFound();

        var existingTruck = (await truckRepository.GetAll(x =>
                    x.Immatriculation == model.Immatriculation && x.Id != id))
                    .FirstOrDefault();

        if (existingTruck != null)
            return BadRequest("Un camion avec cette immatriculation existe déjà");

        truck.Immatriculation = model.Immatriculation;
        truck.Capacity = model.Capacity;
        truck.TechnicalVisitDate = model.TechnicalVisitDate;
        truck.Brand = model.Brand;
        truck.Status = model.Status;

        truckRepository.Update(truck);
        await truckRepository.SaveChangesAsync();

        return Ok(truck);
    }


    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTruck(int id)
    {
        var truck = await truckRepository.FindByIdAsync(id);
        if (truck == null)
            return NotFound();

        await truckRepository.DeleteAsync(id);
        await truckRepository.SaveChangesAsync();

        return Ok(new { message = "Le camion a été supprimé avec succès" });
    }
}

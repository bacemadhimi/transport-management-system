using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FuelController : ControllerBase
    {
        private readonly IRepository<Fuel> fuelRepository;

        public FuelController(IRepository<Fuel> fuelRepository)
        {
            this.fuelRepository = fuelRepository;
        }


        [HttpGet]
        public async Task<IActionResult> GetFuels([FromQuery] SearchOptions searchOption)
        {
            var pagedData = new PagedData<Fuel>();

            if (string.IsNullOrEmpty(searchOption.Search))
            {
                pagedData.Data = await fuelRepository.GetAll();
            }
            else
            {
                DateTime? searchDate = null;
                if (DateTime.TryParseExact(searchOption.Search, "dd/MM/yyyy", null, System.Globalization.DateTimeStyles.None, out var parsedDate))
                {
                    searchDate = parsedDate;
                }
                pagedData.Data = await fuelRepository.GetAll(f =>
                    (f.Driver != null && f.Driver.Name != null && f.Driver.Name.Contains(searchOption.Search)) ||
                    (f.Driver != null && f.Driver.PermisNumber != null && f.Driver.PermisNumber.Contains(searchOption.Search)) ||
                    (f.Comment != null && f.Comment.Contains(searchOption.Search)) ||
                    (f.FuelTank != null && f.FuelTank.Contains(searchOption.Search)) ||
                    (f.fuelVendor != null && f.fuelVendor.Name != null && f.fuelVendor.Name.Contains(searchOption.Search)) ||
                    (f.Quantity.HasValue && f.Quantity.Value.ToString().Contains(searchOption.Search)) ||
                    (f.Amount.HasValue && f.Amount.Value.ToString().Contains(searchOption.Search)) ||
                    (searchDate.HasValue && f.FillDate.HasValue && f.FillDate.Value.Date == searchDate.Value.Date)
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
        public async Task<ActionResult<Fuel>> GetFuelById(int id)
        {
            var fuel = await fuelRepository.FindByIdAsync(id);

            if (fuel == null)
                return NotFound(new
                {
                    message = $"Fuel with ID {id} was not found in the database.",
                    Status = 404
                });

            return Ok(fuel);
        }

        // Create
        [HttpPost]
        public async Task<IActionResult> CreateFuel([FromBody] FuelDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var fuel = new Fuel
            {
                TruckId = model.TruckId,
                DriverId = model.DriverId,
                FillDate = model.FillDate,
                Quantity = model.Quantity,
                OdometerReading = model.OdometerReading,
                Amount = model.Amount,
                Comment = model.Comment,
                FuelTank = model.FuelTank,
                FuelVendorId = model.FuelVendorId
            };

            await fuelRepository.AddAsync(fuel);
            await fuelRepository.SaveChangesAsync();
            return CreatedAtAction(nameof(GetFuelById), new { id = fuel.Id }, fuel);
        }

        // Update
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateFuel(int id, [FromBody] FuelDto fuelDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            var existingFuel = await fuelRepository.FindByIdAsync(id);
            if (existingFuel == null)
                return NotFound();  
            // Map DTO properties to entity
            existingFuel.TruckId = fuelDto.TruckId;
            existingFuel.DriverId = fuelDto.DriverId;
            existingFuel.FuelVendorId = fuelDto.FuelVendorId;
            existingFuel.FillDate = fuelDto.FillDate;
            existingFuel.Quantity = fuelDto.Quantity;
            existingFuel.OdometerReading = fuelDto.OdometerReading;
            existingFuel.Amount = fuelDto.Amount;
            existingFuel.Comment = fuelDto.Comment;
            existingFuel.FuelTank = fuelDto.FuelTank;

            await fuelRepository.SaveChangesAsync();
            return Ok(existingFuel);
        }

        // Delete
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFuel(int id)
        {
            var trip = await fuelRepository.FindByIdAsync(id);
            if (trip == null)
                return NotFound();
            await fuelRepository.DeleteAsync(id);
            await fuelRepository.SaveChangesAsync();
            return Ok(new { message = "Le dépôt de carburant a été supprimé avec succès" });
        }
    }
}

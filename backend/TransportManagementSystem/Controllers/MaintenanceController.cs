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
    public class MaintenanceController : ControllerBase
    {
        private readonly ApplicationDbContext dbContext;
        public MaintenanceController(ApplicationDbContext context)
        {
            dbContext = context;
        }

        [HttpGet("PaginationAndSearch")]
        public async Task<IActionResult> GetMaintenanceList([FromQuery] SearchOptions searchOption)
        {
            var query = dbContext.Maintenances.AsQueryable();

            if (!string.IsNullOrEmpty(searchOption.Search))
            {
                query = query.Where(x =>
                    (x.Status != null && x.Status.Contains(searchOption.Search)) ||
                    (x.ServiceDetails != null && x.ServiceDetails.Contains(searchOption.Search)) ||
                    (x.PartsName != null && x.PartsName.Contains(searchOption.Search)) ||
                    (x.Members != null && x.Members.Contains(searchOption.Search))
                );
            }

            var totalData = await query.CountAsync();

            if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
            {
                query = query
                    .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                    .Take(searchOption.PageSize.Value);
            }

            var pagedData = new PagedData<Maintenance>
            {
                Data = await query.ToListAsync(),
                TotalData = totalData
            };

            return Ok(pagedData);
        }


        //Get By Id
        [HttpGet("{id}")]
        public async Task<ActionResult<Maintenance>> GetMaintenanceById(int id)
        {
            var maintenance = await dbContext.Maintenances.FindAsync(id);

            if (maintenance == null)
                return NotFound(new
                {
                    message = $"Maintenance with ID {id} was not found in the database.",
                    Status = 404

                });
            return maintenance;
        }

        //Create
        [HttpPost]
        public async Task<IActionResult> AddMaintenance([FromBody] MaintenanceDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var maintenance = new Maintenance
            {
                TripId = model.TripId,
                VendorId = model.VendorId,
                MechaicId = model.MechaicId,
                Status = model.Status,
                StartDate = model.StartDate,
                EndDate = model.EndDate,
                OdometerReading = model.OdometerReading,
                TotalCost = model.TotalCost,
                ServiceDetails = model.ServiceDetails,
                PartsName = model.PartsName,
                Qty = model.Qty,
                NotificationType = model.NotificationType,
                Members = model.Members
            };

            dbContext.Maintenances.Add(maintenance);
            await dbContext.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMaintenanceById), new { id = maintenance.Id }, new
            {
                message = "Maintenance created successfully",
                Status = 201,
                Data = maintenance
            });
        }



        //Update
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMaintenance(int id, MaintenanceDto model)
        {
            var existingMaintenance = await dbContext.Maintenances.FindAsync(id);
            if (existingMaintenance == null)
            {
                return NotFound(new
                {
                    message = $"Maintenance with ID {id} was not found.",
                    Status = 404
                });
            }

            existingMaintenance.TripId = model.TripId;
            existingMaintenance.VendorId = model.VendorId;
            existingMaintenance.MechaicId = model.MechaicId;
            existingMaintenance.Status = model.Status;
            existingMaintenance.StartDate = model.StartDate;
            existingMaintenance.EndDate = model.EndDate;
            existingMaintenance.OdometerReading = model.OdometerReading;
            existingMaintenance.TotalCost = model.TotalCost;
            existingMaintenance.ServiceDetails = model.ServiceDetails;
            existingMaintenance.PartsName = model.PartsName;
            existingMaintenance.Qty = model.Qty;
            existingMaintenance.NotificationType = model.NotificationType;
            existingMaintenance.Members = model.Members;

            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Maintenance with ID {id} has been updated successfully.",
                Status = 200,
                Data = existingMaintenance
            });
        }

        //Delete
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMaintenance(int id)
        {
            // Find the driver by ID
            var existingMaintenance = await dbContext.Maintenances.FindAsync(id);

            if (existingMaintenance == null)
            {
                return NotFound(new
                {
                    message = $"Maintenance with ID {id} was not found.",
                    Status = 404
                });
            }

            // Remove the driver
            dbContext.Maintenances.Remove(existingMaintenance);
            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Maintenance with ID {id} has been deleted successfully.",
                Status = 200
            });
        }
    }
}

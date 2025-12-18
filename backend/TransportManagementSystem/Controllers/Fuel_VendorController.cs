using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class Fuel_VendorController : ControllerBase
    {
        private readonly ApplicationDbContext dbContext;
        public Fuel_VendorController(ApplicationDbContext context)
        {
            dbContext = context;
        }

        // Search + Pagination
        [HttpGet("search")]
        public async Task<IActionResult> GetFuelVendorList([FromQuery] SearchOptions searchOption)
        {
            var pagedData = new PagedData<Fuel_Vendor>();
            IQueryable<Fuel_Vendor> query = dbContext.Fuel_Vendors;
            if (!string.IsNullOrEmpty(searchOption.Search))
            {
                query = query.Where(x =>
                    x.Name != null && x.Name.Contains(searchOption.Search)
                );
            }

            // Total count BEFORE pagination
            pagedData.TotalData = await query.CountAsync();

            // Pagination
            if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
            {
                query = query
                    .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                    .Take(searchOption.PageSize.Value);
            }

            pagedData.Data = await query.ToListAsync();

            return Ok(pagedData);
        }

        // GET: api/FuelVendor
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var vendors = await dbContext.Fuel_Vendors.ToListAsync();
            return Ok(vendors);
        }

        // Get By Id
        [HttpGet("{id}")]
        public async Task<ActionResult<Fuel_Vendor>> GetFuelVendorById(int id)
        {
            var fuelVendor = await dbContext.Fuel_Vendors.FindAsync(id);

            if (fuelVendor == null)
                return NotFound(new
                {
                    message = $"Fuel Vendor with ID {id} was not found in the database.",
                    Status = 404
                });

            return fuelVendor;
        }

        //Create
        [HttpPost]
        public async Task<ActionResult<Driver>> CreateDriver(Fuel_Vendor fuel_Vendor)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            dbContext.Fuel_Vendors.Add(fuel_Vendor);
            await dbContext.SaveChangesAsync();

            if (fuel_Vendor.Id == 0)
                return BadRequest("Fuel Vendor ID was not generated. Something went wrong.");

            return CreatedAtAction(nameof(GetFuelVendorById), new { id = fuel_Vendor.Id }, fuel_Vendor);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDriver(int id, Fuel_Vendor fuel_Vendor)
        {
            var existingFuel_Vendor = await dbContext.Fuel_Vendors.FindAsync(id);
            // ID does NOT exist → show message
            if (existingFuel_Vendor == null)
            {
                return NotFound(new
                {
                    message = $"Fuel Vendor with ID {id} was not found.",
                    Status = 404
                });
            }

            // ID exists → update the driver
            existingFuel_Vendor.Name = fuel_Vendor.Name;

            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Fuel Vendor with ID {id} has been updated successfully.",
                Status = 200,
                Data = existingFuel_Vendor
            });
        }

        //Delete
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFuelVendor(int id)
        {
            // Find the fuel vendor by ID
            var existingFuelVendor = await dbContext.Fuel_Vendors.FindAsync(id);

            if (existingFuelVendor == null)
            {
                return NotFound(new
                {
                    message = $"Fuel Vendor with ID {id} was not found.",
                    Status = 404
                });
            }

            // Remove the fuel vendor
            dbContext.Fuel_Vendors.Remove(existingFuelVendor);
            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Fuel Vendor with ID {id} has been deleted successfully.",
                Status = 200
            });
        }

    }
}

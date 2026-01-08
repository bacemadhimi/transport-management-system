using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DriverController : ControllerBase
    {
        private readonly ApplicationDbContext dbContext;
        public DriverController(ApplicationDbContext context)
        {
            dbContext = context;
        }

        ////Search 
        //[HttpGet("Pagination and Search")]
        //public async Task<IActionResult> GetDriverList([FromQuery] SearchOptions searchOption)
        //{
        //    var pagedData = new PagedData<Driver>();

        //    if (string.IsNullOrEmpty(searchOption.Search))
        //    {
        //        pagedData.Data = await dbContext.Drivers.ToListAsync();
        //    }
        //    else
        //    {
        //        pagedData.Data = await dbContext.Drivers
        //            .Where(x =>
        //                (x.Name != null && x.Name.Contains(searchOption.Search)) ||
        //                (x.PermisNumber != null && x.PermisNumber.Contains(searchOption.Search)) ||
        //                x.Phone.ToString().Contains(searchOption.Search) ||
        //                (x.Status != null && x.Status.Contains(searchOption.Search)) ||
        //                x.IdCamion.ToString().Contains(searchOption.Search)
        //            )
        //            .ToListAsync();
        //    }

        //    pagedData.TotalData = pagedData.Data.Count;

        //    if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        //    {
        //        pagedData.Data = pagedData.Data
        //            .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
        //            .Take(searchOption.PageSize.Value)
        //            .ToList();
        //    }

        //    return Ok(pagedData);
        //}

        // Search enabled drivers
        [HttpGet("Pagination and Search")]
        public async Task<IActionResult> GetEnabledDriverList([FromQuery] SearchOptions searchOption)
        {
            var pagedData = new PagedData<Driver>();

            if (string.IsNullOrEmpty(searchOption.Search))
            {
                pagedData.Data = await dbContext.Drivers
                    .Where(x => x.IsEnable == true)
                    .ToListAsync();
            }
            else
            {
                pagedData.Data = await dbContext.Drivers
                    .Where(x => x.IsEnable == true &&
                       (
                           (x.Name != null && x.Name.Contains(searchOption.Search)) ||
                           (x.PermisNumber != null && x.PermisNumber.Contains(searchOption.Search)) ||
                           x.Phone.Contains(searchOption.Search) ||
                           (x.Status != null && x.Status.Contains(searchOption.Search)) ||
                           x.IdCamion.ToString().Contains(searchOption.Search)
                       )
                    )
                    .ToListAsync();
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


        //Get
        [HttpGet("ListOfDrivers")]
        public async Task<ActionResult<IEnumerable<Driver>>> GetDriver()
        {
            return await dbContext.Drivers.ToListAsync();
        }

        //Get By Id
        [HttpGet("{id}")]
        public async Task<ActionResult<Driver>> GetDriverById(int id)
        {
            var drivers = await dbContext.Drivers.FindAsync(id);

            if (drivers == null)
                return NotFound(new
                {
                    message = $"Driver with ID {id} was not found in the database.",
                    Status = 404

                });
            return drivers;
        }

        //Create
        [HttpPost]
        public async Task<ActionResult<Driver>> CreateDriver(Driver driver)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            dbContext.Drivers.Add(driver);
            await dbContext.SaveChangesAsync();

            if (driver.Id == 0)
                return BadRequest("Driver ID was not generated. Something went wrong.");

            return CreatedAtAction(nameof(GetDriverById), new { id = driver.Id }, driver);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDriver(int id, Driver driver)
        {
            var existingDriver = await dbContext.Drivers.FindAsync(id);
            // ID does NOT exist → show message
            if (existingDriver == null)
            {
                return NotFound(new
                {
                    message = $"Driver with ID {id} was not found.",
                    Status = 404
                });
            }

            // ID exists → update the driver
            existingDriver.Name = driver.Name;
            existingDriver.PermisNumber = driver.PermisNumber;
            existingDriver.Phone = driver.Phone;
            existingDriver.Status = driver.Status;
            existingDriver.IdCamion = driver.IdCamion;
            existingDriver.phoneCountry = driver.phoneCountry;
            existingDriver.IsEnable = driver.IsEnable;
            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Driver with ID {id} has been updated successfully.",
                Status = 200,
                Data = existingDriver
            });
        }

        //Delete
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDriver(int id)
        {
            // Find the driver by ID
            var existingDriver = await dbContext.Drivers.FindAsync(id);

            if (existingDriver == null)
            {
                return NotFound(new
                {
                    message = $"Driver with ID {id} was not found.",
                    Status = 404
                });
            }

            // Remove the driver
            dbContext.Drivers.Remove(existingDriver);
            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Driver with ID {id} has been deleted successfully.",
                Status = 200
            });
        }


        [HttpGet("{id}/availability")]
        public async Task<IActionResult> GetDriverAvailability(int id, [FromQuery] DateRangeRequest? dateRange = null)
        {
            var driver = await dbContext.Drivers.FindAsync(id);
            if (driver == null)
                return NotFound(new
                {
                    message = $"Driver with ID {id} was not found.",
                    Status = 404
                });

            // If using AvailabilityJson property
            var availabilityDict = new Dictionary<DateTime, bool>();

            if (!string.IsNullOrEmpty(driver.AvailabilityJson))
            {
                try
                {
                    availabilityDict = JsonSerializer.Deserialize<Dictionary<DateTime, bool>>(driver.AvailabilityJson);
                }
                catch
                {
                    availabilityDict = new Dictionary<DateTime, bool>();
                }
            }

            // Filter by date range if provided
            if (dateRange != null)
            {
                var filteredDict = availabilityDict
                    .Where(x => x.Key.Date >= dateRange.StartDate.Date && x.Key.Date <= dateRange.EndDate.Date)
                    .ToDictionary(x => x.Key, x => x.Value);

                return Ok(new
                {
                    driverId = id,
                    driverName = driver.Name,
                    availability = filteredDict,
                    totalDates = filteredDict.Count
                });
            }

            return Ok(new
            {
                driverId = id,
                driverName = driver.Name,
                availability = availabilityDict,
                totalDates = availabilityDict.Count
            });
        }

        // Update single date availability
        [HttpPut("{id}/availability")]
        public async Task<IActionResult> UpdateDriverAvailability(int id, [FromBody] DriverAvailabilityRequest request)
        {
            var driver = await dbContext.Drivers.FindAsync(id);
            if (driver == null)
                return NotFound(new
                {
                    message = $"Driver with ID {id} was not found.",
                    Status = 404
                });

            // Ensure date is stored without time component
            var dateKey = request.Date.Date;

            // Parse existing availability
            var availabilityDict = new Dictionary<DateTime, bool>();
            if (!string.IsNullOrEmpty(driver.AvailabilityJson))
            {
                try
                {
                    availabilityDict = JsonSerializer.Deserialize<Dictionary<DateTime, bool>>(driver.AvailabilityJson);
                }
                catch
                {
                    availabilityDict = new Dictionary<DateTime, bool>();
                }
            }

            // Update or add availability for the date
            availabilityDict[dateKey] = request.IsAvailable;

            // Serialize back to JSON
            driver.AvailabilityJson = JsonSerializer.Serialize(availabilityDict);
            driver.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Availability for driver {driver.Name} on {dateKey:yyyy-MM-dd} updated to {(request.IsAvailable ? "Available" : "Unavailable")}.",
                Status = 200,
                date = dateKey,
                isAvailable = request.IsAvailable
            });
        }

        // Bulk update availability for multiple dates
        [HttpPut("{id}/availability/bulk")]
        public async Task<IActionResult> UpdateBulkDriverAvailability(int id, [FromBody] BulkAvailabilityRequest request)
        {
            var driver = await dbContext.Drivers.FindAsync(id);
            if (driver == null)
                return NotFound(new
                {
                    message = $"Driver with ID {id} was not found.",
                    Status = 404
                });

            // Parse existing availability
            var availabilityDict = new Dictionary<DateTime, bool>();
            if (!string.IsNullOrEmpty(driver.AvailabilityJson))
            {
                try
                {
                    availabilityDict = JsonSerializer.Deserialize<Dictionary<DateTime, bool>>(driver.AvailabilityJson);
                }
                catch
                {
                    availabilityDict = new Dictionary<DateTime, bool>();
                }
            }

            // Update all specified dates
            foreach (var date in request.Dates)
            {
                var dateKey = date.Date;
                availabilityDict[dateKey] = request.IsAvailable;
            }

            // Serialize back to JSON
            driver.AvailabilityJson = JsonSerializer.Serialize(availabilityDict);
            driver.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Updated availability for {request.Dates.Count} dates for driver {driver.Name}.",
                Status = 200,
                datesUpdated = request.Dates.Count,
                isAvailable = request.IsAvailable
            });
        }

        // Get all drivers availability for specific dates (for the availability page)
        [HttpGet("availability/all")]
        public async Task<IActionResult> GetAllDriversAvailability([FromQuery] DateRangeRequest? dateRange = null)
        {
            // If no date range provided, default to next 30 days
            if (dateRange == null)
            {
                dateRange = new DateRangeRequest
                {
                    StartDate = DateTime.Today,
                    EndDate = DateTime.Today.AddDays(30)
                };
            }

            var drivers = await dbContext.Drivers.ToListAsync();
            var result = new List<object>();

            foreach (var driver in drivers)
            {
                var driverAvailability = new Dictionary<DateTime, bool>();

                if (!string.IsNullOrEmpty(driver.AvailabilityJson))
                {
                    try
                    {
                        driverAvailability = JsonSerializer.Deserialize<Dictionary<DateTime, bool>>(driver.AvailabilityJson);
                    }
                    catch
                    {
                        driverAvailability = new Dictionary<DateTime, bool>();
                    }
                }

                // Filter by date range
                var filteredAvailability = driverAvailability
                    .Where(x => x.Key.Date >= dateRange.StartDate.Date && x.Key.Date <= dateRange.EndDate.Date)
                    .ToDictionary(x => x.Key, x => x.Value);

                result.Add(new
                {
                    driverId = driver.Id,
                    driverName = driver.Name,
                    permisNumber = driver.PermisNumber,
                    phone = driver.Phone,
                    status = driver.Status,
                    availability = filteredAvailability,
                    totalAvailable = filteredAvailability.Count(x => x.Value),
                    totalDates = filteredAvailability.Count
                });
            }

            return Ok(new
            {
                dateRange = new { dateRange.StartDate, dateRange.EndDate },
                totalDrivers = drivers.Count,
                drivers = result
            });
        }

        // Clear availability for a driver (optional)
        [HttpDelete("{id}/availability")]
        public async Task<IActionResult> ClearDriverAvailability(int id, [FromQuery] DateTime? date = null)
        {
            var driver = await dbContext.Drivers.FindAsync(id);
            if (driver == null)
                return NotFound(new
                {
                    message = $"Driver with ID {id} was not found.",
                    Status = 404
                });

            if (string.IsNullOrEmpty(driver.AvailabilityJson))
            {
                return Ok(new
                {
                    message = "No availability data found for this driver.",
                    Status = 200
                });
            }

            // Parse existing availability
            var availabilityDict = new Dictionary<DateTime, bool>();
            try
            {
                availabilityDict = JsonSerializer.Deserialize<Dictionary<DateTime, bool>>(driver.AvailabilityJson);
            }
            catch
            {
                availabilityDict = new Dictionary<DateTime, bool>();
            }

            if (date.HasValue)
            {
                // Remove specific date
                var dateKey = date.Value.Date;
                if (availabilityDict.ContainsKey(dateKey))
                {
                    availabilityDict.Remove(dateKey);
                    driver.AvailabilityJson = JsonSerializer.Serialize(availabilityDict);
                    driver.UpdatedAt = DateTime.UtcNow;
                    await dbContext.SaveChangesAsync();

                    return Ok(new
                    {
                        message = $"Availability cleared for date {dateKey:yyyy-MM-dd}.",
                        Status = 200
                    });
                }
                else
                {
                    return Ok(new
                    {
                        message = $"No availability data found for date {dateKey:yyyy-MM-dd}.",
                        Status = 200
                    });
                }
            }
            else
            {
                // Clear all availability
                driver.AvailabilityJson = null;
                driver.UpdatedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync();

                return Ok(new
                {
                    message = "All availability data cleared for this driver.",
                    Status = 200
                });
            }
        }

        // Get driver availability status for specific date
        [HttpGet("{id}/availability/{date}")]
        public async Task<IActionResult> GetDriverAvailabilityForDate(int id, DateTime date)
        {
            var driver = await dbContext.Drivers.FindAsync(id);
            if (driver == null)
                return NotFound(new
                {
                    message = $"Driver with ID {id} was not found.",
                    Status = 404
                });

            var dateKey = date.Date;
            var isAvailable = false; // Default to unavailable

            if (!string.IsNullOrEmpty(driver.AvailabilityJson))
            {
                try
                {
                    var availabilityDict = JsonSerializer.Deserialize<Dictionary<DateTime, bool>>(driver.AvailabilityJson);
                    if (availabilityDict.ContainsKey(dateKey))
                    {
                        isAvailable = availabilityDict[dateKey];
                    }
                }
                catch
                {
                    // If JSON is corrupted, treat as unavailable
                }
            }

            return Ok(new
            {
                driverId = id,
                driverName = driver.Name,
                date = dateKey,
                isAvailable,
                status = isAvailable ? "Available" : "Unavailable"
            });
        }

        // Get available drivers for specific date
        [HttpGet("available/{date}")]
        public async Task<IActionResult> GetAvailableDriversForDate(DateTime date)
        {
            var dateKey = date.Date;
            var drivers = await dbContext.Drivers.ToListAsync();
            var availableDrivers = new List<object>();

            foreach (var driver in drivers)
            {
                var isAvailable = false;

                if (!string.IsNullOrEmpty(driver.AvailabilityJson))
                {
                    try
                    {
                        var availabilityDict = JsonSerializer.Deserialize<Dictionary<DateTime, bool>>(driver.AvailabilityJson);
                        if (availabilityDict.ContainsKey(dateKey))
                        {
                            isAvailable = availabilityDict[dateKey];
                        }
                    }
                    catch
                    {
                        // If JSON is corrupted, treat as unavailable
                    }
                }

                if (isAvailable)
                {
                    availableDrivers.Add(new
                    {
                        driverId = driver.Id,
                        driverName = driver.Name,
                        permisNumber = driver.PermisNumber,
                        phone = driver.Phone,
                        status = driver.Status
                    });
                }
            }

            return Ok(new
            {
                date = dateKey,
                totalAvailable = availableDrivers.Count,
                drivers = availableDrivers
            });
        }
        [HttpGet("company/dayoffs")]
        public async Task<IActionResult> GetCompanyDayOffs(
        [FromQuery] string? country = null,
        [FromQuery] int? year = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
        {
            try
            {
                IQueryable<DayOff> query = dbContext.DayOffs;

                // Filter by country if specified
                if (!string.IsNullOrEmpty(country))
                {
                    query = query.Where(d => d.Country == country);
                }

                // Filter by year if specified
                if (year.HasValue)
                {
                    query = query.Where(d => d.Date.Year == year.Value);
                }

                // Filter by date range if specified
                if (startDate.HasValue && endDate.HasValue)
                {
                    query = query.Where(d => d.Date >= startDate.Value && d.Date <= endDate.Value);
                }

                // Order by date
                query = query.OrderBy(d => d.Date);

                var dayOffs = await query.ToListAsync();

                // Convert to response DTO
                var response = dayOffs.Select(d => new DayOffResponse
                {
                    Id = d.Id,
                    Country = d.Country,
                    Date = d.Date.ToString("yyyy-MM-dd"),
                    Name = d.Name,
                    Description = d.Description,
                    DayOfWeek = GetFrenchDayOfWeek(d.Date),
                    IsWeekend = IsWeekend(d.Date),
                    CreatedDate = d.CreatedDate
                }).ToList();

                // Add weekends to the list if requested
                if (startDate.HasValue && endDate.HasValue)
                {
                    response = await AddWeekendsToDayOffs(response, startDate.Value, endDate.Value, country);
                }

                return Ok(new
                {
                    total = response.Count,
                    dayOffs = response
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error retrieving company day offs",
                    error = ex.Message,
                    Status = 500
                });
            }
        }

        // Get specific day off by ID
        [HttpGet("company/dayoffs/{id}")]
        public async Task<IActionResult> GetCompanyDayOffById(int id)
        {
            try
            {
                var dayOff = await dbContext.DayOffs.FindAsync(id);

                if (dayOff == null)
                {
                    return NotFound(new
                    {
                        message = $"Day off with ID {id} was not found.",
                        Status = 404
                    });
                }

                var response = new DayOffResponse
                {
                    Id = dayOff.Id,
                    Country = dayOff.Country,
                    Date = dayOff.Date.ToString("yyyy-MM-dd"),
                    Name = dayOff.Name,
                    Description = dayOff.Description,
                    DayOfWeek = GetFrenchDayOfWeek(dayOff.Date),
                    IsWeekend = IsWeekend(dayOff.Date),
                    CreatedDate = dayOff.CreatedDate
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error retrieving company day off",
                    error = ex.Message,
                    Status = 500
                });
            }
        }

        // Check if a specific date is a day off
        [HttpGet("company/dayoffs/check/{date}")]
        public async Task<IActionResult> CheckIfDayOff(DateTime date, [FromQuery] string? country = null)
        {
            try
            {
                var dateOnly = date.Date;
                var dateKey = dateOnly.ToString("yyyy-MM-dd");

                // Check for company day off
                var query = dbContext.DayOffs.Where(d => d.Date == dateOnly);

                if (!string.IsNullOrEmpty(country))
                {
                    query = query.Where(d => d.Country == country || d.Country == "ALL");
                }

                var dayOff = await query.FirstOrDefaultAsync();

                // Check if it's a weekend
                bool isWeekend = IsWeekend(dateOnly);

                if (dayOff != null)
                {
                    return Ok(new
                    {
                        date = dateKey,
                        isDayOff = true,
                        isCompanyDayOff = true,
                        isWeekend = isWeekend,
                        name = dayOff.Name,
                        description = dayOff.Description,
                        country = dayOff.Country,
                        dayOfWeek = GetFrenchDayOfWeek(dateOnly)
                    });
                }
                else if (isWeekend)
                {
                    return Ok(new
                    {
                        date = dateKey,
                        isDayOff = true,
                        isCompanyDayOff = false,
                        isWeekend = true,
                        name = "Weekend",
                        description = GetFrenchDayOfWeek(dateOnly),
                        country = country ?? "ALL",
                        dayOfWeek = GetFrenchDayOfWeek(dateOnly)
                    });
                }
                else
                {
                    return Ok(new
                    {
                        date = dateKey,
                        isDayOff = false,
                        isCompanyDayOff = false,
                        isWeekend = false,
                        name = "",
                        description = "",
                        country = country ?? "ALL",
                        dayOfWeek = GetFrenchDayOfWeek(dateOnly)
                    });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error checking day off status",
                    error = ex.Message,
                    Status = 500
                });
            }
        }

        // Get day offs for a specific month
        [HttpGet("company/dayoffs/month/{year}/{month}")]
        public async Task<IActionResult> GetDayOffsForMonth(int year, int month, [FromQuery] string? country = null)
        {
            try
            {
                var startDate = new DateTime(year, month, 1);
                var endDate = startDate.AddMonths(1).AddDays(-1);

                return await GetCompanyDayOffs(country, null, startDate, endDate);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error retrieving day offs for month",
                    error = ex.Message,
                    Status = 500
                });
            }
        }

        // Create new company day off
        [HttpPost("company/dayoffs")]
        public async Task<IActionResult> CreateCompanyDayOff([FromBody] DayOffRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                // Validate required fields
                if (string.IsNullOrEmpty(request.Country))
                    return BadRequest(new { message = "Country is required", Status = 400 });

                if (string.IsNullOrEmpty(request.Name))
                    return BadRequest(new { message = "Name is required", Status = 400 });

                // Check if day off already exists for this date and country
                var existingDayOff = await dbContext.DayOffs
                    .FirstOrDefaultAsync(d => d.Date == request.Date.Date && d.Country == request.Country);

                if (existingDayOff != null)
                {
                    return Conflict(new
                    {
                        message = $"Day off already exists for date {request.Date:yyyy-MM-dd} in country {request.Country}",
                        Status = 409
                    });
                }

                // Create new day off
                var dayOff = new DayOff
                {
                    Country = request.Country,
                    Date = request.Date.Date,
                    Name = request.Name,
                    Description = request.Description,
                    CreatedDate = DateTime.UtcNow
                };

                dbContext.DayOffs.Add(dayOff);
                await dbContext.SaveChangesAsync();

                // Update drivers' availability for this day off
                await UpdateDriversAvailabilityForDayOff(dayOff.Date, dayOff.Country, true);

                var response = new DayOffResponse
                {
                    Id = dayOff.Id,
                    Country = dayOff.Country,
                    Date = dayOff.Date.ToString("yyyy-MM-dd"),
                    Name = dayOff.Name,
                    Description = dayOff.Description,
                    DayOfWeek = GetFrenchDayOfWeek(dayOff.Date),
                    IsWeekend = IsWeekend(dayOff.Date),
                    CreatedDate = dayOff.CreatedDate
                };

                return CreatedAtAction(nameof(GetCompanyDayOffById), new { id = dayOff.Id }, response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error creating company day off",
                    error = ex.Message,
                    Status = 500
                });
            }
        }

        // Update existing company day off
        [HttpPut("company/dayoffs/{id}")]
        public async Task<IActionResult> UpdateCompanyDayOff(int id, [FromBody] DayOffRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var dayOff = await dbContext.DayOffs.FindAsync(id);
                if (dayOff == null)
                {
                    return NotFound(new
                    {
                        message = $"Day off with ID {id} was not found.",
                        Status = 404
                    });
                }

                // Store old values for update logic
                var oldDate = dayOff.Date;
                var oldCountry = dayOff.Country;

                // Update day off
                dayOff.Country = request.Country;
                dayOff.Date = request.Date.Date;
                dayOff.Name = request.Name;
                dayOff.Description = request.Description;

                await dbContext.SaveChangesAsync();

                // If date or country changed, update affected drivers
                if (oldDate != dayOff.Date || oldCountry != dayOff.Country)
                {
                    // Remove day off status from old date/country
                    await UpdateDriversAvailabilityForDayOff(oldDate, oldCountry, false);

                    // Add day off status to new date/country
                    await UpdateDriversAvailabilityForDayOff(dayOff.Date, dayOff.Country, true);
                }

                var response = new DayOffResponse
                {
                    Id = dayOff.Id,
                    Country = dayOff.Country,
                    Date = dayOff.Date.ToString("yyyy-MM-dd"),
                    Name = dayOff.Name,
                    Description = dayOff.Description,
                    DayOfWeek = GetFrenchDayOfWeek(dayOff.Date),
                    IsWeekend = IsWeekend(dayOff.Date),
                    CreatedDate = dayOff.CreatedDate
                };

                return Ok(new
                {
                    message = $"Day off with ID {id} updated successfully.",
                    Status = 200,
                    data = response
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error updating company day off",
                    error = ex.Message,
                    Status = 500
                });
            }
        }

        // Delete company day off
        [HttpDelete("company/dayoffs/{id}")]
        public async Task<IActionResult> DeleteCompanyDayOff(int id)
        {
            try
            {
                var dayOff = await dbContext.DayOffs.FindAsync(id);
                if (dayOff == null)
                {
                    return NotFound(new
                    {
                        message = $"Day off with ID {id} was not found.",
                        Status = 404
                    });
                }

                // Store values before deletion for driver updates
                var date = dayOff.Date;
                var country = dayOff.Country;

                // Delete day off
                dbContext.DayOffs.Remove(dayOff);
                await dbContext.SaveChangesAsync();

                // Update drivers' availability to remove day off status
                await UpdateDriversAvailabilityForDayOff(date, country, false);

                return Ok(new
                {
                    message = $"Day off with ID {id} deleted successfully.",
                    Status = 200
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error deleting company day off",
                    error = ex.Message,
                    Status = 500
                });
            }
        }

        // Bulk create day offs (for importing holidays)
        [HttpPost("company/dayoffs/bulk")]
        public async Task<IActionResult> BulkCreateDayOffs([FromBody] List<DayOffRequest> requests)
        {
            try
            {
                if (!requests.Any())
                    return BadRequest(new { message = "No day offs provided", Status = 400 });

                var createdDayOffs = new List<DayOffResponse>();
                var errors = new List<string>();

                foreach (var request in requests)
                {
                    try
                    {
                        // Validate required fields
                        if (string.IsNullOrEmpty(request.Country) || string.IsNullOrEmpty(request.Name))
                        {
                            errors.Add($"Invalid day off: Country and Name are required");
                            continue;
                        }

                        // Check if day off already exists
                        var existingDayOff = await dbContext.DayOffs
                            .FirstOrDefaultAsync(d => d.Date == request.Date.Date && d.Country == request.Country);

                        if (existingDayOff == null)
                        {
                            var dayOff = new DayOff
                            {
                                Country = request.Country,
                                Date = request.Date.Date,
                                Name = request.Name,
                                Description = request.Description,
                                CreatedDate = DateTime.UtcNow
                            };

                            dbContext.DayOffs.Add(dayOff);

                            var response = new DayOffResponse
                            {
                                Id = dayOff.Id,
                                Country = dayOff.Country,
                                Date = dayOff.Date.ToString("yyyy-MM-dd"),
                                Name = dayOff.Name,
                                Description = dayOff.Description,
                                DayOfWeek = GetFrenchDayOfWeek(dayOff.Date),
                                IsWeekend = IsWeekend(dayOff.Date),
                                CreatedDate = dayOff.CreatedDate
                            };

                            createdDayOffs.Add(response);
                        }
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"Error creating day off for {request.Date:yyyy-MM-dd}: {ex.Message}");
                    }
                }

                await dbContext.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Created {createdDayOffs.Count} day offs, {errors.Count} errors",
                    Status = 200,
                    created = createdDayOffs,
                    errors = errors
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error bulk creating day offs",
                    error = ex.Message,
                    Status = 500
                });
            }
        }

        // Get list of available countries from day offs
        [HttpGet("company/dayoffs/countries")]
        public async Task<IActionResult> GetAvailableCountries()
        {
            try
            {
                var countries = await dbContext.DayOffs
                    .Select(d => d.Country)
                    .Distinct()
                    .OrderBy(c => c)
                    .ToListAsync();

                return Ok(new
                {
                    total = countries.Count,
                    countries = countries
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error retrieving countries",
                    error = ex.Message,
                    Status = 500
                });
            }
        }

        // ====================== HELPER METHODS ======================

        private string GetFrenchDayOfWeek(DateTime date)
        {
            var culture = new System.Globalization.CultureInfo("fr-FR");
            return culture.DateTimeFormat.GetDayName(date.DayOfWeek);
        }

        private bool IsWeekend(DateTime date)
        {
            return date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday;
        }

        private async Task<List<DayOffResponse>> AddWeekendsToDayOffs(List<DayOffResponse> dayOffs, DateTime startDate, DateTime endDate, string? country)
        {
            var result = new List<DayOffResponse>(dayOffs);
            var currentDate = startDate;

            while (currentDate <= endDate)
            {
                if (IsWeekend(currentDate))
                {
                    // Check if weekend is not already in the list
                    var dateStr = currentDate.ToString("yyyy-MM-dd");
                    if (!result.Any(d => d.Date == dateStr))
                    {
                        result.Add(new DayOffResponse
                        {
                            Id = 0,
                            Country = country ?? "ALL",
                            Date = dateStr,
                            Name = "Weekend",
                            Description = GetFrenchDayOfWeek(currentDate),
                            DayOfWeek = GetFrenchDayOfWeek(currentDate),
                            IsWeekend = true,
                            CreatedDate = DateTime.UtcNow
                        });
                    }
                }
                currentDate = currentDate.AddDays(1);
            }

            return result.OrderBy(d => d.Date).ToList();
        }

        private async Task UpdateDriversAvailabilityForDayOff(DateTime date, string country, bool isDayOff)
        {
            try
            {
                var dateKey = date.ToString("yyyy-MM-dd");

                // Get drivers from the specified country or all drivers if country is "ALL"
                var query = dbContext.Drivers.AsQueryable();

                if (country != "ALL")
                {
                    query = query.Where(d => d.phoneCountry == country);
                }

                var drivers = await query.ToListAsync();

                foreach (var driver in drivers)
                {
                    var availabilityDict = new Dictionary<DateTime, bool>();

                    if (!string.IsNullOrEmpty(driver.AvailabilityJson))
                    {
                        try
                        {
                            availabilityDict = JsonSerializer.Deserialize<Dictionary<DateTime, bool>>(driver.AvailabilityJson);
                        }
                        catch
                        {
                            availabilityDict = new Dictionary<DateTime, bool>();
                        }
                    }

                    // Update or remove the date
                    if (isDayOff)
                    {
                        // Set as unavailable for day off
                        availabilityDict[date] = false;
                    }
                    else
                    {
                        // Remove the date from availability (will default to available)
                        availabilityDict.Remove(date);
                    }

                    // Serialize back to JSON
                    driver.AvailabilityJson = JsonSerializer.Serialize(availabilityDict);
                    driver.UpdatedAt = DateTime.UtcNow;
                }

                await dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Log error but don't fail the main operation
                Console.WriteLine($"Error updating drivers availability: {ex.Message}");
            }
        }

        // Initialize with common holidays (optional endpoint)
        [HttpPost("company/dayoffs/initialize/{country}")]
        public async Task<IActionResult> InitializeCommonHolidays(string country, [FromQuery] int year = 0)
        {
            try
            {
                if (year == 0) year = DateTime.Now.Year;

                var commonHolidays = GetCommonHolidays(country, year);
                var requests = commonHolidays.Select(h => new DayOffRequest
                {
                    Country = country,
                    Date = h.Date,
                    Name = h.Name,
                    Description = h.Description
                }).ToList();

                return await BulkCreateDayOffs(requests);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error initializing common holidays",
                    error = ex.Message,
                    Status = 500
                });
            }
        }

        private List<DayOffRequest> GetCommonHolidays(string country, int year)
        {
            var holidays = new List<DayOffRequest>();

            if (country == "FR" || country == "France")
            {
                // French public holidays
                holidays.AddRange(new[]
                {
            new DayOffRequest { Date = new DateTime(year, 1, 1), Name = "Jour de l'An", Description = "Nouvel An" },
            new DayOffRequest { Date = new DateTime(year, 5, 1), Name = "Fête du Travail", Description = "Premier mai" },
            new DayOffRequest { Date = new DateTime(year, 5, 8), Name = "Victoire 1945", Description = "Armistice de la Seconde Guerre mondiale" },
            new DayOffRequest { Date = new DateTime(year, 7, 14), Name = "Fête Nationale", Description = "Prise de la Bastille" },
            new DayOffRequest { Date = new DateTime(year, 8, 15), Name = "Assomption", Description = "Fête religieuse" },
            new DayOffRequest { Date = new DateTime(year, 11, 1), Name = "Toussaint", Description = "Fête de tous les saints" },
            new DayOffRequest { Date = new DateTime(year, 11, 11), Name = "Armistice 1918", Description = "Fin de la Première Guerre mondiale" },
            new DayOffRequest { Date = new DateTime(year, 12, 25), Name = "Noël", Description = "Jour de Noël" }
        });

                // Add Easter-based holidays
                var easter = CalculateEaster(year);
                holidays.Add(new DayOffRequest { Date = easter.AddDays(1), Name = "Lundi de Pâques", Description = "Lundi suivant Pâques" });
                holidays.Add(new DayOffRequest { Date = easter.AddDays(39), Name = "Ascension", Description = "Jeudi de l'Ascension" });
                holidays.Add(new DayOffRequest { Date = easter.AddDays(50), Name = "Lundi de Pentecôte", Description = "Lundi de Pentecôte" });
            }

            return holidays;
        }

        private DateTime CalculateEaster(int year)
        {
            // Gauss algorithm for calculating Easter date
            int a = year % 19;
            int b = year / 100;
            int c = year % 100;
            int d = b / 4;
            int e = b % 4;
            int f = (b + 8) / 25;
            int g = (b - f + 1) / 3;
            int h = (19 * a + b - d - g + 15) % 30;
            int i = c / 4;
            int k = c % 4;
            int l = (32 + 2 * e + 2 * i - h - k) % 7;
            int m = (a + 11 * h + 22 * l) / 451;
            int month = (h + l - 7 * m + 114) / 31;
            int day = ((h + l - 7 * m + 114) % 31) + 1;

            return new DateTime(year, month, day);
        }


        [HttpPut("DriverStatus")]
        public async Task<IActionResult> ActivateDriver([FromQuery] int driverId)
        {
            var driver = await dbContext.Drivers.FirstOrDefaultAsync(x => x.Id == driverId);

            if (driver == null)
                return NotFound();

            driver.IsEnable = true;
            driver.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Ok(driver);
        }

        // Search disabled drivers
        [HttpGet("PaginationDisableDriver")]
        public async Task<IActionResult> GetDisableDriver([FromQuery] SearchOptions searchOption)
        {
            var pagedData = new PagedData<Driver>();

            if (string.IsNullOrEmpty(searchOption.Search))
            {
                pagedData.Data = await dbContext.Drivers
                    .Where(x => x.IsEnable == false)
                    .ToListAsync();
            }
            else
            {
                pagedData.Data = await dbContext.Drivers
                    .Where(x => x.IsEnable == false &&
                       (
                           (x.Name != null && x.Name.Contains(searchOption.Search)) ||
                           (x.PermisNumber != null && x.PermisNumber.Contains(searchOption.Search)) ||
                           x.Phone.Contains(searchOption.Search) ||
                           (x.Status != null && x.Status.Contains(searchOption.Search)) ||
                           x.IdCamion.ToString().Contains(searchOption.Search)
                       )
                    )
                    .ToListAsync();
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

        //Désactiver Driver
        [HttpPut("DisableDriverFromList/{id}")]
        public async Task<IActionResult> DisableDriver(int id)
        {
            var driver = await dbContext.Drivers.FirstOrDefaultAsync(x => x.Id == id);

            if (driver == null)
                return NotFound();

            driver.IsEnable = false;
            driver.UpdatedAt = DateTime.UtcNow;

            await dbContext.SaveChangesAsync();

            return Ok();
        }

    }
}
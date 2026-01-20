using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using TransportManagementSystem.Service;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DriverController : ControllerBase
    {
        private readonly ApplicationDbContext dbContext;
        private readonly PasswordHelper passwordHelper;
        public DriverController(ApplicationDbContext context)
        {
            dbContext = context;
            this.passwordHelper = new PasswordHelper();
        }

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

            await CreateUserForDriver(driver);

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
            existingDriver.Email = driver.Email;
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
                           (x.Name != null && x.Name.Contains(searchOption.Search)) || (x.Email != null && x.Email.Contains(searchOption.Search)) ||
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
    

    private async Task CreateUserForDriver(Driver driver)
        {

            var existingUser = await dbContext.Users
                .FirstOrDefaultAsync(u => u.Email == driver.Email);

            if (existingUser != null)
                return;


            var user = new User
            {
                Email = driver.Email,
                Name = driver.Name,
                Phone = driver.Phone,
                phoneCountry = driver.phoneCountry,
                Password = passwordHelper.HashPassword("12345"),
            };

            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync();


            await AssignUserToDriverGroup(user.Id);
        }
        private async Task AssignUserToDriverGroup(int userId)
        {

            var driverGroup = await dbContext.UserGroups
                .FirstOrDefaultAsync(g => g.Name == "Driver");

            if (driverGroup == null)
                return;


            dbContext.UserGroup2Users.Add(new UserGroup2User
            {
                UserId = userId,
                UserGroupId = driverGroup.Id
            });

            await dbContext.SaveChangesAsync();
        }

    } }
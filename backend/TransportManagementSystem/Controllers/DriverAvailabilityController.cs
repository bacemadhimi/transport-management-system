using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DriverAvailabilityController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DriverAvailabilityController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetDriverAvailabilities([FromQuery] AvailabilityFilterDto filter)
    {
        try
        {
            var driverQuery = _context.Drivers.AsQueryable();

            if (!string.IsNullOrEmpty(filter.Search))
            {
                var searchTerm = filter.Search.ToLower();
                driverQuery = driverQuery.Where(d =>
                    d.Name.ToLower().Contains(searchTerm) ||
                    d.PermisNumber.Contains(searchTerm) ||
                    d.Phone.Contains(searchTerm) ||
                    d.Status.ToLower().Contains(searchTerm));
            }
            var totalCount = await driverQuery.CountAsync();
            var drivers = await driverQuery
                .OrderBy(d => d.Name)
                .Skip(filter.PageIndex * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var startDate = DateTime.ParseExact(filter.StartDate, "yyyy-MM-dd", null);
            var endDate = DateTime.ParseExact(filter.EndDate, "yyyy-MM-dd", null);

            var driverIds = drivers.Select(d => d.Id).ToList();
            var existingAvailabilities = await _context.DriverAvailabilities
                .Where(da => driverIds.Contains(da.DriverId) &&
                             da.Date >= startDate && da.Date <= endDate)
                .ToListAsync();

            var companyDayOffs = await _context.DayOffs
                .Where(cdo => cdo.Date >= startDate && cdo.Date <= endDate)
                .Select(cdo => cdo.Date)
                .ToListAsync();

            var result = new List<DriverAvailabilityDto>();

            foreach (var driver in drivers)
            {
                var driverDto = new DriverAvailabilityDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    Phone = driver.Phone,
                    Status = driver.Status,
                    Availability = new Dictionary<string, AvailabilityDayDto>()
                };

                for (var date = startDate; date <= endDate; date = date.AddDays(1))
                {
                    var dateStr = date.ToString("yyyy-MM-dd");
                    var existing = existingAvailabilities.FirstOrDefault(a =>
                        a.DriverId == driver.Id && a.Date == date.Date);

                    if (existing != null)
                    {
                        driverDto.Availability[dateStr] = new AvailabilityDayDto
                        {
                            IsAvailable = existing.IsAvailable,
                            IsDayOff = existing.IsDayOff,
                            Reason = existing.Reason
                        };
                    }
                    else
                    {
                        var isWeekend = date.DayOfWeek == DayOfWeek.Sunday || date.DayOfWeek == DayOfWeek.Saturday;
                        var isCompanyDayOff = companyDayOffs.Contains(date.Date);

                        driverDto.Availability[dateStr] = new AvailabilityDayDto
                        {
                            IsAvailable = !isWeekend && !isCompanyDayOff,
                            IsDayOff = isWeekend || isCompanyDayOff,
                            Reason = isWeekend ? "Weekend" : isCompanyDayOff ? "Jour férié" : ""
                        };
                    }
                }

                result.Add(driverDto);
            }

            return Ok(new
            {
                drivers = result,
                totalDrivers = totalCount
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Une erreur est survenue lors de la récupération des disponibilités.",
                error = ex.Message
            });
        }
    }

    [HttpPost("{driverId}")]
    public async Task<IActionResult> UpdateDriverAvailability(int driverId, [FromBody] UpdateAvailabilityDto updateDto)
    {
        try
        {
            var driver = await _context.Drivers.FindAsync(driverId);
            if (driver == null)
            {
                return NotFound(new
                {
                    message = $"Le chauffeur avec l'ID {driverId} n'existe pas.",
                    status = 404
                });
            }

            var date = DateTime.ParseExact(updateDto.Date, "yyyy-MM-dd", null);
            var isWeekend = date.DayOfWeek == DayOfWeek.Sunday || date.DayOfWeek == DayOfWeek.Saturday;
            if (isWeekend)
            {
                return BadRequest(new
                {
                    message = "Impossible de modifier la disponibilité pour un weekend.",
                    status = 400
                });
            }

            var isCompanyDayOff = await _context.DayOffs
                .AnyAsync(cdo => cdo.Date == date);
            if (isCompanyDayOff)
            {
                return BadRequest(new
                {
                    message = "Impossible de modifier la disponibilité pour un jour férié.",
                    status = 400
                });
            }
            var existingAvailability = await _context.DriverAvailabilities
                .FirstOrDefaultAsync(da => da.DriverId == driverId && da.Date == date);

            if (existingAvailability != null)
            {
                existingAvailability.IsAvailable = updateDto.IsAvailable;
                existingAvailability.IsDayOff = updateDto.IsDayOff;
                existingAvailability.Reason = updateDto.Reason ?? "";
                existingAvailability.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var newAvailability = new DriverAvailability
                {
                    DriverId = driverId,
                    Date = date,
                    IsAvailable = updateDto.IsAvailable,
                    IsDayOff = updateDto.IsDayOff,
                    Reason = updateDto.Reason ?? "",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _context.DriverAvailabilities.AddAsync(newAvailability);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Disponibilité mise à jour pour le {date:dd/MM/yyyy}",
                success = true,
                status = 200
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Une erreur est survenue lors de la mise à jour de la disponibilité.",
                error = ex.Message,
                status = 500
            });
        }
    }

    [HttpGet("CompanyDayOffs")]
    public async Task<IActionResult> GetCompanyDayOffs()
    {
        try
        {
            var dayOffs = await _context.DayOffs
                .OrderBy(cdo => cdo.Date)
                .Select(cdo => new
                {
                    date = cdo.Date.ToString("yyyy-MM-dd"),
                    description = cdo.Description
                })
                .ToListAsync();

            return Ok(new
            {
                dayOffs,
                status = 200
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Une erreur est survenue lors de la récupération des jours fériés.",
                error = ex.Message,
                status = 500
            });
        }
    }

    [HttpPost("Initialize/{driverId}")]
    public async Task<IActionResult> InitializeDriverAvailability(int driverId, [FromBody] List<string> dates)
    {
        try
        {
            var driver = await _context.Drivers.FindAsync(driverId);
            if (driver == null)
            {
                return NotFound(new
                {
                    message = $"Le chauffeur avec l'ID {driverId} n'existe pas.",
                    status = 404
                });
            }

            var dateList = dates.Select(d => DateTime.ParseExact(d, "yyyy-MM-dd", null)).ToList();
            var companyDayOffs = await _context.DayOffs
                .Where(cdo => dateList.Contains(cdo.Date))
                .Select(cdo => cdo.Date)
                .ToListAsync();

            var existingDates = await _context.DriverAvailabilities
                .Where(da => da.DriverId == driverId && dateList.Contains(da.Date))
                .Select(da => da.Date)
                .ToListAsync();

            var newDates = dateList.Where(d => !existingDates.Contains(d)).ToList();

            if (newDates.Any())
            {
                var availabilities = newDates.Select(date =>
                {
                    var isWeekend = date.DayOfWeek == DayOfWeek.Sunday || date.DayOfWeek == DayOfWeek.Saturday;
                    var isCompanyDayOff = companyDayOffs.Contains(date);

                    return new DriverAvailability
                    {
                        DriverId = driverId,
                        Date = date,
                        IsAvailable = !isWeekend && !isCompanyDayOff,
                        IsDayOff = isWeekend || isCompanyDayOff,
                        Reason = isWeekend ? "Weekend" : isCompanyDayOff ? "Jour férié" : "",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                }).ToList();

                await _context.DriverAvailabilities.AddRangeAsync(availabilities);
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                message = $"Disponibilité initialisée pour {newDates.Count} jours",
                initializedCount = newDates.Count,
                status = 200
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Une erreur est survenue lors de l'initialisation de la disponibilité.",
                error = ex.Message,
                status = 500
            });
        }
    }

    [HttpGet("Stats")]
    public async Task<IActionResult> GetAvailabilityStats([FromQuery] string date)
    {
        try
        {
            var targetDate = DateTime.ParseExact(date, "yyyy-MM-dd", null);

            var totalDrivers = await _context.Drivers.CountAsync();
            var availableDrivers = await _context.DriverAvailabilities
                .Where(da => da.Date == targetDate && da.IsAvailable && !da.IsDayOff)
                .CountAsync();

            var unavailableDrivers = await _context.DriverAvailabilities
                .Where(da => da.Date == targetDate && !da.IsAvailable && !da.IsDayOff)
                .CountAsync();

            var dayOffDrivers = await _context.DriverAvailabilities
                .Where(da => da.Date == targetDate && da.IsDayOff)
                .CountAsync();

            return Ok(new
            {
                date = targetDate.ToString("yyyy-MM-dd"),
                totalDrivers,
                availableDrivers,
                unavailableDrivers,
                dayOffDrivers,
                status = 200
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Une erreur est survenue lors de la récupération des statistiques.",
                error = ex.Message,
                status = 500
            });
        }
    }
}
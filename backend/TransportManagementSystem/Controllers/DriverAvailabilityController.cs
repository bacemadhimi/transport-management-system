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
            var driversQuery = _context.Drivers.AsQueryable();

            if (!string.IsNullOrEmpty(filter.Search))
            {
                driversQuery = driversQuery.Where(d =>
                    (d.Name != null && d.Name.Contains(filter.Search)) ||
                    (d.PermisNumber != null && d.PermisNumber.Contains(filter.Search)) ||
                    d.Phone.Contains(filter.Search) ||
                    (d.Status != null && d.Status.Contains(filter.Search))
                );
            }

            
            var totalCount = await driversQuery.CountAsync();

            if (filter.PageIndex.HasValue && filter.PageSize.HasValue)
            {
                driversQuery = driversQuery
                    .Skip(filter.PageIndex.Value * filter.PageSize.Value)
                    .Take(filter.PageSize.Value);
            }

            var driversList = await driversQuery
                .OrderBy(d => d.Name)
                .ToListAsync();

            var startDate = DateTime.ParseExact(filter.StartDate, "yyyy-MM-dd", null);
            var endDate = DateTime.ParseExact(filter.EndDate, "yyyy-MM-dd", null);

            var driverIds = driversList.Select(d => d.Id).ToList();

            var existingAvailabilities = await _context.DriverAvailabilities
                .Where(da => driverIds.Contains(da.DriverId) &&
                            da.Date >= startDate && da.Date <= endDate)
                .ToListAsync();

            var companyDayOffs = await _context.DayOffs
                .Where(d => d.Date >= startDate && d.Date <= endDate)
                .Select(d => d.Date)
                .Distinct()
                .ToListAsync();

            var result = new List<DriverAvailabilityDto>();

            foreach (var driver in driversList)
            {
                var dto = new DriverAvailabilityDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    Phone = driver.Phone,
                    Status = driver.Status,
                    Availability = new Dictionary<string, AvailabilityDayDto>()
                };

                for (var date = startDate; date <= endDate; date = date.AddDays(1))
                {
                    var dateOnly = date.ToString("yyyy-MM-dd");
                    var existing = existingAvailabilities.FirstOrDefault(a =>
                        a.DriverId == driver.Id && a.Date.Date == date.Date);

                    var isWeekend = date.DayOfWeek == DayOfWeek.Saturday ||
                                    date.DayOfWeek == DayOfWeek.Sunday;
                    var isCompanyDayOff = companyDayOffs.Contains(date.Date);
                    var isDayOff = isWeekend || isCompanyDayOff;

                    
                    bool isAvailable;

                    if (isDayOff)
                    {
                       
                        isAvailable = false;
                    }
                    else if (existing != null)
                    {
                        
                        isAvailable = existing.IsAvailable;
                    }
                    else
                    {
                      
                        isAvailable = true;
                    }

                    dto.Availability[date.ToString("yyyy-MM-dd")] = new AvailabilityDayDto
                    {
                        IsAvailable = isAvailable,
                        IsDayOff = isDayOff,
                        Reason = isWeekend ? "Weekend" :
                                 isCompanyDayOff ? "Jour férié" :
                                 existing?.Reason ?? ""
                    };
                }

                result.Add(dto);
            }

            return Ok(new
            {
                data = result,
                totalData = totalCount
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
    [HttpGet("AvailableDrivers")]
    public async Task<ActionResult<AvailableDriversResponseDto>> GetAvailableDrivers(
        [FromQuery] string date,
        [FromQuery] int? excludeTripId = null)
    {
        try
        {
            if (!DateTime.TryParse(date, out DateTime checkDate))
            {
                return BadRequest("Invalid date format. Use YYYY-MM-DD.");
            }

            bool isWeekend = checkDate.DayOfWeek == DayOfWeek.Saturday || checkDate.DayOfWeek == DayOfWeek.Sunday;

    
            bool isCompanyDayOff = await IsCompanyDayOff(checkDate);


            var allDrivers = await _context.Drivers
                .Where(d => d.IsEnable)
                .Select(d => new
                {
                    d.Id,
                    d.Name,
                    d.PermisNumber,
                    d.Phone,
                })
                .ToListAsync();

         
            var tripsOnDate = await _context.Trips
                .Where(t => t.EstimatedStartDate == checkDate &&
                           t.TripStatus != TripStatus.Cancelled &&
                           (excludeTripId == null || t.Id != excludeTripId))
                .Include(t => t.Driver)
                .Select(t => new
                {
                    t.Id,
                    t.BookingId,
                    DriverId = t.DriverId,
                    t.EstimatedStartDate,
                    t.EstimatedEndDate,
                    t.TripStatus
                })
                .ToListAsync();


            var driverAvailabilityRecords = await _context.DriverAvailabilities
                .Where(da => da.Date.Date == checkDate.Date)
                .Select(da => new
                {
                    da.DriverId,
                    da.IsAvailable,
                    da.IsDayOff,
                    da.Reason
                })
                .ToListAsync();

            var availableDrivers = new List<DriverAvailabilityDto>();
            var unavailableDrivers = new List<DriverAvailabilityDto>();

            foreach (var driver in allDrivers)
            {
             
                var availabilityRecord = driverAvailabilityRecords.FirstOrDefault(da => da.DriverId == driver.Id);


                if (availabilityRecord != null)
                {
                    if (availabilityRecord.IsAvailable && !availabilityRecord.IsDayOff)
                    {

                        var conflictingTrip = tripsOnDate.FirstOrDefault(t => t.DriverId == driver.Id);

                        if (conflictingTrip == null)
                        {
                            availableDrivers.Add(new DriverAvailabilityDto
                            {
                                DriverId = driver.Id,
                                DriverName = driver.Name,
                                IsAvailable = true,
                                Reason = availabilityRecord.Reason
                            });
                        }
                        else
                        {
                            unavailableDrivers.Add(new DriverAvailabilityDto
                            {
                                DriverId = driver.Id,
                                DriverName = driver.Name,
                                IsAvailable = false,
                                Reason = "Already assigned to a trip"
                            });
                        }
                    }
                    else
                    {
                        
                        unavailableDrivers.Add(new DriverAvailabilityDto
                        {
                            DriverId = driver.Id,
                            DriverName = driver.Name,
                            IsAvailable = false,
                            Reason = availabilityRecord.Reason ?? (availabilityRecord.IsDayOff ? "Day off" : "Unavailable")
                        });
                    }
                }
                else
                {
                  
                    var conflictingTrip = tripsOnDate.FirstOrDefault(t => t.DriverId == driver.Id);

                    if (conflictingTrip == null)
                    {
                        availableDrivers.Add(new DriverAvailabilityDto
                        {
                            DriverId = driver.Id,
                            DriverName = driver.Name,
                            IsAvailable = true,
                            Reason = "Available"
                        });
                    }
                    else
                    {
                        unavailableDrivers.Add(new DriverAvailabilityDto
                        {
                            DriverId = driver.Id,
                            DriverName = driver.Name,
                            IsAvailable = false,
                            Reason = "Already assigned to a trip"
                        });
                    }
                }
            }

           
            if (isWeekend || isCompanyDayOff)
            {
                var reason = isWeekend ? "Weekend" : "Company holiday";

                
                var finalUnavailableDrivers = new List<DriverAvailabilityDto>();

                foreach (var driver in unavailableDrivers)
                {
                    finalUnavailableDrivers.Add(driver);
                }

               
                foreach (var availableDriver in availableDrivers)
                {
                    var availabilityRecord = driverAvailabilityRecords
                        .FirstOrDefault(da => da.DriverId == availableDriver.DriverId);

                    
                    if (availabilityRecord != null && availabilityRecord.IsAvailable &&
                        (availabilityRecord.Reason?.Contains("override") == true ||
                         availabilityRecord.Reason?.Contains("emergency") == true))
                    {
                       
                        finalUnavailableDrivers.Add(new DriverAvailabilityDto
                        {
                            DriverId = availableDriver.DriverId,
                            DriverName = availableDriver.DriverName,
                            IsAvailable = true,
                            Reason = $"{reason} - Available by override: {availabilityRecord.Reason}"
                        });
                    }
                    else
                    {
                        
                        finalUnavailableDrivers.Add(new DriverAvailabilityDto
                        {
                            DriverId = availableDriver.DriverId,
                            DriverName = availableDriver.DriverName,
                            IsAvailable = false,
                            Reason = reason
                        });
                    }
                }

                availableDrivers.Clear();
                unavailableDrivers = finalUnavailableDrivers;
            }

          
            availableDrivers = availableDrivers.OrderBy(d => d.DriverName).ToList();
            unavailableDrivers = unavailableDrivers.OrderBy(d => d.DriverName).ToList();

            var response = new AvailableDriversResponseDto
            {
                AvailableDrivers = availableDrivers,
                UnavailableDrivers = unavailableDrivers,
                IsWeekend = isWeekend,
                IsCompanyDayOff = isCompanyDayOff,
                Date = checkDate
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
           
            return StatusCode(500, "An error occurred while checking driver availability.");
        }
    }

    [HttpGet("CheckDriverAvailability/{driverId}")]
    public async Task<ActionResult<DriverAvailabilityDto>> CheckDriverAvailability(
        int driverId,
        [FromQuery] string date,
        [FromQuery] int? excludeTripId = null)
    {
        try
        {
            if (!DateTime.TryParse(date, out DateTime checkDate))
            {
                return BadRequest("Invalid date format. Use YYYY-MM-DD.");
            }

            var driver = await _context.Drivers
                .Where(d => d.Id == driverId && d.IsEnable)
                .Select(d => new
                {
                    d.Id,
                    d.Name,
                    d.PermisNumber
                })
                .FirstOrDefaultAsync();

            if (driver == null)
            {
                return NotFound($"Chauffeur avec ID {driverId} non trouvé.");
            }

           
            var availabilityRecord = await _context.DriverAvailabilities
                .Where(da => da.DriverId == driverId && da.Date.Date == checkDate.Date)
                .Select(da => new
                {
                    da.IsAvailable,
                    da.IsDayOff,
                    da.Reason,
                    da.CreatedAt,
                    da.UpdatedAt
                })
                .FirstOrDefaultAsync();

           
            if (availabilityRecord != null)
            {
                if (availabilityRecord.IsDayOff)
                {
                    return Ok(new DriverAvailabilityDto
                    {
                        DriverId = driver.Id,
                        DriverName = driver.Name,
                        IsAvailable = false,
                        IsDayOff = true,
                        Reason = availabilityRecord.Reason ?? "Day off scheduled",
                        
                    });
                }
                else if (!availabilityRecord.IsAvailable)
                {
                    return Ok(new DriverAvailabilityDto
                    {
                        DriverId = driver.Id,
                        DriverName = driver.Name,
                        IsAvailable = false,
                        IsDayOff = false,
                        Reason = availabilityRecord.Reason ?? "Manually marked as unavailable",
                        
                    });
                }
               
            }

            bool isWeekend = checkDate.DayOfWeek == DayOfWeek.Saturday || checkDate.DayOfWeek == DayOfWeek.Sunday;
            bool isCompanyDayOff = await IsCompanyDayOff(checkDate);

            var conflictingTrip = await _context.Trips
                .Where(t => t.DriverId == driverId &&
                           t.EstimatedStartDate == checkDate.Date &&
                           t.TripStatus != TripStatus.Cancelled &&
                           (excludeTripId == null || t.Id != excludeTripId))
                .Select(t => new
                {
                    t.Id,
                    t.BookingId,
                    t.EstimatedStartDate,
                    t.EstimatedEndDate,
                    t.TripStatus
                })
                .FirstOrDefaultAsync();

           
            if (isWeekend && availabilityRecord == null)
            {
                return Ok(new DriverAvailabilityDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    IsAvailable = false,
                    IsDayOff = true,
                    Reason = "Weekend - No scheduled work",
                    
                });
            }

      
            if (isCompanyDayOff && availabilityRecord == null)
            {
                return Ok(new DriverAvailabilityDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    IsAvailable = false,
                    IsDayOff = true,
                    Reason = "Company holiday - No scheduled work",
                    
                });
            }

           
            if ((isWeekend || isCompanyDayOff) && availabilityRecord != null && availabilityRecord.IsAvailable)
            {
               
                if (conflictingTrip != null)
                {
                    return Ok(new DriverAvailabilityDto
                    {
                        DriverId = driver.Id,
                        DriverName = driver.Name,
                        IsAvailable = false,
                        IsDayOff = false,
                        Reason = $"Already assigned to trip #{conflictingTrip.Id}",
                        
                      
                    });
                }

                return Ok(new DriverAvailabilityDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    IsAvailable = true,
                    IsDayOff = false,
                    Reason = availabilityRecord.Reason ?? $"Available by override ({(isWeekend ? "Weekend" : "Holiday")})",
                    
                });
            }

           
            if (conflictingTrip != null)
            {
                return Ok(new DriverAvailabilityDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    IsAvailable = false,
                    IsDayOff = false,
                    Reason = $"Already assigned to trip #{conflictingTrip.Id}",
                   
                });
            }

          
            return Ok(new DriverAvailabilityDto
            {
                DriverId = driver.Id,
                DriverName = driver.Name,
                IsAvailable = true,
                IsDayOff = false,
                Reason = availabilityRecord?.Reason ?? "Available for assignment",
                
            });
        }
        catch (Exception ex)
        {
           
            return StatusCode(500, "Une erreur est survenue lors de la vérification de disponibilité.");
        }
    }

    private async Task<bool> IsCompanyDayOff(DateTime date)
    {
      
        var isDayOff = await _context.DayOffs
            .AnyAsync(d => d.Date.Date == date.Date);

        return isDayOff;
    }
}
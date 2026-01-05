using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TripsController : ControllerBase
{
    private readonly IRepository<Trip> tripRepository;
    private readonly IRepository<TripLocation> locationRepository;

    public TripsController(IRepository<Trip> tripRepository, IRepository<TripLocation> locationRepository)
    {
        this.tripRepository = tripRepository;
        this.locationRepository = locationRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetTrips([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<Trip>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await tripRepository.GetAll();
        }
        else
        {
            DateTime? searchDate = null;
            if (DateTime.TryParseExact(searchOption.Search, "dd/MM/yyyy", null, System.Globalization.DateTimeStyles.None, out var parsedDate))
            {
                searchDate = parsedDate.Date;
            }

            pagedData.Data = await tripRepository.GetAll(x =>
                x.TripType.ToString().Contains(searchOption.Search) ||
                x.TripStatus.ToString().Contains(searchOption.Search) ||

                (searchDate.HasValue && x.TripStartDate.Date == searchDate.Value)
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
    public async Task<IActionResult> GetTripById(int id)
    {
        var trip = await tripRepository.FindByIdAsync(id);
        if (trip == null)
        {
            return NotFound();
        }
        return Ok(trip);
    }

    [HttpPost]
    public async Task<IActionResult> AddTrip([FromBody] TripDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        string? lastBookingId = (await tripRepository.GetAll())
        .OrderByDescending(t => t.Id)
        .Select(t => t.BookingId)
        .FirstOrDefault();

        int nextNumber = 1;

   
        if (!string.IsNullOrEmpty(lastBookingId) && lastBookingId.StartsWith("TMS"))
        {
            string numericPart = lastBookingId.Substring(3);
            if (int.TryParse(numericPart, out int lastNumber))
            {
                nextNumber = lastNumber + 1;
            }
        }

        string newBookingId = $"TMS{nextNumber:D5}";

        var trip = new Trip
        {
            BookingId = newBookingId,
            CustomerId = model.CustomerId,
            TripStartDate = model.TripStartDate,
            TripEndDate = model.TripEndDate,
            TripType = model.TripType,
            TruckId = model.TruckId,
            DriverId = model.DriverId,
            TripStartLocation = model.TripStartLocation,
            TripEndLocation = model.TripEndLocation,
            ApproxTotalKM = model.ApproxTotalKM,
            TripStatus = model.TripStatus,
            StartKmsReading = model.StartKmsReading,
        };

        await tripRepository.AddAsync(trip);
        await tripRepository.SaveChangesAsync();

        if (model.Locations != null && model.Locations.Any())
        {
            foreach (var locationDto in model.Locations)
            {
                var location = new TripLocation
                {
                    TripId = trip.Id,
                    Address = locationDto.Address,
                    Sequence = locationDto.Sequence,
                    LocationType = locationDto.LocationType,
                    ScheduledTime = locationDto.ScheduledTime,
                    Notes = locationDto.Notes
                };
                await locationRepository.AddAsync(location);
            }
            await locationRepository.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(GetTripById), new { id = trip.Id }, trip);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTrip(int id, [FromBody] TripDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var trip = await tripRepository.FindByIdAsync(id);
        if (trip == null)
            return NotFound();

        trip.CustomerId = model.CustomerId;
        trip.TripStartDate = model.TripStartDate;
        trip.TripEndDate = model.TripEndDate;
        trip.TripType = model.TripType;
        trip.TruckId = model.TruckId;
        trip.DriverId = model.DriverId;
        trip.TripStartLocation = model.TripStartLocation;
        trip.TripEndLocation = model.TripEndLocation;
        trip.ApproxTotalKM = model.ApproxTotalKM;
        trip.TripStatus = model.TripStatus;
        trip.StartKmsReading = model.StartKmsReading;


        if (model.Locations != null)
        {
            var existingLocations = trip.Locations.ToList();
            foreach (var location in existingLocations)
            {
                await locationRepository.DeleteAsync(location.Id);
            }
      
            foreach (var locationDto in model.Locations)
            {
                var location = new TripLocation
                {
                    TripId = trip.Id,
                    Address = locationDto.Address,
                    Sequence = locationDto.Sequence,
                    LocationType = locationDto.LocationType,
                    ScheduledTime = locationDto.ScheduledTime,
                    Notes = locationDto.Notes
                };
                await locationRepository.AddAsync(location);
            }
        }
        tripRepository.Update(trip);
        await tripRepository.SaveChangesAsync();

        return Ok(trip);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTrip(int id)
    {
        var trip = await tripRepository.FindByIdAsync(id);
        if (trip == null)
            return NotFound();

        foreach (var location in trip.Locations)
        {
            await locationRepository.DeleteAsync(location.Id);
        }

        await tripRepository.DeleteAsync(id);
        await tripRepository.SaveChangesAsync();

        return Ok(new { message = "Le voyage a été supprimé avec succès" });
    }
}

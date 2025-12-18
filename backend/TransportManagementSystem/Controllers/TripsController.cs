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

    public TripsController(IRepository<Trip> tripRepository)
    {
        this.tripRepository = tripRepository;
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

        await tripRepository.DeleteAsync(id);
        await tripRepository.SaveChangesAsync();

        return Ok(new { message = "Le voyage a été supprimé avec succès" });
    }
}

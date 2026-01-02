using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using static TransportManagementSystem.Entity.Delivery;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TripsController : ControllerBase
{
    private readonly IRepository<Trip> tripRepository;
    private readonly IRepository<Delivery> deliveryRepository;
    private readonly ApplicationDbContext context;

    public TripsController(
        IRepository<Trip> tripRepository,
        IRepository<Delivery> deliveryRepository,
        ApplicationDbContext context)
    {
        this.tripRepository = tripRepository;
        this.deliveryRepository = deliveryRepository;
        this.context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetTrips([FromQuery] SearchOptions searchOption)
    {
        var query = tripRepository.Query()
            .Include(t => t.Truck)
            .Include(t => t.Driver)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Customer)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Order)
            .AsQueryable();

        // 🔍 Search
        if (!string.IsNullOrWhiteSpace(searchOption.Search))
        {
            DateTime? searchDate = null;
            if (DateTime.TryParseExact(
                searchOption.Search,
                "dd/MM/yyyy",
                null,
                System.Globalization.DateTimeStyles.None,
                out var parsedDate))
            {
                searchDate = parsedDate.Date;
            }

            query = query.Where(t =>
                t.TripStatus.ToString().Contains(searchOption.Search) ||
                t.BookingId.Contains(searchOption.Search) ||
                (t.TripReference != null && t.TripReference.Contains(searchOption.Search)) ||
                (searchDate.HasValue && t.ActualStartDate.HasValue &&
                 t.ActualStartDate.Value.Date == searchDate.Value) ||
                (t.Truck != null && t.Truck.Immatriculation.Contains(searchOption.Search)) ||
                (t.Driver != null && t.Driver.Name.Contains(searchOption.Search)) ||
                t.Deliveries.Any(d => d.Customer.Name.Contains(searchOption.Search))
            );
        }

        var totalData = await query.CountAsync();

        // 📄 Pagination
        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            query = query
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value);
        }

        // 🎯 Projection
        var data = await query.Select(t => new TripListDto
        {
            Id = t.Id,
            BookingId = t.BookingId,
            TripReference = t.TripReference,
            TripStatus = t.TripStatus,
            EstimatedStartDate = t.EstimatedStartDate ?? DateTime.MinValue,
            EstimatedEndDate = t.EstimatedEndDate ?? DateTime.MinValue,
            ActualStartDate = t.ActualStartDate,
            ActualEndDate = t.ActualEndDate,
            EstimatedDistance = t.EstimatedDistance,
            EstimatedDuration = t.EstimatedDuration,

            // ✅ INCLUDED DATA
            Truck = t.Truck != null ? t.Truck.Immatriculation : null,
            Driver = t.Driver != null ? t.Driver.Name : null,

            DeliveryCount = t.Deliveries.Count,
            CompletedDeliveries = t.Deliveries.Count(d => d.Status == DeliveryStatus.Delivered)
        }).ToListAsync();

        return Ok(new PagedData<TripListDto>
        {
            TotalData = totalData,
            Data = data
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTripById(int id)
    {
        var trip = await tripRepository.Query()
            .Include(t => t.Truck)
            .Include(t => t.Driver)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Customer)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Order)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip == null)
            return NotFound(new ApiResponse(false, $"Trajet {id} non trouvé"));

        // Calculer les métriques
        var tripDetails = new TripDetailsDto
        {
            Id = trip.Id,
            TruckId = trip.TruckId,      
            DriverId = trip.DriverId,
            BookingId = trip.BookingId,
            TripReference = trip.TripReference,
            TripStatus = trip.TripStatus,
            EstimatedDistance = trip.EstimatedDistance,
            EstimatedDuration = trip.EstimatedDuration,
            // PROBLÈME: Trip n'a pas EstimatedStartDate et EstimatedEndDate
            EstimatedStartDate = trip.EstimatedStartDate ?? DateTime.MinValue,
            EstimatedEndDate = trip.EstimatedEndDate ?? DateTime.MinValue,
            ActualStartDate = trip.ActualStartDate,
            ActualEndDate = trip.ActualEndDate,
            Truck = trip.Truck != null ? new TruckDto
            {
                Id = trip.Truck.Id,
                Immatriculation = trip.Truck.Immatriculation, // Changé LicensePlate -> Immatriculation
                Brand = trip.Truck.Brand,
                Capacity = trip.Truck.Capacity,
                Color = trip.Truck.Color,
                Status = trip.Truck.Status,
                TechnicalVisitDate = trip.Truck.TechnicalVisitDate
            } : null,
            Driver = trip.Driver != null ? new DriverDto
            {
                Id = trip.Driver.Id,
                Name = trip.Driver.Name,
                PermisNumber = trip.Driver.PermisNumber, // Changé LicenseNumber -> PermisNumber
                Phone = trip.Driver.Phone,
                Status = trip.Driver.Status,
                PhoneCountry = trip.Driver.phoneCountry
            } : null,
            Deliveries = trip.Deliveries
                .OrderBy(d => d.Sequence)
                .Select(d => new DeliveryDetailsDto
                {
                    Id = d.Id,
                    Sequence = d.Sequence,
                    CustomerId = d.CustomerId,
                    CustomerName = d.Customer?.Name,
                    CustomerMatricule = d.Customer?.Matricule,
                    OrderId = d.OrderId,
                    OrderReference = d.Order?.Reference,
                    OrderWeight = d.Order?.Weight ?? 0,
                    DeliveryAddress = d.DeliveryAddress,
                    PlannedTime = d.PlannedTime,
                    ActualArrivalTime = d.ActualArrivalTime,
                    ActualDepartureTime = d.ActualDepartureTime,
                    Status = d.Status,
                    Notes = d.Notes
                }).ToList()
        };

        return Ok(new ApiResponse(true, "Trajet récupéré avec succès", tripDetails));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTrip([FromBody] CreateTripDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        // PROBLÈME: Le DTO a EstimatedStartDate/EndDate mais Trip ne les a pas
        // SOLUTION: Soit vous ajoutez ces propriétés à Trip, soit vous les ignorez

        // Validation des dates (si vous décidez d'ajouter ces propriétés)
        if (model.EstimatedEndDate <= model.EstimatedStartDate)
        {
            return BadRequest(new ApiResponse(false,
                "La date de fin estimée doit être après la date de début"));
        }

        // Vérifier la disponibilité du camion
        var truck = await context.Trucks.FindAsync(model.TruckId);
        if (truck == null)
            return BadRequest(new ApiResponse(false, "Camion non trouvé"));

        //if (truck.Status != "Disponible" && truck.Status != "Active") // Adaptez selon vos statuts
        //    return BadRequest(new ApiResponse(false, $"Le camion {truck.Immatriculation} n'est pas disponible"));

        // Vérifier la disponibilité du chauffeur
        var driver = await context.Drivers.FindAsync(model.DriverId);
        if (driver == null)
            return BadRequest(new ApiResponse(false, "Chauffeur non trouvé"));

        //if (driver.Status != "Disponible" && driver.Status != "Active") // Adaptez selon vos statuts
        //    return BadRequest(new ApiResponse(false, $"Le chauffeur {driver.Name} n'est pas disponible"));

        // Générer le BookingId
        var lastBookingId = await tripRepository.Query()
            .OrderByDescending(t => t.Id)
            .Select(t => t.BookingId)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (!string.IsNullOrEmpty(lastBookingId) && lastBookingId.StartsWith("TMS"))
        {
            if (int.TryParse(lastBookingId[3..], out var lastNumber))
                nextNumber = lastNumber + 1;
        }
        var year = model.EstimatedStartDate.Year;

        var lastTripReference = await tripRepository.Query()
            .Where(t => t.TripReference.StartsWith($"LIV-{year}-"))
            .OrderByDescending(t => t.TripReference)
            .Select(t => t.TripReference)
            .FirstOrDefaultAsync();

        int nextSequence = 1;

        if (!string.IsNullOrEmpty(lastTripReference))
        {
            // LIV-2025-001 → 001
            var parts = lastTripReference.Split('-');
            if (parts.Length == 3 && int.TryParse(parts[2], out var lastNumber))
            {
                nextSequence = lastNumber + 1;
            }
        }

        var tripReference = $"LIV-{year}-{nextSequence:D3}";

        // Créer le trajet - NOTE: On ignore EstimatedStartDate/EndDate car pas dans le modèle
        var trip = new Trip
        {
            BookingId = $"TMS{nextNumber:D5}",
            TripReference = tripReference,
            EstimatedDistance = model.EstimatedDistance,
            EstimatedDuration = model.EstimatedDuration,
            // PROBLÈME: Trip n'a pas EstimatedStartDate et EstimatedEndDate
            // On ne peut pas les assigner
            TruckId = model.TruckId,
            DriverId = model.DriverId,
            TripStatus = TripStatus.Planned,
            EstimatedStartDate = model.EstimatedStartDate,
            EstimatedEndDate = model.EstimatedEndDate,
        };

        await tripRepository.AddAsync(trip);
        await tripRepository.SaveChangesAsync();

        // Mettre à jour le statut du camion et du chauffeur
        truck.Status = "En mission";
        driver.Status = "En mission";
        context.Trucks.Update(truck);
        context.Drivers.Update(driver);

        // Ajouter les livraisons si fournies
        if (model.Deliveries?.Any() == true)
        {
            var deliveries = model.Deliveries.Select(d => new Delivery
            {
                TripId = trip.Id,
                CustomerId = d.CustomerId,
                OrderId = d.OrderId,
                DeliveryAddress = d.DeliveryAddress,
                Sequence = d.Sequence,
                PlannedTime = d.PlannedTime,
                Status = DeliveryStatus.Pending,
                Notes = d.Notes
            });

            await deliveryRepository.AddRangeAsync(deliveries);
        }

        await context.SaveChangesAsync();

        // Retourner le trajet créé
        var createdTrip = await GetTripByIdInternal(trip.Id);
        return CreatedAtAction(nameof(GetTripById),
            new { id = trip.Id },
            new ApiResponse(true, "Trajet créé avec succès", createdTrip));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTrip(int id, [FromBody] UpdateTripDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var trip = await tripRepository.Query()
            .Include(t => t.Truck)
            .Include(t => t.Driver)
            .Include(t => t.Deliveries)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip == null)
            return NotFound(new ApiResponse(false, $"Trajet {id} non trouvé"));

        // Ne pas permettre la modification si le trajet est en cours ou terminé
        if (trip.TripStatus == TripStatus.InProgress ||
            trip.TripStatus == TripStatus.Completed)
        {
            return BadRequest(new ApiResponse(false,
                "Impossible de modifier un trajet en cours ou terminé"));
        }

        // Mettre à jour les propriétés
        trip.EstimatedDistance = model.EstimatedDistance;
        trip.EstimatedDuration = model.EstimatedDuration;
        // PROBLÈME: Trip n'a pas EstimatedStartDate et EstimatedEndDate
        // On ne peut pas les mettre à jour
        trip.TruckId = model.TruckId;
        trip.DriverId = model.DriverId;
        trip.TripStatus = model.TripStatus;
        trip.EstimatedStartDate = model.EstimatedStartDate;
        trip.EstimatedEndDate = model.EstimatedEndDate;

        // Gestion du changement de camion/chauffeur
        if (trip.TruckId != model.TruckId)
        {
            // Libérer l'ancien camion
            var oldTruck = await context.Trucks.FindAsync(trip.TruckId);
            if (oldTruck != null)
            {
                oldTruck.Status = "Disponible";
                context.Trucks.Update(oldTruck);
            }

            // Réserver le nouveau camion
            var newTruck = await context.Trucks.FindAsync(model.TruckId);
            if (newTruck != null)
            {
                newTruck.Status = "En mission";
                context.Trucks.Update(newTruck);
            }
        }

        if (trip.DriverId != model.DriverId)
        {
            // Libérer l'ancien chauffeur
            var oldDriver = await context.Drivers.FindAsync(trip.DriverId);
            if (oldDriver != null)
            {
                oldDriver.Status = "Disponible";
                context.Drivers.Update(oldDriver);
            }

            // Réserver le nouveau chauffeur
            var newDriver = await context.Drivers.FindAsync(model.DriverId);
            if (newDriver != null)
            {
                newDriver.Status = "En mission";
                context.Drivers.Update(newDriver);
            }
        }

        // Mettre à jour les livraisons
        if (model.Deliveries != null)
        {
            // Supprimer les anciennes livraisons
            if (trip.Deliveries.Any())
            {
                deliveryRepository.RemoveRange(trip.Deliveries);
            }

            // Ajouter les nouvelles
            var deliveries = model.Deliveries.Select(d => new Delivery
            {
                TripId = trip.Id,
                CustomerId = d.CustomerId,
                OrderId = d.OrderId,
                DeliveryAddress = d.DeliveryAddress,
                Sequence = d.Sequence,
                PlannedTime = d.PlannedTime,
                Status = DeliveryStatus.Pending,
                Notes = d.Notes
            });

            await deliveryRepository.AddRangeAsync(deliveries);
        }

        tripRepository.Update(trip);
        await context.SaveChangesAsync();

        var updatedTrip = await GetTripByIdInternal(trip.Id);
        return Ok(new ApiResponse(true, "Trajet mis à jour avec succès", updatedTrip));
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateTripStatus(int id, [FromBody] UpdateTripStatusDto model)
    {
        var trip = await tripRepository.Query()
            .Include(t => t.Truck)
            .Include(t => t.Driver)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip == null)
            return NotFound(new ApiResponse(false, $"Trajet {id} non trouvé"));

        // Validation des transitions de statut
        if (!IsValidStatusTransition(trip.TripStatus, model.Status))
        {
            return BadRequest(new ApiResponse(false,
                $"Transition de statut invalide: {trip.TripStatus} → {model.Status}"));
        }

        // Mettre à jour les dates réelles si nécessaire
        if (model.Status == TripStatus.InProgress && !trip.ActualStartDate.HasValue)
        {
            trip.ActualStartDate = DateTime.UtcNow;
        }
        else if (model.Status == TripStatus.Completed && !trip.ActualEndDate.HasValue)
        {
            trip.ActualEndDate = DateTime.UtcNow;

            // Libérer le camion et le chauffeur
            if (trip.Truck != null)
            {
                trip.Truck.Status = "Disponible";
                context.Trucks.Update(trip.Truck);
            }

            if (trip.Driver != null)
            {
                trip.Driver.Status = "Disponible";
                context.Drivers.Update(trip.Driver);
            }
        }
        else if (model.Status == TripStatus.Cancelled)
        {
            // Libérer le camion et le chauffeur si annulé
            if (trip.Truck != null)
            {
                trip.Truck.Status = "Disponible";
                context.Trucks.Update(trip.Truck);
            }

            if (trip.Driver != null)
            {
                trip.Driver.Status = "Disponible";
                context.Drivers.Update(trip.Driver);
            }
        }

        trip.TripStatus = model.Status;
        tripRepository.Update(trip);
        await context.SaveChangesAsync();

        return Ok(new ApiResponse(true,
            $"Statut du trajet mis à jour: {model.Status}",
            new
            {
                trip.TripStatus,
                trip.ActualStartDate,
                trip.ActualEndDate
            }));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTrip(int id)
    {
        var trip = await tripRepository.Query()
            .Include(t => t.Truck)
            .Include(t => t.Driver)
            .Include(t => t.Deliveries)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip == null)
            return NotFound(new ApiResponse(false, $"Trajet {id} non trouvé"));

        // Ne pas permettre la suppression si le trajet est en cours
        if (trip.TripStatus == TripStatus.InProgress)
        {
            return BadRequest(new ApiResponse(false,
                "Impossible de supprimer un trajet en cours"));
        }

        // Libérer le camion et le chauffeur
        if (trip.Truck != null)
        {
            trip.Truck.Status = "Disponible";
            context.Trucks.Update(trip.Truck);
        }

        if (trip.Driver != null)
        {
            trip.Driver.Status = "Disponible";
            context.Drivers.Update(trip.Driver);
        }

        // Supprimer les livraisons
        if (trip.Deliveries.Any())
        {
            deliveryRepository.RemoveRange(trip.Deliveries);
        }

        // Supprimer le trajet
        await tripRepository.DeleteAsync(id);
        await context.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Trajet supprimé avec succès"));
    }

    [HttpGet("{id}/summary")]
    public async Task<IActionResult> GetTripSummary(int id)
    {
        var summary = await context.Trips
            .Where(t => t.Id == id)
            .Select(t => new TripSummaryDto
            {
                Id = t.Id,
                BookingId = t.BookingId,
                TripReference = t.TripReference,
                Status = t.TripStatus,
                EstimatedDistance = t.EstimatedDistance,
                EstimatedDuration = t.EstimatedDuration,
                // PROBLÈME: Trip n'a pas EstimatedStartDate et EstimatedEndDate
                EstimatedStartDate = t.ActualStartDate ?? DateTime.MinValue,
                EstimatedEndDate = t.ActualEndDate ?? DateTime.MinValue,
                ActualStartDate = t.ActualStartDate,
                ActualEndDate = t.ActualEndDate,
                TotalDeliveries = t.Deliveries.Count,
                CompletedDeliveries = t.Deliveries.Count(d => d.Status == DeliveryStatus.Delivered),
                PendingDeliveries = t.Deliveries.Count(d => d.Status == DeliveryStatus.Pending),
                FailedDeliveries = t.Deliveries.Count(d => d.Status == DeliveryStatus.Failed),
                TotalWeight = t.Deliveries.Sum(d => d.Order.Weight),
                Truck = t.Truck.Immatriculation, // Changé LicensePlate -> Immatriculation
                Driver = t.Driver.Name
            })
            .FirstOrDefaultAsync();

        if (summary == null)
            return NotFound(new ApiResponse(false, $"Trajet {id} non trouvé"));

        return Ok(new ApiResponse(true, "Résumé du trajet récupéré", summary));
    }

    [HttpGet("{id}/deliveries")]
    public async Task<IActionResult> GetTripDeliveries(int id)
    {
        var deliveries = await context.Deliveries
            .Where(d => d.TripId == id)
            .Include(d => d.Customer)
            .Include(d => d.Order)
            .OrderBy(d => d.Sequence)
            .Select(d => new DeliveryDetailsDto
            {
                Id = d.Id,
                Sequence = d.Sequence,
                CustomerId = d.CustomerId,
                CustomerName = d.Customer.Name,
                CustomerMatricule = d.Customer.Matricule,
                OrderId = d.OrderId,
                OrderReference = d.Order.Reference,
                OrderWeight = d.Order.Weight,
                DeliveryAddress = d.DeliveryAddress,
                PlannedTime = d.PlannedTime,
                ActualArrivalTime = d.ActualArrivalTime,
                ActualDepartureTime = d.ActualDepartureTime,
                Status = d.Status,
                Notes = d.Notes
            })
            .ToListAsync();

        if (!deliveries.Any())
            return NotFound(new ApiResponse(false, $"Aucune livraison trouvée pour le trajet {id}"));

        return Ok(new ApiResponse(true, "Livraisons récupérées", deliveries));
    }

    // Méthodes privées helpers
    private async Task<TripDetailsDto> GetTripByIdInternal(int id)
    {
        var trip = await tripRepository.Query()
            .Include(t => t.Truck)
            .Include(t => t.Driver)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Customer)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Order)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip == null) return null;

        return new TripDetailsDto
        {
            Id = trip.Id,
            TruckId = trip.TruckId,
            DriverId = trip.DriverId,
            BookingId = trip.BookingId,
            TripReference = trip.TripReference,
            TripStatus = trip.TripStatus,
            EstimatedDistance = trip.EstimatedDistance,
            EstimatedDuration = trip.EstimatedDuration,
            EstimatedStartDate = trip.ActualStartDate ?? DateTime.MinValue,
            EstimatedEndDate = trip.ActualEndDate ?? DateTime.MinValue,
            ActualStartDate = trip.ActualStartDate,
            ActualEndDate = trip.ActualEndDate,
            Truck = trip.Truck != null ? new TruckDto
            {
                Id = trip.Truck.Id,
                Immatriculation = trip.Truck.Immatriculation,
                Brand = trip.Truck.Brand,
                Capacity = trip.Truck.Capacity,
                Color = trip.Truck.Color,
                Status = trip.Truck.Status,
                TechnicalVisitDate = trip.Truck.TechnicalVisitDate
            } : null,
            Driver = trip.Driver != null ? new DriverDto
            {
                Id = trip.Driver.Id,
                Name = trip.Driver.Name,
                PermisNumber = trip.Driver.PermisNumber,
                Phone = trip.Driver.Phone,
                Status = trip.Driver.Status,
                PhoneCountry = trip.Driver.phoneCountry
            } : null,
            Deliveries = trip.Deliveries
                .OrderBy(d => d.Sequence)
                .Select(d => new DeliveryDetailsDto
                {
                    Id = d.Id,
                    Sequence = d.Sequence,
                    CustomerId = d.CustomerId,
                    CustomerName = d.Customer?.Name,
                    CustomerMatricule = d.Customer?.Matricule,
                    OrderId = d.OrderId,
                    OrderReference = d.Order?.Reference,
                    OrderWeight = d.Order?.Weight ?? 0,
                    DeliveryAddress = d.DeliveryAddress,
                    PlannedTime = d.PlannedTime,
                    ActualArrivalTime = d.ActualArrivalTime,
                    ActualDepartureTime = d.ActualDepartureTime,
                    Status = d.Status,
                    Notes = d.Notes
                }).ToList()
        };
    }

    private bool IsValidStatusTransition(TripStatus current, TripStatus next)
    {
        var validTransitions = new Dictionary<TripStatus, List<TripStatus>>
        {
            [TripStatus.Planned] = new() { TripStatus.InProgress, TripStatus.Cancelled, TripStatus.Delayed },
            [TripStatus.InProgress] = new() { TripStatus.Completed, TripStatus.Delayed, TripStatus.Cancelled },
            [TripStatus.Delayed] = new() { TripStatus.InProgress, TripStatus.Cancelled },
            [TripStatus.Completed] = new() { },
            [TripStatus.Cancelled] = new() { }
        };

        return validTransitions.ContainsKey(current) &&
               validTransitions[current].Contains(next);
    }
}



public class ApiResponse
{
    public bool Success { get; set; }
    public string Message { get; set; }
    public object? Data { get; set; }

    public ApiResponse(bool success, string message, object? data = null)
    {
        Success = success;
        Message = message;
        Data = data;
    }
}



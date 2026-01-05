using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models;

public class TripListDto
{
    public int Id { get; set; }
    public string BookingId { get; set; }
    public string TripReference { get; set; }
    public TripStatus TripStatus { get; set; }
    public DateTime EstimatedStartDate { get; set; }
    public DateTime EstimatedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }
    public decimal EstimatedDistance { get; set; }
    public decimal EstimatedDuration { get; set; }
    public string? Truck { get; set; }
    public string? Driver { get; set; }
    public int DeliveryCount { get; set; }
    public int CompletedDeliveries { get; set; }
    public int? StartLocationId { get; set; }
    public int? EndLocationId { get; set; }
    public int? TrajectId { get; set; }

}

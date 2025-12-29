namespace TransportManagementSystem.Models;

public class CreateTripDto
{
    public string TripReference { get; set; }
    public decimal EstimatedDistance { get; set; }
    public decimal EstimatedDuration { get; set; }
    public DateTime EstimatedStartDate { get; set; }
    public DateTime EstimatedEndDate { get; set; }
    public int TruckId { get; set; }
    public int DriverId { get; set; }
    public List<CreateDeliveryDto>? Deliveries { get; set; }
}

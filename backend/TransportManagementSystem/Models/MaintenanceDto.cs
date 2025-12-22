using TransportManagementSystem.Entity;

public class MaintenanceDto
{
    public int Id { get; set; }
    public int TripId { get; set; }
    public int VendorId { get; set; }
    public int MechaicId { get; set; }
    public string Status { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int OdometerReading { get; set; }
    public float TotalCost { get; set; }
    public string ServiceDetails { get; set; }
    public string PartsName { get; set; }
    public int Qty { get; set; }
    public Maintenance.NotificationTypeEnum NotificationType { get; set; }
    public string Members { get; set; }
}

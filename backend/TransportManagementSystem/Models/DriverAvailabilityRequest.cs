namespace TransportManagementSystem.Models;

public class DriverAvailabilityRequest
{
    public DateTime Date { get; set; }
    public bool IsAvailable { get; set; }
}

public class BulkAvailabilityRequest
{
    public List<DateTime> Dates { get; set; } = new List<DateTime>();
    public bool IsAvailable { get; set; }
}

public class DateRangeRequest
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}

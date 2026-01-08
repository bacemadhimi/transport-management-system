namespace TransportManagementSystem.Models;

public class DriverAvailabilityDto
{
    public int DriverId { get; set; }
    public string DriverName { get; set; }
    public string Phone { get; set; }
    public string Status { get; set; }
    public Dictionary<string, AvailabilityDayDto> Availability { get; set; }
}

public class AvailabilityDayDto
{
    public bool IsAvailable { get; set; }
    public bool IsDayOff { get; set; }
    public string Reason { get; set; }
}

public class UpdateAvailabilityDto
{
    public string Date { get; set; } // Format: "yyyy-MM-dd"
    public bool IsAvailable { get; set; }
    public bool IsDayOff { get; set; }
    public string Reason { get; set; }
}

public class AvailabilityFilterDto
{
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 10;
    public string Search { get; set; }
    public string StartDate { get; set; } // Format: "yyyy-MM-dd"
    public string EndDate { get; set; } // Format: "yyyy-MM-dd"
}
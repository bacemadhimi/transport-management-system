namespace TransportManagementSystem.Entity;

public class Trip
{
    public int Id { get; set; }
    public string BookingId { get; set; }

    public string TripReference { get; set; } // Référence métier
    public decimal EstimatedDistance { get; set; } // en km
    public decimal EstimatedDuration { get; set; } // en heures
    public DateTime? ActualStartDate { get; set; } // Réel vs planifié
    public DateTime? ActualEndDate { get; set; }
    public DateTime? EstimatedStartDate { get; set; }
    public DateTime? EstimatedEndDate { get; set; }


    public int TruckId { get; set; }
    public Truck Truck { get; set; } 

    public int DriverId { get; set; }
    public Driver Driver { get; set; } 

    public TripStatus TripStatus { get; set; }

    public ICollection<Delivery> Deliveries { get; set; } = new List<Delivery>();
}

public enum TripStatus
{
    Planned,
    InProgress,
    Completed,
    Cancelled,
    Delayed
}

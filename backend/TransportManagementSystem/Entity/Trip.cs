using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class Trip
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [ForeignKey("Driver")]
    public int DriverId { get; set; }

    public Driver Driver { get; set; }

    [Required]
    public DateTime TripStartDate { get; set; }

    [Required]
    public DateTime TripEndDate { get; set; }

    [Required]
    public TripTypeEnum TripType { get; set; }

    [Required]
    [ForeignKey("Truck")]
    public int TruckId { get; set; }  

    public Truck Truck { get; set; }  

    [Required]
    [ForeignKey("Customer")]
    public int CustomerId { get; set; } 

    public Customer Customer { get; set; } 

    [Required]
    public string TripStartLocation { get; set; }

    [Required]
    public string TripEndLocation { get; set; }

    public double? ApproxTotalKM { get; set; }

    public TripStatusEnum TripStatus { get; set; }

    public double? StartKmsReading { get; set; }

    public string BookingId { get; set; } = null!;
    public ICollection<TripLocation> Locations { get; set; } = new List<TripLocation>();

}

public enum TripTypeEnum
{
    SingleTrip ,
    RoundTrip 
}

public enum TripStatusEnum
{
    Booked,
    YetToStart,
    TripStarted,
    Loading,
    InTransit,
    ArrivedToDestination,
    Unloading,
    Completed,
    TripCancelled,
    AcceptedByDriver,
    RejectedByDriver
}

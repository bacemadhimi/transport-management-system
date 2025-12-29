using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace TransportManagementSystem.Entity;

public class TripLocation
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [ForeignKey("Trip")]
    public int TripId { get; set; }

    [JsonIgnore]
    public Trip Trip { get; set; }

    [Required]
    public string Address { get; set; }

    public int Sequence { get; set; }

    public string LocationType { get; set; } = "Pickup";

    public DateTime? ScheduledTime { get; set; }

    public string? Notes { get; set; }
}

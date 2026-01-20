using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

public class Driver
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string? Name { get; set; }
    [Required]
    [EmailAddress]
    public string Email { get; set; }
    public string PermisNumber { get; set; }
    public string Phone { get; set; }
    public string Status { get; set; }
    public int IdCamion { get; set; }
    public string phoneCountry { get; set; }

    public virtual ICollection<DriverAvailability>? Availabilities { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsEnable { get; set; } = true;
}

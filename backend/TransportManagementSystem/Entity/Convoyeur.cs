using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

public class Convoyeur
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    public string Matricule { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string PhoneCountry { get; set; } = string.Empty;
}

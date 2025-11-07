using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

[Table("track")]
public class Camion
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    public string Immatriculation { get; set; } 

    [Required]
    public int Capacity { get; set; }

    [Required]
    public DateTime TechnicalVisitDate { get; set; }

    [Required]
    public string Brand { get; set; } 

    [Required]
    public string Status { get; set; } 
}

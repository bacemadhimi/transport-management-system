using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

[Table("camion")]
[Index(nameof(Name), IsUnique = true)]
public class Camion
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string? Name { get; set; }
}

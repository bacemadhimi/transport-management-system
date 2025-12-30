using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

public class Traject
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; }
    public List<TrajectPoint> Points { get; set; } = new List<TrajectPoint>();
}
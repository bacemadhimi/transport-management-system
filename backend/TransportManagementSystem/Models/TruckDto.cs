namespace TransportManagementSystem.Models;

public class TruckDto
{
    public required string Immatriculation { get; set; }
    public required int Capacity { get; set; }
    public required DateTime TechnicalVisitDate { get; set; }
    public required string Brand { get; set; }
    public required string Status { get; set; }
}

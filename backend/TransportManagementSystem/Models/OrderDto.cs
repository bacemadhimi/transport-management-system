using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models;

public class UpdateOrderDto
{
    public int CustomerId { get; set; }
    public string? Reference { get; set; }
    public string? Type { get; set; }
    public decimal Weight { get; set; }
    public OrderStatus Status { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
    public int Priority { get; set; } = 5;
}

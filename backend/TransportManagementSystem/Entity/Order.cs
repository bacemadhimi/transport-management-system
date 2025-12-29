namespace TransportManagementSystem.Entity;

public class Order
{
    public int Id { get; set; }

    public int CustomerId { get; set; }
    public Customer Customer { get; set; }

    public string Reference { get; set; }
    public decimal Weight { get; set; }
}

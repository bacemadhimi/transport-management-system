using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class Order
{
    [Key]
    public int Id { get; set; }

    [Required]
    public DataSource SourceSystem { get; set; } = DataSource.TMS;

    [StringLength(50)]
    public string? ExternalId { get; set; }

    [Required]
    public int CustomerId { get; set; }

    [ForeignKey("CustomerId")]
    public Customer Customer { get; set; }

    [Required]
    [StringLength(50)]
    public string Reference { get; set; } = string.Empty;

    public string? Type { get; set; } // Shampoo, Gel, Toothpaste, etc.

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal Weight { get; set; } // in kg

    [Required]
    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    [Required]
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedDate { get; set; }

    public string? DeliveryAddress { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    public int Priority { get; set; } = 5; // 1-10, 10 = highest priority

    // Navigation property for deliveries
    public ICollection<Delivery> Deliveries { get; set; } = new List<Delivery>();

    // Additional optional fields
    public string? Dimensions { get; set; } // e.g., "30x40x50 cm"
    public string? SpecialInstructions { get; set; }
}

public enum OrderStatus
{
    Pending,          // En attente
    ReadyToLoad,      // Prête au chargement
    InProgress,       // En cours de livraison
    Received,         // Réception
    Closed,           // Clôturée
    Cancelled         // Annulée
}

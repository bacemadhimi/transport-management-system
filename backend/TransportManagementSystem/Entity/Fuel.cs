using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity
{
    public class Fuel
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string? Vechicle { get; set; }
        [Required]
        public string? AddedDriver { get; set; }

        [Required]
        public DateTime?FillDate { get; set; }
        [Required]
        public int? Quantity { get; set; }
        [Required]
        public string? OdometerReading { get; set; }
        [Required]
        public float? Amount { get; set; }
        [Required]
        public string? Comment { get; set; }
        [Required]
        public string? FuelTank { get; set; }
        [Required]
        public string? Vendor { get; set; }
    }
}

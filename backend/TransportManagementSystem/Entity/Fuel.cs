using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity
{
    public class Fuel
    {
        [Key]
        public int Id { get; set; }
        [Required]
        [ForeignKey("Truck")]
        public int TruckId { get; set; }

        public Truck? Truck { get; set; }
        [Required]
        [ForeignKey("Driver")]
        public int DriverId { get; set; }

        public Driver? Driver { get; set; }

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
 
        [ForeignKey("FuelVendor")]
        public int FuelVendorId { get; set; }
        public FuelVendor? FuelVendor { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity
{
    public class Fuel
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        // Truck relationship
        [Required]
        [ForeignKey("Truck")]
        public int TruckId { get; set; }
        public Truck Truck { get; set; }

        // Driver relationship
        [Required]
        [ForeignKey("Driver")]
        public int DriverId { get; set; }
        public Driver Driver { get; set; }


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


        // Driver relationship
        [Required]
        [ForeignKey("FuelVendor")]
        public int FuelVendorId { get; set; }
        public FuelVendor fuelVendor { get; set; }
    }
}

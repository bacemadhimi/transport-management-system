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
<<<<<<< HEAD
        public Truck Truck { get; set; }

        // Driver relationship
        [Required]
        [ForeignKey("Driver")]
        public int DriverId { get; set; }
        public Driver Driver { get; set; }

=======

        public Truck? Truck { get; set; }
        [Required]
        [ForeignKey("Driver")]
        public int DriverId { get; set; }

        public Driver? Driver { get; set; }
>>>>>>> d0dbbe5a390fb86a3e28ee4abf701a981a38a0b5

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
<<<<<<< HEAD


        // Driver relationship
        [Required]
        [ForeignKey("FuelVendor")]
        public int FuelVendorId { get; set; }
        public FuelVendor fuelVendor { get; set; }
=======
 
        [ForeignKey("FuelVendor")]
        public int FuelVendorId { get; set; }
        public FuelVendor? FuelVendor { get; set; }
>>>>>>> d0dbbe5a390fb86a3e28ee4abf701a981a38a0b5
    }
}

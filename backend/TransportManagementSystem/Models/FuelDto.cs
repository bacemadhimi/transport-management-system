using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Models
{
    public class FuelDto
    {
        public int Id { get; set; }   // ✅ Needed for GET

        [Required]
        public int TruckId { get; set; }

        [Required]
        public int DriverId { get; set; }

        [Required]
        public DateTime FillDate { get; set; }

        [Required]
        public int Quantity { get; set; }

        [Required]
        public string OdometerReading { get; set; }

        [Required]
        public float Amount { get; set; }

        [Required]
        public string Comment { get; set; }

        [Required]
        public string FuelTank { get; set; }

        [Required]
        public int FuelVendorId { get; set; }
    }
}

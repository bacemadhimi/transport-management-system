using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity
{
    public class Fuel_Vendor
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string Name { get; set; }
    }
}

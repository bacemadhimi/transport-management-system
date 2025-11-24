using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity
{
    public class Driver
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string? Name { get; set; }
        public string PermisNumber { get; set; }
        public int Phone { get; set; }
        public string Status { get; set; }
        public int IdCamion { get; set; }
    }
}

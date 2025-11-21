using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace TransportManagementSystem.Entity
{
    public class Driver
    {
        [Key]
        [JsonIgnore]
        public int Id { get; set; }
        [Required]
        public string? Name { get; set; }
        public string PermisNumber { get; set; }
        public int Phone { get; set; }
        public string Status { get; set; }
        public int IdCamion { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity
{
    public class Customer
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string Name { get; set; }
       
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Adress { get; set; }
    }
}

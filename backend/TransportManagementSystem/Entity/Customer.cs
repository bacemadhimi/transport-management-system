using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity
{
    public class Customer
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        [Required]
        public string Name { get; set; }
       
        public string Phone { get; set; }
        public string phoneCountry { get; set; }
        public string Email { get; set; }
        public string Adress { get; set; }

        [Required]
        public string Matricule { get; set; }
    }
}

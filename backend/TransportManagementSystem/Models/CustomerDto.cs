namespace TransportManagementSystem.Models
{
    public class CustomerDto
    {
        public required string Name { get; set; }
        public required string Phone { get; set; }
        public required string phoneCountry { get; set; }
        virtual public required string Email { get; set; }
        public required string Adress { get; set; }
        public required string Matricule { get; set; }
    }
}

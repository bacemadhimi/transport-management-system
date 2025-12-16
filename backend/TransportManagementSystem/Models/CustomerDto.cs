namespace TransportManagementSystem.Models
{
    public class CustomerDto
    {
        public required string Name { get; set; }
        public required string Phone { get; set; }
        virtual public required string Email { get; set; }
        public required string Adress { get; set; }
    }
}

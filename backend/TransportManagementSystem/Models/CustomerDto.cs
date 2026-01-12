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
      //  public required string FamilleProduct { get; set; }
        public required string Gouvernorat { get; set; }
        public required string Contact { get; set; }
        public required string Zone { get; set; }
       // public required string TypeAdress { get; set; }
    }
}

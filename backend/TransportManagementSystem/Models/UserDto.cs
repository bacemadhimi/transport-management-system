namespace TransportManagementSystem.Models
{
    public class UserDto
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string? Password { get; set; }
        public string? ProfileImage { get; set; }
        public string? Phone { get; set; }

   
        public List<int> UserGroupIds { get; set; } = new List<int>();
    }

}

using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

public class UserGroup
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

 
    public ICollection<UserUserGroup> UserUserGroups { get; set; }
        = new List<UserUserGroup>();
}

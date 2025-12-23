using System.Text.Json.Serialization;

namespace TransportManagementSystem.Models;

public class UserWithGroupsDto
{
    public int Id { get; set; }
    public string Email { get; set; }
    public string? Name { get; set; }
    public string Role { get; set; }
    public string? Phone { get; set; }
    public string? ProfileImage { get; set; }
    public List<int> GroupIds { get; set; } = new();
    public List<string> GroupNames { get; set; } = new List<string>();

    [JsonIgnore]
    public string GroupsDisplay => GroupNames != null && GroupNames.Any()
       ? string.Join(", ", GroupNames)
       : "Aucun groupe";
}

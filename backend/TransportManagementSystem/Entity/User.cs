using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace TransportManagementSystem.Entity;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; }
    public string Password { get; set; }
    public string Role { get; set; }
    public string? ProfileImage { get; set; }

    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? Permissions { get; set; }

    [NotMapped]
    public Dictionary<string, bool> PermissionsDict
    {
        get => string.IsNullOrEmpty(Permissions)
                ? new Dictionary<string, bool>()
                : JsonSerializer.Deserialize<Dictionary<string, bool>>(Permissions)!;
        set => Permissions = JsonSerializer.Serialize(value);
    }
}

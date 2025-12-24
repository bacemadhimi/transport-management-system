namespace TransportManagementSystem.Models;

public class UpdateUserWithPasswordDto : UserWithGroupsDto
{
    public string? OldPassword { get; set; }
    public string? Password { get; set; }
}

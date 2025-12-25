
using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Controllers;
[Route("api/permissions")]
[ApiController]
public class PermissionController : ControllerBase
{
    private readonly IRepository<Role> groupRepo;
    private readonly IRepository<Permission> permissionRepo;
    private readonly IRepository<UserRolePermission> ugpRepo;

    public PermissionController(
    IRepository<Role> groupRepo,
        IRepository<Permission> permissionRepo,
        IRepository<UserRolePermission> ugpRepo)
    {
        this.groupRepo = groupRepo;
        this.permissionRepo = permissionRepo;
        this.ugpRepo = ugpRepo;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllPermissions()
    {
        var permissions = await permissionRepo.GetAll();
        return Ok(permissions.Select(p => p.Code));
    }

    [HttpGet("group/{groupId}")]
    public async Task<IActionResult> GetGroupPermissions(int groupId)
    {
        var perms = await ugpRepo.GetAll(x => x.RoleId == groupId);
        return Ok(perms.Select(p => p.Permission.Code));
    }

    [HttpPost("group/{groupId}")]
    public async Task<IActionResult> SaveGroupPermissions(
      int groupId,
      [FromBody] List<string> permissions)
    {
        var group = await groupRepo.FindByIdAsync(groupId);
        if (group == null)
            return NotFound("Groupe introuvable");

        var existing = await ugpRepo.GetAll(x => x.RoleId == groupId);
        foreach (var item in existing)
        {
            await ugpRepo.DeleteAsync(item.RoleId, item.PermissionId);
        }

        foreach (var code in permissions)
        {
            var permission = (await permissionRepo.GetAll(p => p.Code == code))
                             .FirstOrDefault();

            if (permission == null)
            {
                permission = new Permission { Code = code };
                await permissionRepo.AddAsync(permission);
                await permissionRepo.SaveChangesAsync();
            }

            await ugpRepo.AddAsync(new UserRolePermission
            {
                RoleId = groupId,
                PermissionId = permission.Id
            });
        }

        await ugpRepo.SaveChangesAsync();
        return Ok();
    }
}


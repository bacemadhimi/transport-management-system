using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Controllers;

[Route("api/user-rights")]
[ApiController]
public class UserRightController : ControllerBase
{
    private readonly IRepository<UserGroup> groupRepo;
    private readonly IRepository<UserRight> rightRepo;
    private readonly IRepository<UserGroup2Right> groupRightRepo;

    public UserRightController(
        IRepository<UserGroup> groupRepo,
        IRepository<UserRight> rightRepo,
        IRepository<UserGroup2Right> groupRightRepo)
    {
        this.groupRepo = groupRepo;
        this.rightRepo = rightRepo;
        this.groupRightRepo = groupRightRepo;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUserRights()
    {
        var rights = await rightRepo.GetAll();
        return Ok(rights.Select(r => r.Code));
    }

    [HttpGet("group/{groupId}")]
    public async Task<IActionResult> GetUserGroupRights(int groupId)
    {
        var rights = await groupRightRepo.GetAll(x => x.UserGroupId == groupId);
        return Ok(rights.Select(r => r.UserRight.Code));
    }

    [HttpPost("group/{groupId}")]
    public async Task<IActionResult> SaveUserGroupRights(
        int groupId,
        [FromBody] List<string> rights)
    {
        var group = await groupRepo.FindByIdAsync(groupId);
        if (group == null)
            return NotFound("Groupe introuvable");

  
        var existing = await groupRightRepo.GetAll(x => x.UserGroupId == groupId);
        foreach (var item in existing)
        {
            await groupRightRepo.DeleteAsync(item);
        }


        foreach (var code in rights.Distinct())
        {
            var right = (await rightRepo.GetAll(r => r.Code == code))
                        .FirstOrDefault();

            if (right == null)
            {
                right = new UserRight { Code = code };
                await rightRepo.AddAsync(right);
                await rightRepo.SaveChangesAsync();
            }

            await groupRightRepo.AddAsync(new UserGroup2Right
            {
                UserGroupId = groupId,
                UserRightId = right.Id
            });
        }

        await groupRightRepo.SaveChangesAsync();
        return Ok();
    }
}

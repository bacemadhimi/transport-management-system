using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UserGroupController : ControllerBase
{
    private readonly IRepository<UserGroup> _userGroupRepository;
    private readonly IRepository<UserRight> _userRightRepository;

    public UserGroupController(IRepository<UserGroup> userGroupRepository, IRepository<UserRight> userRightRepository)
    {
        this._userGroupRepository = userGroupRepository;
        this._userRightRepository = userRightRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoles([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<UserGroup>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await _userGroupRepository.GetAll();
        }
        else
        {
            pagedData.Data = await _userGroupRepository.GetAll(x =>
                x.Name.Contains(searchOption.Search));
        }

        pagedData.TotalData = pagedData.Data.Count;

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            pagedData.Data = pagedData.Data
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value)
                .ToList();
        }

        return Ok(pagedData);
    }

    [HttpGet("All")]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _userGroupRepository.GetAll();
        return Ok(roles);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var role = await _userGroupRepository.FindByIdAsync(id);
        if (role == null)
            return NotFound();

        return Ok(role);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UserGroup model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        await _userGroupRepository.AddAsync(model);
        await _userGroupRepository.SaveChangesAsync();

        return Ok(model);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UserGroup model)
    {
        var role = await _userGroupRepository.FindByIdAsync(id);
        if (role == null)
            return NotFound();

        role.Name = model.Name;

        _userGroupRepository.Update(role);
        await _userGroupRepository.SaveChangesAsync();

        return Ok(role);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _userGroupRepository.DeleteAsync(id);
        await _userGroupRepository.SaveChangesAsync();

        return Ok();
    }

    [HttpGet("group/{groupId}/permissions")]
    public async Task<IActionResult> GetGroupPermissions(int groupId)
    {
        var group = await _userGroupRepository.FindByIdAsync(groupId);
        if (group == null)
            return NotFound();

        var permissions = group.UserGroup2Right
            .Select(ugr => ugr.UserRight.Code)
            .ToList();

        return Ok(permissions);
    }
    [HttpPost("group/{groupId}/permissions")]
    public async Task<IActionResult> SaveGroupPermissions(int groupId, [FromBody] List<string> permissionCodes)
    {
        // Récupérer le groupe
        var group = (await _userGroupRepository.GetAll(g => g.Id == groupId))
             .FirstOrDefault();

        if (group == null)
            return NotFound();

        // Initialiser la collection si null
        group.UserGroup2Right ??= new List<UserGroup2Right>();

        // Supprimer les anciennes permissions
        group.UserGroup2Right.Clear();

        // Récupérer tous les droits
        var allRights = await _userRightRepository.GetAll();

        foreach (var code in permissionCodes)
        {
            var right = allRights.FirstOrDefault(x => string.Equals(x.Code, code, StringComparison.OrdinalIgnoreCase));

            if (right != null)
            {
                group.UserGroup2Right.Add(new UserGroup2Right
                {
                    UserGroupId = group.Id,
                    UserRightId = right.Id
                });
            }
            else
            {
                Console.WriteLine($"Code non trouvé : {code}");
            }
        }

        // Sauvegarder les changements
        _userGroupRepository.Update(group);
        await _userGroupRepository.SaveChangesAsync();

        return Ok();
    }


}

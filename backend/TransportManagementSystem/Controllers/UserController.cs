using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using TransportManagementSystem.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class UserController : ControllerBase
{
    private readonly IRepository<User> userRepository;
    private readonly IRepository<UserGroup> groupRepository;
    private readonly IRepository<UserUserGroup> userGroupRepository;
    private readonly PasswordHelper passwordHelper;

    public UserController(
        IRepository<User> userRepository,
        IRepository<UserGroup> groupRepository,
        IRepository<UserUserGroup> userGroupRepository)
    {
        this.userRepository = userRepository;
        this.groupRepository = groupRepository;
        this.userGroupRepository = userGroupRepository;
        this.passwordHelper = new PasswordHelper();
    }

    [HttpGet]
    public async Task<IActionResult> GetUserList([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<UserWithGroupsDto>();
        var users = string.IsNullOrEmpty(searchOption.Search)
            ? await userRepository.GetAll()
            : await userRepository.GetAll(x =>
                x.Name.Contains(searchOption.Search) ||
                x.Email.Contains(searchOption.Search) ||
                x.Role.Contains(searchOption.Search) ||
                (x.Phone != null && x.Phone.Contains(searchOption.Search)));

        pagedData.TotalData = users.Count;

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            users = users
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value)
                .ToList();
        }

 
        var userIds = users.Select(u => u.Id).ToList();
        var userGroups = await userGroupRepository.GetAll(x => userIds.Contains(x.UserId));

 
        var groupIds = userGroups.Select(ug => ug.UserGroupId).Distinct().ToList();
        var groups = await groupRepository.GetAll(x => groupIds.Contains(x.Id));
        var groupDictionary = groups.ToDictionary(g => g.Id, g => g.Name);

   
        var userGroupsMap = userGroups.GroupBy(x => x.UserId)
            .ToDictionary(g => g.Key, g => g.Select(ug => ug.UserGroupId).ToList());

        pagedData.Data = users.Select(u => new UserWithGroupsDto
        {
            Id = u.Id,
            Email = u.Email,
            Name = u.Name,
            Role = u.Role,
            Phone = u.Phone,
            ProfileImage = u.ProfileImage,
            GroupIds = userGroupsMap.ContainsKey(u.Id) ? userGroupsMap[u.Id] : new List<int>(),
            GroupNames = userGroupsMap.ContainsKey(u.Id)
                ? userGroupsMap[u.Id]
                    .Select(groupId => groupDictionary.ContainsKey(groupId)
                        ? groupDictionary[groupId]
                        : $"Groupe {groupId}")
                    .ToList()
                : new List<string>()
        }).ToList();

        return Ok(pagedData);
    }

    // GET: api/user/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(int id)
    {
        var user = await userRepository.FindByIdAsync(id);
        if (user == null)
            return NotFound();

        // Load user groups
        var userGroups = await userGroupRepository.GetAll(x => x.UserId == id);
        var groupIds = userGroups.Select(g => g.UserGroupId).ToList();

        var result = new UserWithGroupsDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            Role = user.Role,
            Phone = user.Phone,
            ProfileImage = user.ProfileImage,
            GroupIds = groupIds
        };

        return Ok(result);
    }

    // POST: api/user
    [HttpPost]
    public async Task<IActionResult> AddUser([FromBody] UserWithGroupsDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var exists = (await userRepository.GetAll(x => x.Email == model.Email))
            .Any();

        if (exists)
            return BadRequest("Un utilisateur avec cet email existe déjà");

        var user = new User
        {
            Email = model.Email,
            Name = model.Name,
            Role = model.Role,
            Phone = model.Phone,
            ProfileImage = model.ProfileImage,
            Password = passwordHelper.HashPassword("12345") // Default password
        };

        // Add user first to get the ID
        await userRepository.AddAsync(user);
        await userRepository.SaveChangesAsync();

        // Add user-group relationships
        if (model.GroupIds != null && model.GroupIds.Any())
        {
            foreach (var groupId in model.GroupIds)
            {
                // Verify group exists
                var groupExists = await groupRepository.FindByIdAsync(groupId);
                if (groupExists != null)
                {
                    var userGroup = new UserUserGroup
                    {
                        UserId = user.Id,
                        UserGroupId = groupId
                    };
                    await userGroupRepository.AddAsync(userGroup);
                }
            }
            await userGroupRepository.SaveChangesAsync();
        }

        model.Id = user.Id; // Return the generated ID
        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, model);
    }

    // PUT: api/user/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserWithPasswordDto model)
    {
        var passwordHelper = new PasswordHelper();
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await userRepository.FindByIdAsync(id);
        if (user == null)
            return NotFound();

        var exists = (await userRepository
            .GetAll(x => x.Email == model.Email && x.Id != id))
            .Any();

        if (exists)
            return BadRequest("Un utilisateur avec cet email existe déjà");

        if (!string.IsNullOrEmpty(model.Password))
        {
            if (string.IsNullOrEmpty(model.OldPassword))
                return BadRequest("L'ancien mot de passe est requis pour modifier le mot de passe");

            if (!passwordHelper.VerifyPassword(user.Password, model.OldPassword))
                return BadRequest("L'ancien mot de passe est incorrect");

    
            user.Password = passwordHelper.HashPassword(model.Password);
        }
    
        user.Name = model.Name;
        user.Email = model.Email;
        user.Phone = model.Phone;
        user.Role = model.Role;
        user.ProfileImage = model.ProfileImage;

        // Update groups
        if (model.GroupIds != null)
        {
            // Get existing user groups
            var existingUserGroups = await userGroupRepository.GetAll(x => x.UserId == id);
            var existingGroupIds = existingUserGroups.Select(g => g.UserGroupId).ToList();

            // Find groups to remove
            var groupsToRemove = existingGroupIds.Except(model.GroupIds).ToList();
            foreach (var groupId in groupsToRemove)
            {
                var userGroupToRemove = existingUserGroups.FirstOrDefault(g => g.UserGroupId == groupId);
                if (userGroupToRemove != null)
                {
                    await userGroupRepository.DeleteAsync(id, groupId);
                }
            }

            // Find groups to add
            var groupsToAdd = model.GroupIds.Except(existingGroupIds).ToList();
            foreach (var groupId in groupsToAdd)
            {
                // Verify group exists
                var groupExists = await groupRepository.FindByIdAsync(groupId);
                if (groupExists != null)
                {
                    var newUserGroup = new UserUserGroup
                    {
                        UserId = id,
                        UserGroupId = groupId
                    };
                    await userGroupRepository.AddAsync(newUserGroup);
                }
            }
        }
        else
        {
            // If no groups provided, remove all existing groups
            var existingUserGroups = await userGroupRepository.GetAll(x => x.UserId == id);
            foreach (var userGroup in existingUserGroups)
            {
                await userGroupRepository.DeleteAsync(userGroup.UserGroupId);
            }
        }

        userRepository.Update(user);
        await userRepository.SaveChangesAsync();
        await userGroupRepository.SaveChangesAsync();

        return Ok(model);
    }

    // DELETE: api/user/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await userRepository.FindByIdAsync(id);
        if (user == null)
            return NotFound();

        var currentUserEmail = User.Identity?.Name;
        if (user.Email == currentUserEmail)
            return BadRequest("Vous ne pouvez pas supprimer votre propre compte");

        // Delete user-group relationships first
        var userGroups = await userGroupRepository.GetAll(x => x.UserId == id);
        foreach (var userGroup in userGroups)
        {
            await userGroupRepository.DeleteAsync(userGroup.UserGroupId);
        }
        await userGroupRepository.SaveChangesAsync();

        // Delete the user
        await userRepository.DeleteAsync(id);
        await userRepository.SaveChangesAsync();

        return Ok();
    }

    [HttpGet("{id}/groups")]
    public async Task<IActionResult> GetUserGroups(int id)
    {
        var user = await userRepository.FindByIdAsync(id);
        if (user == null)
            return NotFound($"Utilisateur avec ID {id} non trouvé");

        // Get user groups through UserUserGroup repository
        var userGroups = await userGroupRepository.GetAll(x => x.UserId == id);
        var groups = userGroups
            .Select(uug => new UserGroupDto
            {
                Id = uug.UserGroupId,
                Name = uug.UserGroup?.Name ?? "Unknown",
                CreatedAt = uug.UserGroup?.CreatedAt ?? DateTime.MinValue,
                UpdatedAt = uug.UserGroup?.UpdatedAt ?? DateTime.MinValue
            })
            .ToList();

        return Ok(groups);
    }
}
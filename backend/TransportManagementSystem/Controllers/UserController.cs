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
    private readonly PasswordHelper passwordHelper;

    public UserController(
        IRepository<User> userRepository,
        IRepository<UserGroup> groupRepository)
    {
        this.userRepository = userRepository;
        this.groupRepository = groupRepository;
        this.passwordHelper = new PasswordHelper();
    }

    // GET: api/user
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

        pagedData.Data = users.Select(u => new UserWithGroupsDto
        {
            Id = u.Id,
            Email = u.Email,
            Name = u.Name,
            Role = u.Role,
            Phone = u.Phone,
            ProfileImage = u.ProfileImage,
            GroupIds = u.UserUserGroups.Select(g => g.UserGroupId).ToList()
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

        var result = new UserWithGroupsDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            Role = user.Role,
            Phone = user.Phone,
            ProfileImage = user.ProfileImage,
            GroupIds = user.UserUserGroups.Select(g => g.UserGroupId).ToList()
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
            Password = passwordHelper.HashPassword("12345")
        };

        foreach (var groupId in model.GroupIds)
        {
            user.UserUserGroups.Add(new UserUserGroup
            {
                UserGroupId = groupId
            });
        }

        await userRepository.AddAsync(user);
        await userRepository.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, model);
    }

    // PUT: api/user/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UserWithGroupsDto model)
    {
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

        user.Name = model.Name;
        user.Email = model.Email;
        user.Phone = model.Phone;
        user.Role = model.Role;
        user.ProfileImage = model.ProfileImage;

        // Update groups
        user.UserUserGroups.Clear();
        foreach (var groupId in model.GroupIds)
        {
            user.UserUserGroups.Add(new UserUserGroup
            {
                UserId = user.Id,
                UserGroupId = groupId
            });
        }

        userRepository.Update(user);
        await userRepository.SaveChangesAsync();

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

        await userRepository.DeleteAsync(id);
        await userRepository.SaveChangesAsync();

        return Ok();
    }
}

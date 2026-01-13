using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using TransportManagementSystem.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UserController : ControllerBase
{
    private readonly IRepository<User> userRepository;
    private readonly PasswordHelper passwordHelper;

    public UserController(IRepository<User> userRepository)
    {
        this.userRepository = userRepository;
        this.passwordHelper = new PasswordHelper();
    }

    //GET
    [HttpGet]
    public async Task<IActionResult> GetUserList([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<User>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await userRepository.GetAll();
        }
        else
        {
            pagedData.Data = await userRepository.GetAll(x =>
                               x.Name.Contains(searchOption.Search) ||
                               x.Email.Contains(searchOption.Search) ||
                               (x.Phone != null && x.Phone.Contains(searchOption.Search))
                               );
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

    //GET BY ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById([FromRoute] int id)
    {
        var user = await userRepository.FindByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }
        return Ok(user);
    }

    //CREATE
    [HttpPost]
    public async Task<IActionResult> AddUser([FromBody] UserDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existingUser = (await userRepository.GetAll(x => x.Email == model.Email)).FirstOrDefault();
        if (existingUser != null)
            return BadRequest("Un utilisateur avec cet email existe déjà");

        var user = new User
        {
            Name = model.Name,
            Email = model.Email,
            Phone = model.Phone,
            ProfileImage = model.ProfileImage,
            Password = passwordHelper.HashPassword("12345")
        };

        // Ajouter les UserGroups
        if (model.UserGroupIds != null && model.UserGroupIds.Any())
        {
            user.UserGroup2Users = new List<UserGroup2User>();
            foreach (var groupId in model.UserGroupIds)
            {
                user.UserGroup2Users.Add(new UserGroup2User
                {
                    User = user,
                    UserGroupId = groupId
                });
            }
        }

        await userRepository.AddAsync(user);
        await userRepository.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, user);
    }

    //UPDATE
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UserDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await userRepository.FindByIdAsync(id);
        if (user == null)
            return NotFound();

        var existingUser = (await userRepository.GetAll(x => x.Email == model.Email && x.Id != id)).FirstOrDefault();
        if (existingUser != null)
            return BadRequest("Un utilisateur avec cet email existe déjà");
        user.Name = model.Name;
        user.Email = model.Email;
        user.Phone = model.Phone;
        user.ProfileImage = model.ProfileImage;
        if (!string.IsNullOrEmpty(model.Password))
        {
            user.Password = passwordHelper.HashPassword(model.Password);
        }
        user.UserGroup2Users.Clear();
        if (model.UserGroupIds != null && model.UserGroupIds.Any())
        {
            foreach (var groupId in model.UserGroupIds)
            {
                user.UserGroup2Users.Add(new UserGroup2User
                {
                    UserId = user.Id,
                    UserGroupId = groupId
                });
            }
        }
        userRepository.Update(user);
        await userRepository.SaveChangesAsync();
        return Ok(user);
    }



    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await userRepository.FindByIdAsync(id);
        if (user == null)
            return NotFound();
        var currentUserEmail = User.Identity.Name;
        if (user.Email == currentUserEmail)
            return BadRequest("Vous ne pouvez pas supprimer votre propre compte");
        await userRepository.DeleteAsync(id);
        await userRepository.SaveChangesAsync();
        return Ok();
    }
}

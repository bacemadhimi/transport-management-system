using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using TransportManagementSystem.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UserController : ControllerBase
    {
        private readonly IRepository<User> userRepository;
        private readonly PasswordHelper passwordHelper;

        public UserController(IRepository<User> userRepository)
        {
            this.userRepository = userRepository;
            this.passwordHelper = new PasswordHelper();
        }


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
                                   x.Role.Contains(searchOption.Search) ||
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

        [HttpPost]
        public async Task<IActionResult> AddUser([FromBody] User model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);


            var existingUser = (await userRepository.GetAll(x => x.Email == model.Email)).FirstOrDefault();
            if (existingUser != null)
                return BadRequest("Un utilisateur avec cet email existe déjà");

            model.Password = passwordHelper.HashPassword(model.Password ?? "12345"); 
            await userRepository.AddAsync(model);
            await userRepository.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUserById), new { id = model.Id }, model);
        }


        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] User model)
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
            user.Role = model.Role;
            user.ProfileImage = model.ProfileImage;

            if (!string.IsNullOrEmpty(model.Password))
            {
                user.Password = passwordHelper.HashPassword(model.Password);
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
}

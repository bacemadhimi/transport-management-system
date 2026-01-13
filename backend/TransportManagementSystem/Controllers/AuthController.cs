using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; // nécessaire pour Include / ThenInclude
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using TransportManagementSystem.Service;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IRepository<User> _userRepository;
        private readonly IConfiguration _configuration;

        public AuthController(IRepository<User> userRepository, IConfiguration configuration)
        {
            _userRepository = userRepository;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AuthDto model)
        {

            var user = await _userRepository.Query()
                .Include(u => u.UserGroup2Users)
                    .ThenInclude(ugu => ugu.UserGroup)
                .Where(u => u.Email == model.Email)
                .FirstOrDefaultAsync(); 

            if (user == null)
                return BadRequest(new { message = "Utilisateur non trouvé" });

            var passwordHelper = new PasswordHelper();
            if (!passwordHelper.VerifyPassword(user.Password, model.Password))
                return BadRequest(new { message = "Email ou mot de passe incorrect" });

            var groups = user.UserGroup2Users
                             .Select(ugu => ugu.UserGroup.Name)
                             .ToList();

            var primaryRole = groups.FirstOrDefault() ?? "Admin";

            var token = GenerateToken(user.Id,user.Email, primaryRole);

            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtToken = tokenHandler.ReadJwtToken(token);

            var expClaim = jwtToken.Claims.First(c => c.Type == JwtRegisteredClaimNames.Exp).Value;
            var expTimestamp = long.Parse(expClaim);
            var expiryDate = DateTimeOffset.FromUnixTimeSeconds(expTimestamp).ToLocalTime().DateTime;

            return Ok(new AuthTokenDto
            {
                Id = user.Id,
                Email = user.Email,
                Token = token,
                Role = primaryRole,
                Expiry = expiryDate
            });
        }

        private string GenerateToken(int userId,string email, string role)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtKey"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Name, email),
                new Claim(ClaimTypes.Role, role)
            };

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [Authorize]
        [HttpPost("Profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] ProfileDto model)
        {
            var email = User.FindFirstValue(ClaimTypes.Name);

            var users = await _userRepository.GetAll(x => x.Email == email);
            var user = users.FirstOrDefault();

            if (user == null)
                return Unauthorized(new { message = "Utilisateur non trouvé" });

            var passwordHelper = new PasswordHelper();

            if (!string.IsNullOrEmpty(model.Password))
            {
                if (string.IsNullOrEmpty(model.OldPassword))
                    return BadRequest(new { message = "L'ancien mot de passe est requis" });

                if (!passwordHelper.VerifyPassword(user.Password, model.OldPassword))
                    return BadRequest(new { message = "Ancien mot de passe incorrect" });

                user.Password = passwordHelper.HashPassword(model.Password);
            }

            if (!string.IsNullOrEmpty(model.Name)) user.Name = model.Name;
            if (!string.IsNullOrEmpty(model.Phone)) user.Phone = model.Phone;
            if (!string.IsNullOrEmpty(model.ProfileImage)) user.ProfileImage = model.ProfileImage;

            if (!string.IsNullOrEmpty(model.Email) && model.Email != user.Email)
            {
                var existingUser = (await _userRepository.GetAll(x => x.Email == model.Email && x.Id != user.Id))
                                   .FirstOrDefault();
                if (existingUser != null)
                    return BadRequest(new { message = "Cet email est déjà utilisé" });

                user.Email = model.Email;
            }

            _userRepository.Update(user);
            await _userRepository.SaveChangesAsync();

            return Ok(new { message = "Profil mis à jour avec succès" });
        }

        [Authorize]
        [HttpGet("Profile")]
        public async Task<IActionResult> GetProfile()
        {
            var email = User.FindFirstValue(ClaimTypes.Name);

            var users = await _userRepository.GetAll(x => x.Email == email);
            var user = users.FirstOrDefault();

            if (user == null)
                return Unauthorized(new { message = "Utilisateur non trouvé" });

            return Ok(new ProfileDto
            {
                Name = user.Name,
                Phone = user.Phone,
                Email = user.Email,
                ProfileImage = user.ProfileImage
            });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto model)
        {
            if (string.IsNullOrEmpty(model.Email))
                return BadRequest(new { message = "Email requis" });

            var users = await _userRepository.GetAll(x => x.Email == model.Email);
            var user = users.FirstOrDefault();

            if (user == null)
                return BadRequest(new { message = "Aucun utilisateur avec cet email" });

            string newPassword = PasswordHelper.GenerateRandomPassword();
            user.Password = new PasswordHelper().HashPassword(newPassword);

            _userRepository.Update(user);
            await _userRepository.SaveChangesAsync();

            var emailService = new EmailService(_configuration);
            await emailService.SendAsync(
                user.Email,
                "Réinitialisation de votre mot de passe",
                $"Bonjour,<br><br>Votre nouveau mot de passe est : <b>{newPassword}</b><br><br>Veuillez le changer après connexion."
            );

            return Ok(new { message = "Un nouveau mot de passe a été envoyé à votre adresse email." });
        }
    }
}

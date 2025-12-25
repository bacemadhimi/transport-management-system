using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
        private readonly IRepository<User> userRepository;
        private readonly IConfiguration configuration;

        public AuthController(IRepository<User> userRepository, IConfiguration configuration)
        {
            this.userRepository = userRepository;
            this.configuration = configuration;
        }
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AuthDto model)
        {
            var user = (await userRepository.GetAll(x => x.Email == model.Email)).FirstOrDefault();


            if (user == null)
            {
                return new BadRequestObjectResult(new { message = "Utilisateur non trouvé" });
            }
            var passwordHelper = new PasswordHelper();

            if (!passwordHelper.VerifyPassword(user.Password, model.Password))
            {
                return new BadRequestObjectResult(new { message = "email ou mote de passe incorrect" });
            }

            var token = GenerateToken(user.Email, user.Role.Name);
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtToken = tokenHandler.ReadJwtToken(token);

            var expClaim = jwtToken.Claims.First(c => c.Type == JwtRegisteredClaimNames.Exp).Value;
            var expTimestamp = long.Parse(expClaim);
            var expiryDate = DateTimeOffset.FromUnixTimeSeconds(expTimestamp).ToLocalTime().DateTime;

            return Ok(new AuthTokenDto()
            {
                Id = user.Id,
                Email = user.Email,
                Token = token,
                Role = user.Role.Name,
                Expiry = expiryDate
            });
        }
        private string GenerateToken(string email, string role)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["JwtKey"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.Name,email),
               new Claim(ClaimTypes.Role,role)
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
            try
            {
                var email = User.FindFirstValue(ClaimTypes.Name);
                var user = (await userRepository.GetAll(x => x.Email == email)).FirstOrDefault();

                if (user == null)
                {
                    return Unauthorized(new { message = "Utilisateur non trouvé" });
                }

                if (!string.IsNullOrEmpty(model.Password))
                {

                    if (string.IsNullOrEmpty(model.OldPassword))
                    {
                        return BadRequest(new { message = "L'ancien mot de passe est requis pour changer le mot de passe" });
                    }


                    var passwordHelper = new PasswordHelper();
                    bool isOldPasswordCorrect = passwordHelper.VerifyPassword(user.Password, model.OldPassword);

                    if (!isOldPasswordCorrect)
                    {
                        return BadRequest(new { message = "Ancien mot de passe incorrect" });
                    }


                    user.Password = passwordHelper.HashPassword(model.Password);
                }


                if (!string.IsNullOrEmpty(model.Name))
                    user.Name = model.Name;

                if (!string.IsNullOrEmpty(model.Phone))
                    user.Phone = model.Phone;

                if (!string.IsNullOrEmpty(model.Email) && model.Email != user.Email)
                {
                    var existingUser = (await userRepository.GetAll(x => x.Email == model.Email && x.Id != user.Id)).FirstOrDefault();
                    if (existingUser != null)
                    {
                        return BadRequest(new { message = "Cet email est déjà utilisé par un autre utilisateur" });
                    }
                    user.Email = model.Email;
                }

                if (!string.IsNullOrEmpty(model.ProfileImage))
                    user.ProfileImage = model.ProfileImage;



                userRepository.Update(user);
                await userRepository.SaveChangesAsync();

                return Ok(new { message = "Profil mis à jour avec succès" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors de la mise à jour du profil: {ex.Message}");
                return StatusCode(500, new { message = "Une erreur est survenue lors de la mise à jour du profil" });
            }
        }
        [Authorize]
        [HttpGet("Profile")]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var email = User.FindFirstValue(ClaimTypes.Name);

                var user = (await userRepository.GetAll(x => x.Email == email)).FirstOrDefault();

                if (user == null)
                {
                    return Unauthorized(new { message = "Utilisateur non trouvé" });
                }



                return Ok(new ProfileDto()
                {


                    Name = user.Name,
                    Phone = user.Phone,
                    Email = user.Email,
                    ProfileImage = user.ProfileImage,



                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur GetProfile: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de la récupération du profil" });
            }
        }
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto model)
        {
            if (string.IsNullOrEmpty(model.Email))
                return BadRequest(new { message = "Email requis" });

            var user = (await userRepository.GetAll(x => x.Email == model.Email)).FirstOrDefault();

            if (user == null)
                return BadRequest(new { message = "Aucun utilisateur avec cet email" });

            string newPassword = PasswordHelper.GenerateRandomPassword();

            var helper = new PasswordHelper();
            user.Password = helper.HashPassword(newPassword);

            userRepository.Update(user);
            await userRepository.SaveChangesAsync();

            var emailService = new EmailService(configuration);

            await emailService.SendAsync(
                user.Email,
                "Réinitialisation de votre mot de passe",
                $"Bonjour,<br><br>Votre nouveau mot de passe est : <b>{newPassword}</b><br><br>Veuillez le changer après connexion."
            );

            return Ok(new { message = "Un nouveau mot de passe a été envoyé à votre adresse email." });
        }
    }
}

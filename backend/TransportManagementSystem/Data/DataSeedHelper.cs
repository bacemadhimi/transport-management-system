using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Service;

namespace TransportManagementSystem.Data
{
    public class DataSeedHelper
    {
        private readonly ApplicationDbContext dbContext;

        public DataSeedHelper(ApplicationDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public void InsertData()
        {
            try
            {
                // Appliquer les migrations
                dbContext.Database.Migrate();

                // 1️⃣ Seed UserGroups (anciens Roles)
                if (!dbContext.UserGroups.Any())
                {
                    dbContext.UserGroups.AddRange(
                        new UserGroup
                        {
                            Name = "SuperAdmin",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        },
                        new UserGroup
                        {
                            Name = "Admin",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        },
                        new UserGroup
                        {
                            Name = "Driver",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        }
                    );

                    dbContext.SaveChanges();
                    Console.WriteLine("UserGroups seedés avec succès !");
                }

                // Récupérer les IDs des UserGroups
                var superAdminGroup = dbContext.UserGroups.First(r => r.Name == "SuperAdmin");
                var adminGroup = dbContext.UserGroups.First(r => r.Name == "Admin");
                var driverGroup = dbContext.UserGroups.First(r => r.Name == "Driver");

                // 2️⃣ Seed Users
                if (!dbContext.Users.Any())
                {
                    var passwordHelper = new PasswordHelper();

                    var superAdminUser = new User
                    {
                        Email = "superAdmin@gmail.com",
                        Password = passwordHelper.HashPassword("12345")
                    };
                    var adminUser = new User
                    {
                        Email = "missionexcellence20@gmail.com",
                        Password = passwordHelper.HashPassword("12345")
                    };
                    var driverUser = new User
                    {
                        Email = "driver@test.com",
                        Password = passwordHelper.HashPassword("123456")
                    };

                    // 🔹 Ajouter les utilisateurs
                    dbContext.Users.AddRange(superAdminUser, adminUser, driverUser);
                    dbContext.SaveChanges();

                    // 🔹 Assigner les UserGroups via la table de liaison
                    dbContext.UserGroup2Users.AddRange(
                        new UserGroup2User
                        {
                            UserId = superAdminUser.Id,
                            UserGroupId = superAdminGroup.Id
                        },
                        new UserGroup2User
                        {
                            UserId = adminUser.Id,
                            UserGroupId = adminGroup.Id
                        },
                        new UserGroup2User
                        {
                            UserId = driverUser.Id,
                            UserGroupId = driverGroup.Id
                        }
                    );

                    dbContext.SaveChanges();
                    Console.WriteLine("Utilisateurs et groupes assignés avec succès !");
                }
                else
                {
                    Console.WriteLine("La table Users contient déjà des données, seed ignoré.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors du seeding : {ex.Message}");
                throw;
            }
        }
    }
}

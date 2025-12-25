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
                // Apply migrations
                dbContext.Database.Migrate();

                // 1️⃣ Seed Roles first
                if (!dbContext.Roles.Any())
                {
                    dbContext.Roles.AddRange(
                        new Role
                        {
                            Name = "SuperAdmin",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        },
                        new Role
                        {
                            Name = "Admin",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        },
                        new Role
                        {
                            Name = "Driver",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        }
                    );

                    dbContext.SaveChanges();
                    Console.WriteLine("Roles seedés avec succès !");
                }

                // Get role IDs
                var superAdminRoleId = dbContext.Roles.First(r => r.Name == "SuperAdmin").Id;
                var adminRoleId = dbContext.Roles.First(r => r.Name == "Admin").Id;
                var driverRoleId = dbContext.Roles.First(r => r.Name == "Driver").Id;

                // 2️⃣ Seed Users
                if (!dbContext.Users.Any())
                {
                    var passwordHelper = new PasswordHelper();

                    dbContext.Users.AddRange(
                         new User
                         {
                             Email = "superAdmin@gmail.com",
                             Password = passwordHelper.HashPassword("12345"),
                             RoleId = superAdminRoleId
                         },
                        new User
                        {
                            Email = "missionexcellence20@gmail.com",
                            Password = passwordHelper.HashPassword("12345"),
                            RoleId = adminRoleId
                        },
                        new User
                        {
                            Email = "driver@test.com",
                            Password = passwordHelper.HashPassword("123456"),
                            RoleId = driverRoleId
                        }
                    );

                    dbContext.SaveChanges();
                    Console.WriteLine("Utilisateurs seedés avec succès !");
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

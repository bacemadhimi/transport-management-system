using Microsoft.IdentityModel.Tokens;
using System;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Service;
using Microsoft.EntityFrameworkCore;

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
                
                dbContext.Database.Migrate(); 

               
                if (!dbContext.Users.Any())
                {
                    var passwordHelper = new PasswordHelper();

                    dbContext.Users.Add(new User()
                    {
                        Email = "admin@test.com",
                        Password = passwordHelper.HashPassword("12345"),
                        Role = "Admin"
                    });

                    dbContext.Users.Add(new User()
                    {
                        Email = "driver@test.com",
                        Password = passwordHelper.HashPassword("123456"),
                        Role = "Driver"
                    });

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

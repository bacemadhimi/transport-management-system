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

                // 1️⃣ Seed UserGroups (SuperAdmin, Admin, LEVEL1, LEVEL2, LEVEL3)
                if (!dbContext.UserGroups.Any())
                {
                    dbContext.UserGroups.AddRange(
                        new UserGroup { Name = "SuperAdmin", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow , IsSystemGroup=true},
                        new UserGroup { Name = "Admin", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                        new UserGroup { Name = "LEVEL1", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                        new UserGroup { Name = "LEVEL2", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                        new UserGroup { Name = "LEVEL3", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                    );
                    dbContext.SaveChanges();
                    Console.WriteLine("UserGroups seedés !");
                }

                var superAdminGroup = dbContext.UserGroups.First(r => r.Name == "SuperAdmin");
                var adminGroup = dbContext.UserGroups.First(r => r.Name == "Admin");

                // 2️⃣ Seed Users
                if (!dbContext.Users.Any())
                {
                    var passwordHelper = new PasswordHelper();

                    var superAdminUser = new User
                    {
                        Email = "superAdmin@gmail.com",
                        Password = passwordHelper.HashPassword("12345"),
                    };
                    var adminUser = new User
                    {
                        Email = "admin@gmail.com",
                        Password = passwordHelper.HashPassword("12345")
                    };

                    dbContext.Users.AddRange(superAdminUser, adminUser);
                    dbContext.SaveChanges();

                    dbContext.UserGroup2Users.AddRange(
                        new UserGroup2User { UserId = superAdminUser.Id, UserGroupId = superAdminGroup.Id },
                        new UserGroup2User { UserId = adminUser.Id, UserGroupId = adminGroup.Id }
                    );
                    dbContext.SaveChanges();
                    Console.WriteLine("Utilisateurs assignés à leurs groupes !");
                }

                // 3️⃣ Seed UserRights
                if (!dbContext.UserRights.Any())
                {
                    // Modules dans le même ordre que frontend
                    var modules = new[]
                    {
        "ACCUEIL",
        "CHAUFFEUR",
        "CONVOYEUR",
        "TRUCK",
        "ORDER",
        "TRAVEL",
        "USER",
        "USER_GROUP",
        "PERMISSION",
        "CUSTOMER",
        "FUEL_VENDOR",
        "FUEL",
        "LOCATION",
        "OVERTIME",
        "AVAILABILITY",
        "DAYOFF",
        "MECHANIC",
        "VENDOR",
        "TRUCK_MAINTENANCE"
    };

                    // Définition des actions par module
                    var moduleActions = new Dictionary<string, string[]>
    {
        { "ACCUEIL", new[] { "VIEW" } },
        { "CHAUFFEUR", new[] { "VIEW","ADD","EDIT","DELETE","PRINT" } },
        { "CONVOYEUR", new[] { "VIEW","ADD","EDIT","DELETE","PRINT" } },
        { "TRUCK", new[] { "VIEW","ADD","EDIT","DELETE","PRINT" } },
        { "ORDER", new[] { "VIEW","ADD","EDIT","DELETE","PRINT" } },
        { "TRAVEL", new[] { "VIEW","ADD","EDIT","DELETE","PRINT" } },
        { "USER", new[] { "VIEW","ADD","EDIT","DELETE","DISABLE" } },
        { "USER_GROUP", new[] { "VIEW","ADD","EDIT","DELETE","DISABLE" } },
        { "PERMISSION", new[] { "VIEW","EDIT" } },
        { "CUSTOMER", new[] { "VIEW","ADD","EDIT","DELETE","PRINT" } },
        { "FUEL_VENDOR", new[] { "VIEW","ADD","EDIT","DELETE","PRINT" } },
        { "FUEL", new[] { "VIEW","ADD","EDIT","DELETE" } },
        { "LOCATION", new[] { "VIEW","ADD","EDIT","DELETE" } },
        { "OVERTIME", new[] { "VIEW","ADD","EDIT","DELETE" } },
        { "AVAILABILITY", new[] { "VIEW","ADD","EDIT","DELETE" } },
        { "DAYOFF", new[] { "VIEW","ADD","EDIT","DELETE" } },
        { "MECHANIC", new[] { "VIEW","ADD","EDIT","DELETE" } },
        { "VENDOR", new[] { "VIEW","ADD","EDIT","DELETE" } },
        { "TRUCK_MAINTENANCE", new[] { "VIEW","ADD","EDIT","DELETE" } },
    };

                    var rights = modules
                        .SelectMany(module => moduleActions[module].Select(action => new UserRight
                        {
                            Code = $"{module}_{action}",
                            Description = $"{action} {module}"
                        }))
                        .ToList();

                    // Droit système global
                    rights.Add(new UserRight
                    {
                        Code = "SYSTEM_MANAGEMENT",
                        Description = "Gestion système globale"
                    });

                    dbContext.UserRights.AddRange(rights);
                    dbContext.SaveChanges();

                    Console.WriteLine("UserRights (modules + actions) seedés !");
                }


                var allRights = dbContext.UserRights.ToList();

                // 4️⃣ Assigner les droits par défaut
                void AssignRights(UserGroup group, Func<UserRight, bool> filter)
                {
                    var rightsToAssign = allRights.Where(filter).ToList();
                    foreach (var right in rightsToAssign)
                    {
                        if (!dbContext.UserGroup2Rights.Any(ugr =>
                            ugr.UserGroupId == group.Id && ugr.UserRightId == right.Id))
                        {
                            dbContext.UserGroup2Rights.Add(new UserGroup2Right
                            {
                                UserGroupId = group.Id,
                                UserRightId = right.Id
                            });
                        }
                    }
                }

                // SuperAdmin = tous les droits
                AssignRights(superAdminGroup, r => true);

                // Admin = tous sauf SYSTEM_MANAGEMENT
                AssignRights(adminGroup, r => r.Code != "SYSTEM_MANAGEMENT");

                // LEVEL1, LEVEL2, LEVEL3 = droits paramétrables dynamiquement
                var levelGroups = dbContext.UserGroups
                    .Where(g => g.Name.StartsWith("LEVEL"))
                    .ToList();

                foreach (var group in levelGroups)
                {
                    // Exemple : pour niv1, niv2, niv3, on peut filtrer selon les besoins
                    // Ici on donne tous les droits sauf SYSTEM_MANAGEMENT par défaut
                    AssignRights(group, r => r.Code != "SYSTEM_MANAGEMENT");
                }

                dbContext.SaveChanges();
                Console.WriteLine("Droits assignés aux groupes !");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors du seeding : {ex.Message}");
                throw;
            }
        }
    }
}

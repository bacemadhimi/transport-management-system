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

                // 1️⃣ Seed UserGroups (SuperAdmin, Admin)
                if (!dbContext.UserGroups.Any())
                {
                    dbContext.UserGroups.AddRange(
                        new UserGroup { Name = "SuperAdmin", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow , IsSystemGroup=true},
                        new UserGroup { Name = "Admin", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
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
        { "CHAUFFEUR", new[] { "VIEW","ADD","EDIT", "ENABLE","DISABLE", "PRINT" } },
        { "CONVOYEUR", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT" } },
        { "TRUCK", new[] { "VIEW","ADD","EDIT", "ENABLE","DISABLE", "PRINT" } },
        { "ORDER", new[] { "VIEW","ADD","EDIT", "ENABLE","DISABLE", "PRINT" } },
        { "TRAVEL", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT" } },
        { "USER", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT" } },
        { "USER_GROUP", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT" } },
        { "PERMISSION", new[] { "VIEW","EDIT" } },
        { "CUSTOMER", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE","PRINT" } },
        { "FUEL_VENDOR", new[] { "VIEW","ADD","EDIT", "ENABLE","DISABLE","PRINT" } },
        { "FUEL", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT" } },
        { "LOCATION", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT" } },
        { "OVERTIME", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT" } },
        { "AVAILABILITY", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT" } },
        { "DAYOFF", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT" } },
        { "MECHANIC", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT" } },
        { "VENDOR", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT" } },
        { "TRUCK_MAINTENANCE", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT" } },
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
                // 4️⃣ Assigner les droits par défaut selon le niveau
                void AssignRights(UserGroup group)
                {
                    Func<UserRight, bool> filter = r => false; // Par défaut aucun droit

                    if (group.Name == "SuperAdmin")
                    {
                        // Tous les droits
                        filter = r => true;
                    }
                    else if (group.Name == "Admin")
                    {
                        // Tous sauf modules exclus pour Admin
                        var excludedModules = new[] {
            "OVERTIME", "AVAILABILITY", "DAYOFF",
            "MECHANIC", "VENDOR", "TRUCK_MAINTENANCE",
            "CHAUFFEUR", "CONVOYEUR", "TRAVEL"
        };
                        filter = r => !excludedModules.Any(m => r.Code.StartsWith(m));
                        // Admin peut faire ENABLE et DISABLE
                    }
                    else if (group.Name == "LEVEL1")
                    {
                        // Comme Admin mais exclure les actions ENABLE et DISABLE
                        var excludedModules = new[] {
            "OVERTIME", "AVAILABILITY", "DAYOFF",
            "MECHANIC", "VENDOR", "TRUCK_MAINTENANCE",
            "CHAUFFEUR", "CONVOYEUR", "TRAVEL"
        };
                        filter = r => !excludedModules.Any(m => r.Code.StartsWith(m)) &&
                                      !r.Code.EndsWith("_DISABLE") &&
                                      !r.Code.EndsWith("_ENABLE");
                    }
                    else if (group.Name == "LEVEL2")
                    {
                        // Comme LEVEL1 mais exclure aussi PRINT
                        var excludedModules = new[] {
            "OVERTIME", "AVAILABILITY", "DAYOFF",
            "MECHANIC", "VENDOR", "TRUCK_MAINTENANCE",
            "CHAUFFEUR", "CONVOYEUR", "TRAVEL"
        };
                        filter = r => !excludedModules.Any(m => r.Code.StartsWith(m)) &&
                                      !r.Code.EndsWith("_DISABLE") &&
                                      !r.Code.EndsWith("_ENABLE") &&
                                      !r.Code.EndsWith("_PRINT");
                    }
                    else if (group.Name == "LEVEL3")
                    {
                        // Lecture seule mais pas ACCUEIL, CHAUFFEUR, CONVOYEUR
                        var excludedModules = new[] { "ACCUEIL", "CHAUFFEUR", "CONVOYEUR", "TRAVEL", "OVERTIME" , "AVAILABILITY", "DAYOFF", "MECHANIC", "VENDOR", "TRUCK_MAINTENANCE" };
                        filter = r => r.Code.EndsWith("_VIEW") &&
                                      !excludedModules.Any(m => r.Code.StartsWith(m));
                    }

                    var rightsToAssign = allRights.Where(filter).ToList();
                    foreach (var right in rightsToAssign)
                    {
                        if (!dbContext.UserGroup2Rights.Any(ugr => ugr.UserGroupId == group.Id && ugr.UserRightId == right.Id))
                        {
                            dbContext.UserGroup2Rights.Add(new UserGroup2Right
                            {
                                UserGroupId = group.Id,
                                UserRightId = right.Id
                            });
                        }
                    }
                }




                // Appliquer aux groupes
                AssignRights(superAdminGroup);
                AssignRights(adminGroup);

                var levelGroups = dbContext.UserGroups.Where(g => g.Name.StartsWith("LEVEL")).ToList();
                foreach (var group in levelGroups)
                {
                    AssignRights(group);
                }

                dbContext.SaveChanges();
                Console.WriteLine("Droits assignés aux groupes selon la règle métier !");

            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors du seeding : {ex.Message}");
                throw;
            }
        }
    }
}

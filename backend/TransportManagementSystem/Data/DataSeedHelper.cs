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
                        new UserGroup { Name = "Admin", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                        new UserGroup { Name = "Driver", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow } 
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
        "HISTORIQUE_TRAVEL",
        "LOCATION",
        "USER",
        "USER_GROUP",
        "PERMISSION",
        "CUSTOMER",
        "FUEL_VENDOR",
        "FUEL",
        "MECHANIC",
        "VENDOR",
        "TRUCK_MAINTENANCE",
        "OVERTIME",
        "DRIVER_AVAILABILITY",
        "TRUCK_AVAILABILITY",
        "DAYOFF"
    };

                    // Définition des actions par module
                    var moduleActions = new Dictionary<string, string[]>
    {
        { "ACCUEIL", new[] { "VIEW" } },
        { "CHAUFFEUR", new[] { "VIEW","ADD","EDIT", "ENABLE","DISABLE", "PRINT", "APPROVED" } },
        { "CONVOYEUR", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "TRUCK", new[] { "VIEW","ADD","EDIT", "ENABLE","DISABLE", "PRINT", "APPROVED" } },
        { "ORDER", new[] { "VIEW","ADD","EDIT", "ENABLE","DISABLE", "PRINT", "APPROVED" } },
        { "TRAVEL", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "HISTORIQUE_TRAVEL", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT" , "APPROVED" } },
        { "LOCATION", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "USER", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "USER_GROUP", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "PERMISSION", new[] { "VIEW","EDIT" } },
        { "CUSTOMER", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE","PRINT", "APPROVED" } },
        { "FUEL_VENDOR", new[] { "VIEW","ADD","EDIT", "ENABLE","DISABLE","PRINT", "APPROVED" } },
        { "FUEL", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "MECHANIC", new[] { "VIEW","ADD","EDIT", "ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "VENDOR", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "TRUCK_MAINTENANCE", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "OVERTIME", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "DRIVER_AVAILABILITY", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "TRUCK_AVAILABILITY", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT", "APPROVED" } },
        { "DAYOFF", new[] { "VIEW","ADD","EDIT","ENABLE", "DISABLE", "PRINT", "APPROVED" } },
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
                    Func<UserRight, bool> filter;

                    if (group.Name == "SuperAdmin")
                    {
                        filter = r => true; // Tous les droits
                    }
                    else if (group.Name == "Admin")
                    {
                        var excludedModules = new[]
                        {
            "CHAUFFEUR", "CONVOYEUR", "MECHANIC",
            "VENDOR", "VENDOR", "TRUCK_MAINTENANCE",
            "OVERTIME", "DRIVER_AVAILABILITY","TRUCK_AVAILABILITY","DAYOFF"
        };
                        filter = r => !excludedModules.Any(m => r.Code.StartsWith(m));
                    }
                    else if (group.Name == "Driver")
                    {
                        filter = r => false;
                    }
                    else
                    {
                        filter = r => false; // Aucun droit par défaut
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
            var tunisianZones = new List<string>
{"Tunis","Ariana","Ben Arous","Manouba","Bizerte","Nabeul","Zaghouan","Sousse","Monastir", "Mahdia", "Sfax", "Kairouan","Kasserine","Sidi Bouzid",
    "Gabès",
    "Médenine",
    "Tataouine",
    "Gafsa",
    "Tozeur",
    "Kébili",
    "Béja",
    "Jendouba",
    "Le Kef",
    "Siliana"
};

            // 5️⃣ Seed Zones (Tunisie)
            if (!dbContext.Zones.Any())
            {
                var now = DateTime.UtcNow;

                var zones = tunisianZones.Select(name => new Zone
                {
                    Name = name,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                }).ToList();

                dbContext.Zones.AddRange(zones);
                dbContext.SaveChanges();

                Console.WriteLine("Zones de Tunisie seedées avec succès !");
            }

        }


    }

}

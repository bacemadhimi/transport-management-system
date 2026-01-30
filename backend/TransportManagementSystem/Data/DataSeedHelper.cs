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

            if (!dbContext.Citys.Any())
            {
                var now = DateTime.UtcNow;

                var zoneCities = new Dictionary<string, List<string>>
    {
        { "Tunis", new List<string> { "Tunis", "Carthage", "La Marsa", "Le Bardo", "Sidi Bou Saïd", "El Menzah", "Bab Saadoun" } },
        { "Ariana", new List<string> { "Ariana Ville", "Raoued", "Kalaat el-Andalous", "La Soukra", "Mnihla", "Ettadhamen" } },
        { "Ben Arous", new List<string> { "Ben Arous", "Ezzahra", "Rades", "Mégrine", "Fouchana", "Hammam Chott", "Bou Mhel" } },
        { "Manouba", new List<string> { "Manouba", "Oued Ellil", "Douar Hicher", "Den Den", "Tebourba", "Mornaguia" } },
        { "Bizerte", new List<string> { "Bizerte", "Menzel Bourguiba", "Ras Jebel", "Ghar El Melh", "Mateur", "Sejnane" } },
        { "Nabeul", new List<string> { "Nabeul", "Hammamet", "Kelibia", "Korba", "Béni Khalled", "Takelsa", "El Haouaria" } },
        { "Zaghouan", new List<string> { "Zaghouan", "Bir Mcherga", "Nadhour", "El Fahs", "Zriba" } },
        { "Sousse", new List<string> { "Sousse", "Hergla", "Akouda", "Kondar", "Sousse Riadh", "Enfidha" } },
        { "Monastir", new List<string> { "Monastir", "Ksar Hellal", "Ouerdanine", "Bekalta", "Teboulba" } },
        { "Mahdia", new List<string> { "Mahdia", "Chorbane", "El Jem", "Ksour Essef", "Chebba" } },
        { "Sfax", new List<string> { "Sfax", "Sakiet Eddaier", "Agareb", "Thyna", "Kerkennah", "El Amra" } },
        { "Kairouan", new List<string> { "Kairouan", "Sbikha", "Chebika", "Oueslatia", "Haffouz" } },
        { "Kasserine", new List<string> { "Kasserine", "Foussana", "Thala", "Sbeitla", "Sbiba", "Majel Bel Abbès" } },
        { "Sidi Bouzid", new List<string> { "Sidi Bouzid", "Cebbala", "Meknassy", "Jilma", "Regueb" } },
        { "Gabès", new List<string> { "Gabès", "Ghannouch", "Mareth", "Matmata", "El Hamma" } },
        { "Médenine", new List<string> { "Médenine", "Beni Khedache", "Djerba", "Houmt Souk", "Ajim", "Midoun" } },
        { "Tataouine", new List<string> { "Tataouine", "Dhiba", "Bir Lahmar", "Ghomrassen", "Remada" } },
        { "Gafsa", new List<string> { "Gafsa", "El Ksar", "Redeyef", "Metlaoui", "Moularès" } },
        { "Tozeur", new List<string> { "Tozeur", "Degache", "Tamerza", "Nefta" } },
        { "Kébili", new List<string> { "Kébili", "Douz", "El Golaa", "Souk Lahad" } },
        { "Béja", new List<string> { "Béja", "Testour", "Nefza", "Goubellat" } },
        { "Jendouba", new List<string> { "Jendouba", "Fernana", "Aïn Draham", "Ghardimaou" } },
        { "Le Kef", new List<string> { "Le Kef", "El Ksour", "Nebeur", "Kalaat Khasba" } },
        { "Siliana", new List<string> { "Siliana", "Bargou", "Bou Arada", "Kesra" } },
    };

                var zones = dbContext.Zones.ToList();
                var cities = new List<City>();

                foreach (var kvp in zoneCities)
                {
                    var zoneName = kvp.Key;
                    var cityNames = kvp.Value;

                    var zone = zones.FirstOrDefault(z => z.Name == zoneName);
                    if (zone == null)
                    {
                        Console.WriteLine($"Zone {zoneName} non trouvée !");
                        continue;
                    }

                    cities.AddRange(cityNames.Select(cityName => new City
                    {
                        Name = cityName,
                        ZoneId = zone.Id,
                        IsActive = true,
                        CreatedAt = now,
                        UpdatedAt = now
                    }));
                }

                dbContext.Citys.AddRange(cities);
                dbContext.SaveChanges();

                Console.WriteLine("Toutes les villes de Tunisie seedées et associées à leurs zones !");
            }


        }


    }

}

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
                dbContext.Database.Migrate();

                #region UserGroups
                if (!dbContext.UserGroups.Any())
                {
                    dbContext.UserGroups.AddRange(
                        new UserGroup { Name = "SuperAdmin", IsSystemGroup = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                        new UserGroup { Name = "Admin", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                        new UserGroup { Name = "LEVEL1", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                        new UserGroup { Name = "LEVEL2", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                        new UserGroup { Name = "LEVEL3", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                    );
                    dbContext.SaveChanges();
                }
                #endregion

                var superAdmin = dbContext.UserGroups.First(g => g.Name == "SuperAdmin");
                var admin = dbContext.UserGroups.First(g => g.Name == "Admin");
                var level1 = dbContext.UserGroups.First(g => g.Name == "LEVEL1");
                var level2 = dbContext.UserGroups.First(g => g.Name == "LEVEL2");
                var level3 = dbContext.UserGroups.First(g => g.Name == "LEVEL3");

                #region UserRights
                if (!dbContext.UserRights.Any())
                {
                    var rights = new[]
                    {
                        "CHAUFFEUR_VIEW","CHAUFFEUR_ADD","CHAUFFEUR_EDIT","CHAUFFEUR_DELETE","CHAUFFEUR_PRINT",
                        "CONVOYER_VIEW","CONVOYER_ADD","CONVOYER_EDIT","CONVOYER_DELETE","CONVOYER_PRINT",
                        "TRIP_VIEW","TRIP_ADD","TRIP_EDIT","TRIP_DELETE","TRIP_PRINT",
                        "OVERTIME_VIEW","OVERTIME_ADD","OVERTIME_EDIT","OVERTIME_DELETE",
                        "AVAILABILITY_VIEW","AVAILABILITY_ADD","AVAILABILITY_EDIT","AVAILABILITY_DELETE",
                        "DAYOFF_VIEW","DAYOFF_ADD","DAYOFF_EDIT","DAYOFF_DELETE",
                        "MECHANIC_VIEW","MECHANIC_ADD","MECHANIC_EDIT","MECHANIC_DELETE",
                        "VENDOR_VIEW","VENDOR_ADD","VENDOR_EDIT","VENDOR_DELETE",
                        "TRUCK_MAINTENANCE_VIEW","TRUCK_MAINTENANCE_ADD","TRUCK_MAINTENANCE_EDIT","TRUCK_MAINTENANCE_DELETE"
                    };

                    dbContext.UserRights.AddRange(
                        rights.Select(r => new UserRight { Code = r, Description = r })
                    );
                    dbContext.SaveChanges();
                }
                #endregion

                var allRights = dbContext.UserRights.ToList();

                string[] forbiddenModulesForAdmin =
                {
                    "OVERTIME","AVAILABILITY","DAYOFF",
                    "MECHANIC","VENDOR","TRUCK_MAINTENANCE",
                    "CHAUFFEUR","CONVOYER","TRIP"
                };

                void AssignRights(UserGroup group, Func<UserRight, bool> predicate)
                {
                    foreach (var right in allRights.Where(predicate))
                    {
                        if (!dbContext.UserGroup2Rights.Any(x =>
                            x.UserGroupId == group.Id && x.UserRightId == right.Id))
                        {
                            dbContext.UserGroup2Rights.Add(new UserGroup2Right
                            {
                                UserGroupId = group.Id,
                                UserRightId = right.Id
                            });
                        }
                    }
                }

                #region Assignation des droits

                // 👑 SuperAdmin → TOUT
                AssignRights(superAdmin, r => true);

                // 🔵 Admin → tout sauf certains modules
                AssignRights(admin, r =>
                {
                    var module = r.Code.Split('_')[0];
                    return !forbiddenModulesForAdmin.Contains(module);
                });

                // 🟢 LEVEL1 → comme Admin sans DELETE
                AssignRights(level1, r =>
                {
                    var parts = r.Code.Split('_');
                    var module = parts[0];
                    var action = parts[^1];

                    if (forbiddenModulesForAdmin.Contains(module)) return false;
                    return action != "DELETE";
                });

                // 🟡 LEVEL2 → comme LEVEL1 sans PRINT
                AssignRights(level2, r =>
                {
                    var parts = r.Code.Split('_');
                    var module = parts[0];
                    var action = parts[^1];

                    if (forbiddenModulesForAdmin.Contains(module)) return false;
                    if (action == "DELETE" || action == "PRINT") return false;

                    return true;
                });

                // 🔵 LEVEL3 → VIEW uniquement
                AssignRights(level3, r => r.Code.EndsWith("_VIEW"));

                #endregion

                dbContext.SaveChanges();
                Console.WriteLine("✅ DataSeed des permissions terminé avec succès");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Erreur DataSeed : {ex.Message}");
                throw;
            }
        }
    }
}

using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Truck> Trucks { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Driver> Drivers { get; set; }

        public DbSet<Trip> Trips { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<FuelVendor> FuelVendors { get; set; }
        public DbSet<Fuel> Fuels { get; set; }
        public DbSet<Mechanic> Mechanics { get; set; }
        public DbSet<Vendor> Vendors { get; set; }
        public DbSet<Maintenance> Maintenances { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<UserRolePermission> UserRolePermissions { get; set; }
        public DbSet<Delivery> Deliveries { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<Traject> Trajects { get; set; }
        public DbSet<TrajectPoint> TrajectPoints { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Trip>()
                .Property(t => t.TripStatus)
                .HasConversion<string>();

            modelBuilder.Entity<Order>()
              .Property(t => t.Status)
              .HasConversion<string>();
            

            modelBuilder.Entity<Truck>()
                .Property(t => t.ImageBase64)
                .HasColumnType("nvarchar(max)");

            modelBuilder.Entity<Trip>()
               .Property(t => t.BookingId)
               .HasMaxLength(10)
               .IsRequired();

            modelBuilder.Entity<Fuel>()
              .Navigation(t => t.Truck)
              .AutoInclude();

            modelBuilder.Entity<Fuel>()
                .Navigation(t => t.Driver)
                .AutoInclude();

            modelBuilder.Entity<Fuel>()
               .Navigation(t => t.FuelVendor)
               .AutoInclude();


            modelBuilder.Entity<User>()
               .Navigation(u => u.Role)
               .AutoInclude();

            modelBuilder.Entity<Maintenance>()
                .Navigation(m => m.Trip)
                .AutoInclude();

            modelBuilder.Entity<Maintenance>()
                .Navigation(m => m.Vendor)
                .AutoInclude();

            modelBuilder.Entity<Maintenance>()
                .Navigation(m => m.Mechanic)
                .AutoInclude();
            modelBuilder.Entity<UserRolePermission>()
         .HasKey(ugp => new { ugp.RoleId, ugp.PermissionId });


        }
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.Entity is Role &&
                       (e.State == EntityState.Added || e.State == EntityState.Modified));

            foreach (var entry in entries)
            {
                var entity = (Role)entry.Entity;

                if (entry.State == EntityState.Added)
                    entity.CreatedAt = DateTime.UtcNow;

                entity.UpdatedAt = DateTime.UtcNow;
            }

            return await base.SaveChangesAsync(cancellationToken);
        }


    }

}

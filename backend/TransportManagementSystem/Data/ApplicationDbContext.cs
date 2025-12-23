using Microsoft.EntityFrameworkCore;
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
        public DbSet<UserGroup> UserGroups { get; set; }
        public DbSet<UserUserGroup> UserUserGroups { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Trip>()
                .Navigation(t => t.Truck)
                .AutoInclude();

            modelBuilder.Entity<Trip>()
                .Navigation(t => t.Driver)
                .AutoInclude();

            modelBuilder.Entity<Trip>()
               .Navigation(t => t.Customer)
               .AutoInclude();

            modelBuilder.Entity<Trip>()
                .Property(t => t.TripType)
                .HasConversion<string>();

            modelBuilder.Entity<Trip>()
                .Property(t => t.TripStatus)
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

            modelBuilder.Entity<UserUserGroup>()
                .HasKey(x => new { x.UserId, x.UserGroupId });

            modelBuilder.Entity<UserUserGroup>()
                .HasOne(x => x.User)
                .WithMany(u => u.UserUserGroups)
                .HasForeignKey(x => x.UserId);

            modelBuilder.Entity<UserUserGroup>()
                .HasOne(x => x.UserGroup)
                .WithMany(g => g.UserUserGroups)
                .HasForeignKey(x => x.UserGroupId);

            modelBuilder.Entity<User>()
               .Navigation(u => u.UserUserGroups)
               .AutoInclude();
        }
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.Entity is UserGroup &&
                       (e.State == EntityState.Added || e.State == EntityState.Modified));

            foreach (var entry in entries)
            {
                var entity = (UserGroup)entry.Entity;

                if (entry.State == EntityState.Added)
                    entity.CreatedAt = DateTime.UtcNow;

                entity.UpdatedAt = DateTime.UtcNow;
            }

            return await base.SaveChangesAsync(cancellationToken);
        }


    }

}

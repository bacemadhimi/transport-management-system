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
        public DbSet<Fuel_Vendor> Fuel_Vendors { get; set; }
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

        }

      
    }

}

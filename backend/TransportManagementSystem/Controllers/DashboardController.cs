using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly IRepository<User> userRepo;
        private readonly IRepository<Driver> driverRepo;
        private readonly IRepository<Truck> truckRepo;
        private readonly IRepository<Trip> tripRepo;
        private readonly IRepository<Customer> customerRepo;

        public DashboardController(
            IRepository<User> userRepo,
            IRepository<Driver> driverRepo,
            IRepository<Truck> truckRepo,
            IRepository<Trip> tripRepo,
            IRepository<Customer> customerRepo)
        {
            this.userRepo = userRepo;
            this.driverRepo = driverRepo;
            this.truckRepo = truckRepo;
            this.tripRepo = tripRepo;
            this.customerRepo = customerRepo;
        }

        // Total des utilisateurs, chauffeurs et camions
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> TotalData()
        {
            var userList = await userRepo.GetAll();
            var driverList = await driverRepo.GetAll();
            var truckList = await truckRepo.GetAll();

            return Ok(new
            {
                userCount = userList.Count,
                driverCount = driverList.Count,
                truckCount = truckList.Count
            });
        }

        // Nombre de trajets par camion
        [HttpGet("trips-by-truck")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTripsByTruck()
        
        {
            var trips = await tripRepo.GetAll();
            var trucks = await truckRepo.GetAll();

            var result = trips
                .GroupBy(t => t.TruckId)
                .Select(g => new
                {
                    TruckImmatriculation = trucks.FirstOrDefault(t => t.Id == g.Key)?.Immatriculation ?? "Inconnu",
                    TripCount = g.Count()
                })
                .OrderByDescending(x => x.TripCount);
            return Ok(result);
        }

        // Trajets du jour
        [HttpGet("today-trips")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTodayTrips()
        {
            return Ok(null);
        }
    }
}


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

            public DashboardController(IRepository<User> userRepo, IRepository<Driver> driverRepo, IRepository<Truck> truckRepo)
            {
                this.userRepo = userRepo;
                this.driverRepo = driverRepo;
                this.truckRepo = truckRepo;
            }

            [HttpGet]
            [Authorize(Roles = "Admin")]
            public async Task<IActionResult> TotalData()
            {
             var userList = await userRepo.GetAll();
             var driverList = await driverRepo.GetAll();
             var truckList = await truckRepo.GetAll();
            var userCount = userList.Count;
            var driverCount = driverList.Count;
            var truckCount = truckList.Count;
            return Ok(new
                {
                userCount,
                driverCount,
                truckCount
            });


            }
            
        }
    }




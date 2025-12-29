using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerController : ControllerBase
    {
        private readonly IRepository<Customer> customerRepository;
        private readonly ApplicationDbContext dbContext;
        public CustomerController(ApplicationDbContext context)
        {
            dbContext = context;
        }

        [HttpGet("PaginationAndSearch")]
        public async Task<IActionResult> GetCustomerList([FromQuery] SearchOptions searchOption)
        {
            var pagedData = new PagedData<Customer>();

            // Fetch data from DbContext or repository
            if (string.IsNullOrEmpty(searchOption.Search))
            {
                pagedData.Data = await dbContext.Customers.ToListAsync();
            }
            else
            {
                pagedData.Data = await dbContext.Customers
                    .Where(x =>
                        (x.Name != null && x.Name.Contains(searchOption.Search)) ||
                        (x.Phone != null && x.Phone.Contains(searchOption.Search)) ||
                        (x.Email != null && x.Email.Contains(searchOption.Search)) ||
                        (x.Adress != null && x.Adress.Contains(searchOption.Search))
                    )
                    .ToListAsync();
            }

            pagedData.TotalData = pagedData.Data.Count;

            // Apply pagination if PageIndex and PageSize are provided
            if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
            {
                pagedData.Data = pagedData.Data
                    .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                    .Take(searchOption.PageSize.Value)
                    .ToList();
            }


            return Ok(pagedData);
        }

        //Get
        [HttpGet("Customer")]
        public async Task<ActionResult<IEnumerable<Customer>>> GetDriver()
        {
            return await dbContext.Customers.ToListAsync();
        }

        //Get By Id
        [HttpGet("{id}")]
        public async Task<ActionResult<Customer>> GetCustomerById(int id)
        {
            var customer = await dbContext.Customers.FindAsync(id);

            if (customer == null)
                return NotFound(new
                {
                    message = $"Customer with ID {id} was not found in the database.",
                    Status = 404

                });
            return customer;
        }

        //Create
        [HttpPost]
        public async Task<ActionResult<CustomerDto>> CreateCustomer([FromBody] CustomerDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var existingCustomer = await dbContext.Customers
                .FirstOrDefaultAsync(c => c.Name == model.Name);

            if (existingCustomer != null)
                return BadRequest($"A customer with the name '{model.Name}' already exists.");

            var customer = new Customer
            {
                Name = model.Name,
                Phone = model.Phone,
                Email = model.Email,
                Adress = model.Adress,
                phoneCountry =model.phoneCountry,
                Matricule = model.Matricule
            };

            dbContext.Customers.Add(customer);
            await dbContext.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCustomerById), new { id = customer.Id }, model);
        }

        //Update
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCustomer(int id, [FromBody] CustomerDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var existingCustomer = await dbContext.Customers.FindAsync(id);

            if (existingCustomer == null)
                return NotFound($"Customer with Id {id} does not exist.");

            existingCustomer.Name = model.Name;
            existingCustomer.Phone = model.Phone;
            existingCustomer.Email = model.Email;
            existingCustomer.Adress = model.Adress;
            existingCustomer.phoneCountry = model.phoneCountry;
            existingCustomer.Matricule = model.Matricule;

            dbContext.Customers.Update(existingCustomer);
            await dbContext.SaveChangesAsync();

            return Ok(new { Message = $"Customer with Id {id} updated successfully." });

        }

        // //Delete
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            var existingCustomer = await dbContext.Customers.FindAsync(id);

            if (existingCustomer == null)
                return NotFound($"Customer with Id {id} does not exist.");

            dbContext.Customers.Remove(existingCustomer);
            await dbContext.SaveChangesAsync();

            return Ok(new { Message = $"Customer with Id {id} deleted successfully." });
        }

    }
}


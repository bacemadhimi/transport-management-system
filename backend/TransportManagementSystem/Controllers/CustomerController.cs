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
        private readonly ApplicationDbContext dbContext;

        public CustomerController(ApplicationDbContext context)
        {
            dbContext = context;
        }


        [HttpGet("PaginationAndSearch")]
        public async Task<IActionResult> GetCustomerList([FromQuery] SearchOptions searchOption)
        {
            var query = dbContext.Customers.AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchOption.Search))
            {
                var search = searchOption.Search.ToLower();

                query = query.Where(c =>
                    c.Name.ToLower().Contains(search) ||
                    c.Phone.ToLower().Contains(search) ||
                    c.Email.ToLower().Contains(search) ||
                    c.Adress.ToLower().Contains(search)
                );
            }
            if (!string.IsNullOrWhiteSpace(searchOption.SourceSystem))
            {
                if (Enum.TryParse<DataSource>(
                    searchOption.SourceSystem, true, out var source))
                {
                    query = query.Where(c => c.SourceSystem == source);
                }
            }

            var totalData = await query.CountAsync();

            if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
            {
                query = query
                    .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                    .Take(searchOption.PageSize.Value);
            }

            var customers = await query.ToListAsync();

            var customerDtos = customers.Select(c => new CustomerDto
            {
                Id = c.Id, 
                Name = c.Name,
                Phone = c.Phone,
                PhoneCountry = c.phoneCountry,
                Email = c.Email,
                Adress = c.Adress,
                Matricule = c.Matricule,
                Gouvernorat = c.Gouvernorat,
                Contact = c.Contact,
                Zone = c.Zone,
                SourceSystem = c.SourceSystem.ToString()
            }).ToList();

            return Ok(new PagedData<CustomerDto>
            {
                TotalData = totalData,
                Data = customerDtos
            });
        }


        [HttpGet]
        public async Task<ActionResult<IEnumerable<Customer>>> GetCustomers()
        {
            return await dbContext.Customers.ToListAsync();
        }


        [HttpGet("{id}")]
        public async Task<ActionResult<Customer>> GetCustomerById(int id)
        {
            var customer = await dbContext.Customers.FindAsync(id);

            if (customer == null)
                return NotFound(new { message = $"Customer with ID {id} not found" });

            return customer;
        }


        [HttpPost]
        public async Task<ActionResult> CreateCustomer([FromBody] CustomerDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var exists = await dbContext.Customers.AnyAsync(c => c.Name == model.Name);
            if (exists)
                return BadRequest($"Customer '{model.Name}' already exists.");

            var customer = new Customer
            {
                SourceSystem = DataSource.TMS,
                ExternalId = null,

                Name = model.Name,
                Phone = model.Phone,
                phoneCountry = model.PhoneCountry,
                Email = model.Email,
                Adress = model.Adress,
                Matricule = model.Matricule,
                Gouvernorat=model.Gouvernorat,
                Contact = model.Contact,
                Zone = model.Zone
            };

            dbContext.Customers.Add(customer);
            await dbContext.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCustomerById), new { id = customer.Id }, model);
        }

  
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCustomer(int id, [FromBody] CustomerDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var customer = await dbContext.Customers.FindAsync(id);
            if (customer == null)
                return NotFound($"Customer with Id {id} does not exist.");
            customer.Name = model.Name;
            customer.Phone = model.Phone;
            customer.phoneCountry = model.PhoneCountry;
            customer.Email = model.Email;
            customer.Adress = model.Adress;
            customer.Matricule = model.Matricule;
            customer.Gouvernorat = model.Gouvernorat;
            customer.Contact = model.Contact;
            customer.Zone = model.Zone;

            await dbContext.SaveChangesAsync();
            return Ok(new { Message = $"Customer with Id {id} updated successfully." });

        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            var customer = await dbContext.Customers.FindAsync(id);
            if (customer == null)
                return NotFound();

            dbContext.Customers.Remove(customer);
            await dbContext.SaveChangesAsync();

            return Ok(new { Message = "Customer deleted successfully" });
        }
    }
}

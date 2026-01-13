using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IRepository<Order> _orderRepository;
    private readonly ApplicationDbContext _context;

    public OrdersController(
        IRepository<Order> orderRepository,
        ApplicationDbContext context)
    {
        _orderRepository = orderRepository;
        _context = context;
    }

    //GET
    [HttpGet("PaginationAndSearch")]
    public async Task<IActionResult> GetOrders([FromQuery] SearchOptions searchOptions)
    {
        var query = _orderRepository.Query()
            .Include(o => o.Customer)
            .AsQueryable();
  
        if (!string.IsNullOrWhiteSpace(searchOptions.Search))
        {
            var search = searchOptions.Search.ToLower();
            query = query.Where(o =>
                o.Reference.ToLower().Contains(search) ||
                (o.Type != null && o.Type.ToLower().Contains(search)) ||
                o.Status.ToString().ToLower().Contains(search) ||
                (o.Customer != null &&
                    (
                        (o.Customer.Name != null && o.Customer.Name.ToLower().Contains(search)) ||
                        (o.Customer.Matricule != null && o.Customer.Matricule.ToLower().Contains(search))
                    )
                )
            );
        }
        var totalCount = await query.CountAsync();    
        if (searchOptions.PageIndex.HasValue && searchOptions.PageSize.HasValue)
        {
            query = query
                .OrderByDescending(o => o.CreatedDate)
                .Skip(searchOptions.PageIndex.Value * searchOptions.PageSize.Value)
                .Take(searchOptions.PageSize.Value);
        }
        var orders = await query.ToListAsync();
        var orderDtos = orders.Select(o => new OrderDto
        {
            Id = o.Id,
            CustomerId = o.CustomerId,
            CustomerName = o.Customer?.Name,
            CustomerMatricule = o.Customer?.Matricule,
            Reference = o.Reference,
            Type = o.Type,
            Weight = o.Weight,
            Status = o.Status,
            CreatedDate = o.CreatedDate,
            SourceSystem = o.SourceSystem.ToString()
        }).ToList();
        var result = new PagedData<OrderDto>
        {
            TotalData = totalCount,
            Data = orderDtos
        };

        return Ok(new ApiResponse(true, "Commandes récupérées avec succès", result));
    }
   
    //GET
    [HttpGet]
    public async Task<IActionResult> GetOrders()
    {
        var orders = await _orderRepository.Query()
            .Include(o => o.Customer)
            .OrderByDescending(o => o.CreatedDate)
            .ToListAsync();

        var orderDtos = orders.Select(o => new OrderDto
        {
            Id = o.Id,
            CustomerId = o.CustomerId,
            CustomerName = o.Customer?.Name,
            CustomerMatricule = o.Customer?.Matricule,
            Reference = o.Reference,
            Type = o.Type,
            Weight = o.Weight,
            Status = o.Status,
            CreatedDate = o.CreatedDate
        }).ToList();

        return Ok(new ApiResponse(true, "Commandes récupérées avec succès", orderDtos));
    }

    
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingOrders()
    {
        var orders = await _orderRepository.Query()
            .Include(o => o.Customer)
            .Where(o => o.Status == OrderStatus.Pending && !o.Deliveries.Any())
            .OrderByDescending(o => o.Priority)
            .ThenBy(o => o.CreatedDate)
            .ToListAsync();

        var orderDtos = orders.Select(o => new OrderDto
        {
            Id = o.Id,
            CustomerId = o.CustomerId,
            CustomerName = o.Customer?.Name,
            CustomerMatricule = o.Customer?.Matricule,
            Reference = o.Reference,
            Type = o.Type,
            Weight = o.Weight,
            Status = o.Status,
            CreatedDate = o.CreatedDate,
            DeliveryAddress = o.DeliveryAddress,
            Notes = o.Notes,
            Priority = o.Priority,
            HasDelivery = false
        }).ToList();

        return Ok(new ApiResponse(true, "Commandes en attente récupérées", orderDtos));
    }

   
    [HttpGet("customer/{customerId}")]
    public async Task<IActionResult> GetOrdersByCustomerId(int customerId)
    {
        var orders = await _orderRepository.Query()
            .Where(o => o.CustomerId == customerId && o.Status == OrderStatus.Pending)
            .OrderByDescending(o => o.CreatedDate)
            .ToListAsync();

        var orderDtos = orders.Select(o => new OrderDto
        {
            Id = o.Id,
            CustomerId = o.CustomerId,
            Reference = o.Reference,
            Type = o.Type,
            Weight = o.Weight,
            Status = o.Status,
            CreatedDate = o.CreatedDate,
            DeliveryAddress = o.DeliveryAddress
        }).ToList();

        return Ok(new ApiResponse(true, "Commandes du client récupérées", orderDtos));
    }

  
    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrderById(int id)
    {
        var order = await _orderRepository.Query()
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new ApiResponse(false, $"Commande {id} non trouvée"));
        var orderDetails = new OrderDetailsDto
        {
            Id = order.Id,
            CustomerId = order.CustomerId,
            CustomerName = order.Customer?.Name,
            CustomerMatricule = order.Customer?.Matricule,
            Reference = order.Reference,
            Type = order.Type,
            Weight = order.Weight,
            Status = order.Status,
            CreatedDate = order.CreatedDate,
            DeliveryAddress = order.DeliveryAddress,
            Notes = order.Notes,
            Priority = order.Priority
        };

        return Ok(new ApiResponse(true, "Commande récupérée avec succès", orderDetails));
    }

  
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        
        string reference = model.Reference;
        if (string.IsNullOrWhiteSpace(reference))
        {
            var lastOrder = await _orderRepository.Query()
                .OrderByDescending(o => o.Id)
                .FirstOrDefaultAsync();

            int nextNumber = 1;
            if (lastOrder != null && lastOrder.Reference.StartsWith("ORD"))
            {
                if (int.TryParse(lastOrder.Reference[3..], out var lastNumber))
                    nextNumber = lastNumber + 1;
            }

            reference = $"ORD{nextNumber:D6}";
        }

        var order = new Order
        {
            SourceSystem = DataSource.TMS,   
            ExternalId = null,

            CustomerId = model.CustomerId,
            Reference = reference,
            Type = model.Type,
            Weight = model.Weight,
            Status = OrderStatus.Pending,
            CreatedDate = DateTime.UtcNow,
            DeliveryAddress = model.DeliveryAddress,
            Notes = model.Notes,
            Priority = model.Priority
        };

        await _orderRepository.AddAsync(order);
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Commande créée avec succès", new { Id = order.Id }));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateOrder(int id, [FromBody] UpdateOrderDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var order = await _context.Orders.FindAsync(id);
        if (order == null)
            return NotFound(new ApiResponse(false, $"Commande {id} non trouvée"));

        try
        {
           
            order.CustomerId = model.CustomerId;

          
            if (!string.IsNullOrWhiteSpace(model.Reference) && model.Reference != order.Reference)
            {
                order.Reference = model.Reference;
            }

            order.Type = model.Type;
            order.Weight = model.Weight;
            order.Status = model.Status;
            order.DeliveryAddress = model.DeliveryAddress;
            order.Notes = model.Notes;
            order.Priority = model.Priority;
            order.UpdatedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse(true, "Commande mise à jour avec succès", new { Id = order.Id }));
        }
        catch (Exception ex)
        {
           
            return StatusCode(500, new ApiResponse(false, "Erreur lors de la mise à jour", ex.Message));
        }
    }
}

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
            CreatedDate = o.CreatedDate
        }).ToList();

        var result = new PagedData<OrderDto>
        {
            TotalData = totalCount,
            Data = orderDtos
        };

        return Ok(new ApiResponse(true, "Commandes récupérées avec succès", result));
    }
   
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

    // GET: api/orders/pending - Get pending orders for trip planning
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

    // GET: api/orders/customer/{customerId} - Get orders by customer (for trip form dropdown)
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

    // GET: api/orders/{id} - Get single order by ID
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

    // POST: api/orders - Create new order
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        // Generate reference if not provided
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
}

// DTO Classes (minimal versions)
public class OrderDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerMatricule { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string? Type { get; set; }
    public decimal Weight { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
    public int Priority { get; set; }
    public bool HasDelivery { get; set; }
}

public class OrderDetailsDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerMatricule { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string? Type { get; set; }
    public decimal Weight { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
    public int Priority { get; set; }
}

public class CreateOrderDto
{
    public int CustomerId { get; set; }
    public string? Reference { get; set; }
    public string? Type { get; set; }
    public decimal Weight { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
    public int Priority { get; set; } = 5;
}
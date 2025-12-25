using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class RolesController : ControllerBase
{
    private readonly IRepository<Role> roleRepository;

    public RolesController(IRepository<Role> roleRepository)
    {
        this.roleRepository = roleRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoles([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<Role>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await roleRepository.GetAll();
        }
        else
        {
            pagedData.Data = await roleRepository.GetAll(x =>
                x.Name.Contains(searchOption.Search));
        }

        pagedData.TotalData = pagedData.Data.Count;

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            pagedData.Data = pagedData.Data
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value)
                .ToList();
        }

        return Ok(pagedData);
    }

    [HttpGet("All")]
    public async Task<IActionResult> GetAll()
    {
        var roles = await roleRepository.GetAll();
        return Ok(roles);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var role = await roleRepository.FindByIdAsync(id);
        if (role == null)
            return NotFound();

        return Ok(role);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Role model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        await roleRepository.AddAsync(model);
        await roleRepository.SaveChangesAsync();

        return Ok(model);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Role model)
    {
        var role = await roleRepository.FindByIdAsync(id);
        if (role == null)
            return NotFound();

        role.Name = model.Name;

        roleRepository.Update(role);
        await roleRepository.SaveChangesAsync();

        return Ok(role);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await roleRepository.DeleteAsync(id);
        await roleRepository.SaveChangesAsync();

        return Ok();
    }
}

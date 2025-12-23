using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class UserGroupsController : ControllerBase
{
    private readonly IRepository<UserGroup> groupRepository;

    public UserGroupsController(IRepository<UserGroup> groupRepository)
    {
        this.groupRepository = groupRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetUserGroups([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<UserGroup>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await groupRepository.GetAll();
        }
        else
        {
            pagedData.Data = await groupRepository.GetAll(x =>
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
        var groups = await groupRepository.GetAll();
        return Ok(groups);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var group = await groupRepository.FindByIdAsync(id);
        if (group == null)
            return NotFound();

        return Ok(group);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UserGroup model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        await groupRepository.AddAsync(model);
        await groupRepository.SaveChangesAsync();

        return Ok(model);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UserGroup model)
    {
        var group = await groupRepository.FindByIdAsync(id);
        if (group == null)
            return NotFound();

        group.Name = model.Name;

        groupRepository.Update(group);
        await groupRepository.SaveChangesAsync();

        return Ok(group);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await groupRepository.DeleteAsync(id);
        await groupRepository.SaveChangesAsync();

        return Ok();
    }
}

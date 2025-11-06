using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Dtos;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Services;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CamionsController : ControllerBase
{
    private readonly ICamionService _service;

    public CamionsController(ICamionService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Camion>>> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Camion>> Get(int id)
    {
        var camion = await _service.GetByIdAsync(id);
        if (camion == null) return NotFound();
        return Ok(camion);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CamionDto dto)
    {
        var camion = new Camion
        {
            Name = dto.Name
   
        };

        await _service.AddAsync(camion);

        return CreatedAtAction(nameof(Get), new { id = camion.Id }, camion);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, [FromBody] CamionDto dto)
    {
        var existingCamion = await _service.GetByIdAsync(id);
        if (existingCamion == null) return NotFound();

        existingCamion.Name = dto.Name;

        await _service.UpdateAsync(existingCamion);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}

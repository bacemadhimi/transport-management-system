
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models
{
    public class SearchOptions
    {
        public string? Search { get; set; }
        public int? PageIndex { get; set; }
        public int? PageSize { get; set; } = 10;
        public int? EmployeId { get; set; }
        public string? SourceSystem { get; set; }
    }
    public class PagedData<T>
    {
        public int TotalData { get; set; }
        public List<T> Data { get; set; } = new List<T>();
    }

}

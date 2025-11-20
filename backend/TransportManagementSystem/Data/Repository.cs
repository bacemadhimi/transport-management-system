using Microsoft.EntityFrameworkCore;
using System;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace TransportManagementSystem.Data
{
    public class Repository<T> : IRepository<T> where T : class
    {
        private readonly ApplicationDbContext dbContext;
        protected readonly DbSet<T> dbSet;
        public Repository(ApplicationDbContext dbContext)
        {
            dbSet = dbContext.Set<T>();
            this.dbContext = dbContext;

        }


        public async Task AddAsync(T entity)
        {
            await dbSet.AddAsync(entity);
        }

        public async Task DeleteAsync(int id)
        {
            var entity = await FindByIdAsync(id);
            dbSet.Remove(entity);
        }

        public async Task<T> FindByIdAsync(int id)
        {
            var entity = await dbSet.FindAsync(id);
            return entity;
        }

        public async Task<List<T>> GetAll()
        {
            var list = await dbSet.ToListAsync();
            return list;
        }

        public async Task<List<T>> GetAll(Expression<Func<T, bool>> filter)
        {
            var compiledFilter = filter.Compile();
            var allData = await dbSet.ToListAsync();
            return allData.Where(compiledFilter).ToList();
        }

        public async Task<int> SaveChangesAsync()
        {
            return await dbContext.SaveChangesAsync();
        }

        public void Update(T entity)
        {

            dbSet.Update(entity);
        }
    }
}

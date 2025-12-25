namespace TransportManagementSystem.Entity
{
    public class UserGroupPermission
    {
        public int UserGroupId { get; set; }
        public UserGroup UserGroup { get; set; }

        public int PermissionId { get; set; }
        public Permission Permission { get; set; }
    }

}

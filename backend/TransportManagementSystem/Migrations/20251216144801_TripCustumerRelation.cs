using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TransportManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class TripCustumerRelation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomerName",
                table: "Trips");

            migrationBuilder.AddColumn<int>(
                name: "CustomerId",
                table: "Trips",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Trips_CustomerId",
                table: "Trips",
                column: "CustomerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Trips_Customers_CustomerId",
                table: "Trips",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Trips_Customers_CustomerId",
                table: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_Trips_CustomerId",
                table: "Trips");

            migrationBuilder.DropColumn(
                name: "CustomerId",
                table: "Trips");

            migrationBuilder.AddColumn<string>(
                name: "CustomerName",
                table: "Trips",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}

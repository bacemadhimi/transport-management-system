using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TransportManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTrackTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_camion",
                table: "camion");

            migrationBuilder.DropIndex(
                name: "IX_camion_Name",
                table: "camion");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "camion");

            migrationBuilder.RenameTable(
                name: "camion",
                newName: "track");

            migrationBuilder.AddColumn<string>(
                name: "Brand",
                table: "track",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Capacity",
                table: "track",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Immatriculation",
                table: "track",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "track",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "TechnicalVisitDate",
                table: "track",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddPrimaryKey(
                name: "PK_track",
                table: "track",
                column: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_track",
                table: "track");

            migrationBuilder.DropColumn(
                name: "Brand",
                table: "track");

            migrationBuilder.DropColumn(
                name: "Capacity",
                table: "track");

            migrationBuilder.DropColumn(
                name: "Immatriculation",
                table: "track");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "track");

            migrationBuilder.DropColumn(
                name: "TechnicalVisitDate",
                table: "track");

            migrationBuilder.RenameTable(
                name: "track",
                newName: "camion");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "camion",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_camion",
                table: "camion",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_camion_Name",
                table: "camion",
                column: "Name",
                unique: true);
        }
    }
}

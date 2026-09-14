using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppBase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class LocationPointsOfInterest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "ArAnchorId",
                table: "location_details",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "NfcTagId",
                table: "location_details",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "TourStopId",
                table: "location_details",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_location_details_ArAnchorId",
                table: "location_details",
                column: "ArAnchorId");

            migrationBuilder.CreateIndex(
                name: "IX_location_details_NfcTagId",
                table: "location_details",
                column: "NfcTagId");

            migrationBuilder.CreateIndex(
                name: "IX_location_details_TourStopId",
                table: "location_details",
                column: "TourStopId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_location_details_ArAnchorId",
                table: "location_details");

            migrationBuilder.DropIndex(
                name: "IX_location_details_NfcTagId",
                table: "location_details");

            migrationBuilder.DropIndex(
                name: "IX_location_details_TourStopId",
                table: "location_details");

            migrationBuilder.DropColumn(
                name: "ArAnchorId",
                table: "location_details");

            migrationBuilder.DropColumn(
                name: "NfcTagId",
                table: "location_details");

            migrationBuilder.DropColumn(
                name: "TourStopId",
                table: "location_details");
        }
    }
}

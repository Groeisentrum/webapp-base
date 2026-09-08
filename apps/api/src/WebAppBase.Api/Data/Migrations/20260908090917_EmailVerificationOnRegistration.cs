using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppBase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class EmailVerificationOnRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "EmailVerifiedAt",
                table: "consent_records",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OtpPendingId",
                table: "consent_records",
                type: "varchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_consent_records_OtpPendingId",
                table: "consent_records",
                column: "OtpPendingId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_consent_records_OtpPendingId",
                table: "consent_records");

            migrationBuilder.DropColumn(
                name: "EmailVerifiedAt",
                table: "consent_records");

            migrationBuilder.DropColumn(
                name: "OtpPendingId",
                table: "consent_records");
        }
    }
}

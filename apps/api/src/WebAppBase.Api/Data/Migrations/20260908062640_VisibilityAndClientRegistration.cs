using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace WebAppBase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class VisibilityAndClientRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PrivacyPolicyVersion",
                table: "tenant_settings",
                type: "varchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "SelfRegistrationEnabled",
                table: "tenant_settings",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TermsVersion",
                table: "tenant_settings",
                type: "varchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Visibility",
                table: "menu_items",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "VisibleToRoles",
                table: "menu_items",
                type: "json",
                nullable: false);

            migrationBuilder.AddColumn<int>(
                name: "Visibility",
                table: "content_items",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "VisibleToRoles",
                table: "content_items",
                type: "json",
                nullable: false);

            migrationBuilder.AddColumn<int>(
                name: "Visibility",
                table: "categories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "VisibleToRoles",
                table: "categories",
                type: "json",
                nullable: false);

            migrationBuilder.CreateTable(
                name: "consent_records",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    SkaaphondUserId = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true),
                    Email = table.Column<string>(type: "varchar(320)", maxLength: 320, nullable: false),
                    UserName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false),
                    PrivacyPolicyVersion = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    TermsVersion = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    ConsentedAt = table.Column<DateTimeOffset>(type: "datetime", nullable: false),
                    IpAddress = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true),
                    UserAgent = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true),
                    WithdrawnAt = table.Column<DateTimeOffset>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_consent_records", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_consent_records_ConsentedAt",
                table: "consent_records",
                column: "ConsentedAt");

            migrationBuilder.CreateIndex(
                name: "IX_consent_records_Email",
                table: "consent_records",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_consent_records_SkaaphondUserId",
                table: "consent_records",
                column: "SkaaphondUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "consent_records");

            migrationBuilder.DropColumn(
                name: "PrivacyPolicyVersion",
                table: "tenant_settings");

            migrationBuilder.DropColumn(
                name: "SelfRegistrationEnabled",
                table: "tenant_settings");

            migrationBuilder.DropColumn(
                name: "TermsVersion",
                table: "tenant_settings");

            migrationBuilder.DropColumn(
                name: "Visibility",
                table: "menu_items");

            migrationBuilder.DropColumn(
                name: "VisibleToRoles",
                table: "menu_items");

            migrationBuilder.DropColumn(
                name: "Visibility",
                table: "content_items");

            migrationBuilder.DropColumn(
                name: "VisibleToRoles",
                table: "content_items");

            migrationBuilder.DropColumn(
                name: "Visibility",
                table: "categories");

            migrationBuilder.DropColumn(
                name: "VisibleToRoles",
                table: "categories");
        }
    }
}

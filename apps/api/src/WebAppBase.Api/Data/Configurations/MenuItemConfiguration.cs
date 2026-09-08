using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Data.Configurations;

internal sealed class MenuItemConfiguration : IEntityTypeConfiguration<MenuItem>
{
    private const int LabelMaxLength = 200;
    private const int SlugMaxLength = 200;
    private const int UrlMaxLength = 2048;

    public void Configure(EntityTypeBuilder<MenuItem> builder)
    {
        builder.ToTable("menu_items");

        builder.HasKey(menuItem => menuItem.Id);

        builder.Property(menuItem => menuItem.Label)
            .IsRequired()
            .HasMaxLength(LabelMaxLength);

        builder.Property(menuItem => menuItem.StaticPageSlug).HasMaxLength(SlugMaxLength);
        builder.Property(menuItem => menuItem.ExternalUrl).HasMaxLength(UrlMaxLength);

        builder.Property(menuItem => menuItem.MenuType).HasConversion<int>();
        builder.Property(menuItem => menuItem.LinkType).HasConversion<int>();

        builder.Property(menuItem => menuItem.Visibility).HasConversion<int>();
        builder.Property(menuItem => menuItem.VisibleToRoles)
            .HasConversion(JsonColumn.StringListConverter(), JsonColumn.StringListComparer())
            .HasColumnType("json")
            .IsRequired();

        builder.HasOne(menuItem => menuItem.Category)
            .WithMany()
            .HasForeignKey(menuItem => menuItem.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(menuItem => menuItem.ParentMenuItem)
            .WithMany(menuItem => menuItem.ChildMenuItems)
            .HasForeignKey(menuItem => menuItem.ParentMenuItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(menuItem => new { menuItem.MenuType, menuItem.SortOrder });
        builder.HasIndex(menuItem => menuItem.IsDeleted);

        builder.HasQueryFilter(menuItem => !menuItem.IsDeleted);
    }
}

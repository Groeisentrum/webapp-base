using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Data.Configurations;

internal sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    private const int NameMaxLength = 200;
    private const int SlugMaxLength = 200;
    private const int ColourMaxLength = 32;
    private const int IconMaxLength = 100;

    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("categories");

        builder.HasKey(category => category.Id);

        builder.Property(category => category.Name)
            .IsRequired()
            .HasMaxLength(NameMaxLength);

        builder.Property(category => category.Slug)
            .IsRequired()
            .HasMaxLength(SlugMaxLength);

        builder.Property(category => category.Colour).HasMaxLength(ColourMaxLength);
        builder.Property(category => category.Icon).HasMaxLength(IconMaxLength);

        // Restrict rather than cascade: a self-referencing cascade is rejected by MySQL,
        // and deleting a section should be a deliberate act, not a silent subtree wipe.
        builder.HasOne(category => category.ParentCategory)
            .WithMany(category => category.ChildCategories)
            .HasForeignKey(category => category.ParentCategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(category => category.Slug).IsUnique();
        builder.HasIndex(category => new { category.ParentCategoryId, category.SortOrder });
        builder.HasIndex(category => category.IsDeleted);

        builder.HasQueryFilter(category => !category.IsDeleted);
    }
}

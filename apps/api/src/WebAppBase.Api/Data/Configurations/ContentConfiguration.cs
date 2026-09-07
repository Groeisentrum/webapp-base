using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Data.Configurations;

internal sealed class ContentConfiguration : IEntityTypeConfiguration<Content>
{
    private const int TitleMaxLength = 300;
    private const int AssetReferenceMaxLength = 2048;
    private const int DescriptionMaxLength = 2000;

    public void Configure(EntityTypeBuilder<Content> builder)
    {
        builder.ToTable("content_items");

        builder.HasKey(content => content.Id);

        builder.Property(content => content.Title)
            .IsRequired()
            .HasMaxLength(TitleMaxLength);

        builder.Property(content => content.AssetReference).HasMaxLength(AssetReferenceMaxLength);
        builder.Property(content => content.Description).HasMaxLength(DescriptionMaxLength);
        builder.Property(content => content.Body).HasColumnType("longtext");

        builder.Property(content => content.AssetType).HasConversion<int>();

        builder.Property(content => content.Recurrence)
            .HasConversion(JsonColumn.Converter<Domain.ValueObjects.Recurrence>(), JsonColumn.Comparer<Domain.ValueObjects.Recurrence>())
            .HasColumnType("json")
            .IsRequired();

        builder.HasOne(content => content.Category)
            .WithMany(category => category.ContentItems)
            .HasForeignKey(content => content.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(content => new { content.CategoryId, content.IsDeleted });
        builder.HasIndex(content => new { content.PublishedAt, content.UnpublishedAt });
        builder.HasIndex(content => content.EventStart);

        builder.HasQueryFilter(content => !content.IsDeleted);
    }
}

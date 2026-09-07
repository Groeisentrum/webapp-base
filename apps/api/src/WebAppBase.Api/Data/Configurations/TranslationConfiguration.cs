using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Data.Configurations;

internal sealed class TranslationConfiguration : IEntityTypeConfiguration<Translation>
{
    private const int EntityTypeMaxLength = 100;
    private const int FieldNameMaxLength = 100;
    private const int LanguageCodeMaxLength = 16;

    public void Configure(EntityTypeBuilder<Translation> builder)
    {
        builder.ToTable("translations");

        builder.HasKey(translation => translation.Id);

        builder.Property(translation => translation.EntityType)
            .IsRequired()
            .HasMaxLength(EntityTypeMaxLength);

        builder.Property(translation => translation.FieldName)
            .IsRequired()
            .HasMaxLength(FieldNameMaxLength);

        builder.Property(translation => translation.LanguageCode)
            .IsRequired()
            .HasMaxLength(LanguageCodeMaxLength);

        builder.Property(translation => translation.Value)
            .IsRequired()
            .HasColumnType("longtext");

        // One value per field per language; upserts rely on this to stay idempotent.
        builder.HasIndex(translation => new
        {
            translation.EntityType,
            translation.EntityId,
            translation.FieldName,
            translation.LanguageCode
        })
            .IsUnique()
            .HasDatabaseName("ix_translations_entity_field_language");

        builder.HasQueryFilter(translation => !translation.IsDeleted);
    }
}

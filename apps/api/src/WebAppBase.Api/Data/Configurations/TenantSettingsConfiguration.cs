using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Data.Configurations;

internal sealed class TenantSettingsConfiguration : IEntityTypeConfiguration<TenantSettings>
{
    private const int SiteNameMaxLength = 200;
    private const int LanguageCodeMaxLength = 16;

    public void Configure(EntityTypeBuilder<TenantSettings> builder)
    {
        builder.ToTable("tenant_settings");

        builder.HasKey(settings => settings.Id);

        builder.Property(settings => settings.SiteName)
            .IsRequired()
            .HasMaxLength(SiteNameMaxLength);

        builder.Property(settings => settings.DefaultLanguageCode)
            .IsRequired()
            .HasMaxLength(LanguageCodeMaxLength);

        builder.Property(settings => settings.ActiveLanguageCodes)
            .HasConversion(JsonColumn.StringListConverter(), JsonColumn.StringListComparer())
            .HasColumnType("json")
            .IsRequired();

        builder.Property(settings => settings.FeatureFlags)
            .HasConversion(JsonColumn.Converter<Domain.ValueObjects.FeatureFlags>(), JsonColumn.Comparer<Domain.ValueObjects.FeatureFlags>())
            .HasColumnType("json")
            .IsRequired();

        builder.Property(settings => settings.Branding)
            .HasConversion(JsonColumn.Converter<Domain.ValueObjects.Branding>(), JsonColumn.Comparer<Domain.ValueObjects.Branding>())
            .HasColumnType("json")
            .IsRequired();

        builder.Property(settings => settings.ContactInfo)
            .HasConversion(JsonColumn.Converter<Domain.ValueObjects.ContactInfo>(), JsonColumn.Comparer<Domain.ValueObjects.ContactInfo>())
            .HasColumnType("json")
            .IsRequired();

        builder.HasQueryFilter(settings => !settings.IsDeleted);
    }
}

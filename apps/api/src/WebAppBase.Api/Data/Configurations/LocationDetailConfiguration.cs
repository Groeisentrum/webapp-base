using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Data.Configurations;

internal sealed class LocationDetailConfiguration : IEntityTypeConfiguration<LocationDetail>
{
    private const int CoordinatePrecision = 9;
    private const int CoordinateScale = 6;
    private const int LabelMaxLength = 200;
    private const int AddressLineMaxLength = 500;
    private const int NotesMaxLength = 2000;

    public void Configure(EntityTypeBuilder<LocationDetail> builder)
    {
        builder.ToTable("location_details");

        builder.HasKey(location => location.Id);

        builder.Property(location => location.Latitude).HasPrecision(CoordinatePrecision, CoordinateScale);
        builder.Property(location => location.Longitude).HasPrecision(CoordinatePrecision, CoordinateScale);

        builder.Property(location => location.Label).HasMaxLength(LabelMaxLength);
        builder.Property(location => location.AddressLine).HasMaxLength(AddressLineMaxLength);
        builder.Property(location => location.Notes).HasMaxLength(NotesMaxLength);

        builder.HasOne(location => location.Content)
            .WithMany(content => content.LocationDetails)
            .HasForeignKey(location => location.ContentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(location => new { location.ContentId, location.IsDeleted });

        // Indexed because the map and itinerary features will look pins up by these.
        // Left non-unique on purpose: the tour, AR and NFC tables do not exist yet, so
        // whether a tag maps to exactly one pin is not settled — and tightening an
        // index later is additive, while loosening a unique one is not.
        builder.HasIndex(location => location.TourStopId);
        builder.HasIndex(location => location.ArAnchorId);
        builder.HasIndex(location => location.NfcTagId);

        builder.HasQueryFilter(location => !location.IsDeleted);
    }
}

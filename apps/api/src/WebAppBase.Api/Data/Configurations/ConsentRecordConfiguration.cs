using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Data.Configurations;

internal sealed class ConsentRecordConfiguration : IEntityTypeConfiguration<ConsentRecord>
{
    private const int EmailMaxLength = 320;
    private const int UserNameMaxLength = 256;
    private const int VersionMaxLength = 32;
    private const int UserIdMaxLength = 100;
    private const int PendingIdMaxLength = 128;
    private const int IpAddressMaxLength = 64;
    private const int UserAgentMaxLength = 512;

    public void Configure(EntityTypeBuilder<ConsentRecord> builder)
    {
        builder.ToTable("consent_records");

        builder.HasKey(record => record.Id);

        builder.Property(record => record.Email).IsRequired().HasMaxLength(EmailMaxLength);
        builder.Property(record => record.UserName).IsRequired().HasMaxLength(UserNameMaxLength);
        builder.Property(record => record.PrivacyPolicyVersion).IsRequired().HasMaxLength(VersionMaxLength);
        builder.Property(record => record.TermsVersion).IsRequired().HasMaxLength(VersionMaxLength);
        builder.Property(record => record.SkaaphondUserId).HasMaxLength(UserIdMaxLength);
        builder.Property(record => record.OtpPendingId).HasMaxLength(PendingIdMaxLength);
        builder.Property(record => record.IpAddress).HasMaxLength(IpAddressMaxLength);
        builder.Property(record => record.UserAgent).HasMaxLength(UserAgentMaxLength);

        builder.HasIndex(record => record.Email);
        builder.HasIndex(record => record.SkaaphondUserId);
        builder.HasIndex(record => record.ConsentedAt);

        // Completion looks the record up by this, so it must be unique and indexed.
        builder.HasIndex(record => record.OtpPendingId).IsUnique();

        // No soft-delete filter: consent evidence is never hidden from a lawful request.
    }
}

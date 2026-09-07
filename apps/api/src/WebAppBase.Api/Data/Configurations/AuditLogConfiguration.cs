using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Data.Configurations;

internal sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    private const int EntityTypeMaxLength = 100;
    private const int ActorUserIdMaxLength = 100;
    private const int ActorEmailMaxLength = 320;

    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_logs");

        builder.HasKey(auditLog => auditLog.Id);

        builder.Property(auditLog => auditLog.EntityType)
            .IsRequired()
            .HasMaxLength(EntityTypeMaxLength);

        builder.Property(auditLog => auditLog.ActorUserId).HasMaxLength(ActorUserIdMaxLength);
        builder.Property(auditLog => auditLog.ActorEmail).HasMaxLength(ActorEmailMaxLength);

        builder.Property(auditLog => auditLog.Action).HasConversion<int>();

        builder.Property(auditLog => auditLog.OldValues).HasColumnType("longtext");
        builder.Property(auditLog => auditLog.NewValues).HasColumnType("longtext");

        builder.HasIndex(auditLog => new { auditLog.EntityType, auditLog.EntityId });
        builder.HasIndex(auditLog => auditLog.OccurredAt);
    }
}

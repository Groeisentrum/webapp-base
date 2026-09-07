using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WebAppBase.Api.Domain.Entities;

namespace WebAppBase.Api.Data.Configurations;

internal sealed class NotificationLogConfiguration : IEntityTypeConfiguration<NotificationLog>
{
    private const int NotificationTypeMaxLength = 100;
    private const int ErrorMaxLength = 2000;

    public void Configure(EntityTypeBuilder<NotificationLog> builder)
    {
        builder.ToTable("notification_logs");

        builder.HasKey(notification => notification.Id);

        builder.Property(notification => notification.NotificationType)
            .IsRequired()
            .HasMaxLength(NotificationTypeMaxLength);

        builder.Property(notification => notification.Error).HasMaxLength(ErrorMaxLength);

        builder.Property(notification => notification.Status).HasConversion<int>();

        builder.HasIndex(notification => new { notification.Status, notification.CreatedAt });
        builder.HasIndex(notification => notification.ContentId);
    }
}

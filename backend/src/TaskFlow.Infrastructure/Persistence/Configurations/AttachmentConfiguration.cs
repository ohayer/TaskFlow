using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Infrastructure.Persistence.Configurations;

public class AttachmentConfiguration : IEntityTypeConfiguration<Attachment>
{
    public void Configure(EntityTypeBuilder<Attachment> b)
    {
        b.ToTable("Attachments");
        b.HasKey(x => x.Id);
        b.Property(x => x.FileName).HasMaxLength(256).IsRequired();
        b.Property(x => x.MimeType).HasMaxLength(128).IsRequired();
        b.Property(x => x.BlobUrl).HasMaxLength(1024).IsRequired();
        b.Property(x => x.ThumbnailUrl).HasMaxLength(1024);
        b.Property(x => x.AiTagsJson).HasMaxLength(2048);
        b.HasOne(x => x.Task).WithMany(t => t.Attachments).HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.TaskId);
    }
}

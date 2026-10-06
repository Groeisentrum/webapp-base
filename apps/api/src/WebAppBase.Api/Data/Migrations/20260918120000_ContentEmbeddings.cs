using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppBase.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ContentEmbeddings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Raw SQL, because the EF model does not know this table: the MySQL provider
            // cannot map MariaDB's VECTOR type, so ContentEmbeddingRepository owns it
            // outright. Purely additive per the repo's migration rule — nothing existing
            // is touched, so a rollback of the code leaves the table harmlessly in place.
            //
            // VECTOR and VEC_DISTANCE_COSINE arrived in MariaDB 11.7, which is why
            // docker-compose pins 11.8.
            migrationBuilder.Sql(
                """
                CREATE TABLE IF NOT EXISTS content_embeddings (
                  ContentId   BIGINT       NOT NULL,
                  ChunkIndex  INT          NOT NULL,
                  Chunk       TEXT         NOT NULL,
                  SourceHash  CHAR(64)     NOT NULL,
                  Embedding   VECTOR(1024) NOT NULL,
                  UpdatedAt   DATETIME(6)  NOT NULL,
                  PRIMARY KEY (ContentId, ChunkIndex),
                  VECTOR INDEX (Embedding) M=6 DISTANCE=cosine
                ) ENGINE=InnoDB;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS content_embeddings;");
        }
    }
}

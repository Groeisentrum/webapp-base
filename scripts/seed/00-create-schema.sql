-- MariaDB schema creation script for the WebAppBase app.
-- Run against an existing database, for example:
--   docker compose exec -T mariadb mariadb -uroot -p"$DB_ROOT_PASSWORD" webapp_base < scripts/seed/00-create-schema.sql
--
-- This is intentionally a manual schema script. The API owns schema evolution via EF Core migrations,
-- so this file is useful for bootstrapping a fresh database or for a one-off table recreation.

CREATE TABLE IF NOT EXISTS tenant_settings (
    Id BIGINT NOT NULL AUTO_INCREMENT,
    SiteName VARCHAR(200) NOT NULL,
    DefaultLanguageCode VARCHAR(16) NOT NULL,
    ActiveLanguageCodes JSON NOT NULL,
    FeatureFlags JSON NOT NULL,
    Branding JSON NOT NULL,
    ContactInfo JSON NOT NULL,
    PrivacyPolicyVersion VARCHAR(32) NOT NULL,
    TermsVersion VARCHAR(32) NOT NULL,
    SelfRegistrationEnabled TINYINT(1) NOT NULL DEFAULT 0,
    IsDeleted TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL,
    UpdatedAt DATETIME NULL,
    PRIMARY KEY (Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
    Id BIGINT NOT NULL AUTO_INCREMENT,
    ParentCategoryId BIGINT NULL,
    Name VARCHAR(200) NOT NULL,
    Slug VARCHAR(200) NOT NULL,
    Colour VARCHAR(32) NULL,
    Icon VARCHAR(100) NULL,
    SortOrder INT NOT NULL DEFAULT 0,
    Visibility INT NOT NULL DEFAULT 0,
    VisibleToRoles JSON NOT NULL,
    IsDeleted TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL,
    UpdatedAt DATETIME NULL,
    PRIMARY KEY (Id),
    CONSTRAINT fk_categories_parent_category
        FOREIGN KEY (ParentCategoryId) REFERENCES categories (Id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
    Id BIGINT NOT NULL AUTO_INCREMENT,
    EntityType VARCHAR(100) NOT NULL,
    EntityId BIGINT NOT NULL,
    Action INT NOT NULL,
    ActorUserId VARCHAR(100) NULL,
    ActorEmail VARCHAR(320) NULL,
    OldValues LONGTEXT NULL,
    NewValues LONGTEXT NULL,
    OccurredAt DATETIME NOT NULL,
    PRIMARY KEY (Id),
    KEY ix_audit_logs_entity (EntityType, EntityId),
    KEY ix_audit_logs_occurred (OccurredAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_logs (
    Id BIGINT NOT NULL AUTO_INCREMENT,
    ContentId BIGINT NULL,
    NotificationType VARCHAR(100) NOT NULL,
    Status INT NOT NULL,
    CreatedAt DATETIME NOT NULL,
    SentAt DATETIME NULL,
    Error VARCHAR(2000) NULL,
    PRIMARY KEY (Id),
    KEY ix_notification_logs_content (ContentId),
    KEY ix_notification_logs_status_created (Status, CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consent_records (
    Id BIGINT NOT NULL AUTO_INCREMENT,
    SkaaphondUserId VARCHAR(100) NULL,
    Email VARCHAR(320) NOT NULL,
    UserName VARCHAR(256) NOT NULL,
    PrivacyPolicyVersion VARCHAR(32) NOT NULL,
    TermsVersion VARCHAR(32) NOT NULL,
    ConsentedAt DATETIME NOT NULL,
    IpAddress VARCHAR(64) NULL,
    UserAgent VARCHAR(512) NULL,
    OtpPendingId VARCHAR(128) NULL,
    EmailVerifiedAt DATETIME NULL,
    WithdrawnAt DATETIME NULL,
    PRIMARY KEY (Id),
    KEY ix_consent_records_consented_at (ConsentedAt),
    KEY ix_consent_records_email (Email),
    KEY ix_consent_records_skaaphond_user_id (SkaaphondUserId),
    UNIQUE KEY ux_consent_records_otp_pending (OtpPendingId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS translations (
    Id BIGINT NOT NULL AUTO_INCREMENT,
    EntityType VARCHAR(100) NOT NULL,
    EntityId BIGINT NOT NULL,
    FieldName VARCHAR(100) NOT NULL,
    LanguageCode VARCHAR(16) NOT NULL,
    Value LONGTEXT NOT NULL,
    IsDeleted TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL,
    UpdatedAt DATETIME NULL,
    PRIMARY KEY (Id),
    UNIQUE KEY ix_translations_entity_field_language (EntityType, EntityId, FieldName, LanguageCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_items (
    Id BIGINT NOT NULL AUTO_INCREMENT,
    CategoryId BIGINT NOT NULL,
    AssetType INT NOT NULL,
    AssetReference VARCHAR(2048) NULL,
    Title VARCHAR(300) NOT NULL,
    Description VARCHAR(2000) NULL,
    Body LONGTEXT NULL,
    PublishedAt DATETIME NULL,
    UnpublishedAt DATETIME NULL,
    EventStart DATETIME NULL,
    EventEnd DATETIME NULL,
    Recurrence JSON NOT NULL,
    Visibility INT NOT NULL DEFAULT 0,
    VisibleToRoles JSON NOT NULL,
    IsDeleted TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL,
    UpdatedAt DATETIME NULL,
    PRIMARY KEY (Id),
    CONSTRAINT fk_content_items_category
        FOREIGN KEY (CategoryId) REFERENCES categories (Id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    KEY ix_content_items_category_deleted (CategoryId, IsDeleted),
    KEY ix_content_items_published_window (PublishedAt, UnpublishedAt),
    KEY ix_content_items_event_start (EventStart)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_items (
    Id BIGINT NOT NULL AUTO_INCREMENT,
    MenuType INT NOT NULL,
    LinkType INT NOT NULL,
    Label VARCHAR(200) NOT NULL,
    CategoryId BIGINT NULL,
    StaticPageSlug VARCHAR(200) NULL,
    ExternalUrl VARCHAR(2048) NULL,
    ParentMenuItemId BIGINT NULL,
    SortOrder INT NOT NULL DEFAULT 0,
    Visibility INT NOT NULL DEFAULT 0,
    VisibleToRoles JSON NOT NULL,
    IsDeleted TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL,
    UpdatedAt DATETIME NULL,
    PRIMARY KEY (Id),
    CONSTRAINT fk_menu_items_category
        FOREIGN KEY (CategoryId) REFERENCES categories (Id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    CONSTRAINT fk_menu_items_parent
        FOREIGN KEY (ParentMenuItemId) REFERENCES menu_items (Id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    KEY ix_menu_items_category (CategoryId),
    KEY ix_menu_items_parent (ParentMenuItemId),
    KEY ix_menu_items_type_sort (MenuType, SortOrder),
    KEY ix_menu_items_deleted (IsDeleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS location_details (
    Id BIGINT NOT NULL AUTO_INCREMENT,
    ContentId BIGINT NOT NULL,
    Latitude DECIMAL(9,6) NOT NULL,
    Longitude DECIMAL(9,6) NOT NULL,
    Label VARCHAR(200) NULL,
    AddressLine VARCHAR(500) NULL,
    Notes VARCHAR(2000) NULL,
    TourStopId BIGINT NULL,
    ArAnchorId BIGINT NULL,
    NfcTagId BIGINT NULL,
    IsDeleted TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL,
    UpdatedAt DATETIME NULL,
    PRIMARY KEY (Id),
    CONSTRAINT fk_location_details_content
        FOREIGN KEY (ContentId) REFERENCES content_items (Id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,
    KEY ix_location_details_content_deleted (ContentId, IsDeleted),
    KEY ix_location_details_tour_stop (TourStopId),
    KEY ix_location_details_ar_anchor (ArAnchorId),
    KEY ix_location_details_nfc_tag (NfcTagId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Additional unique indexes that are expected by the app.
CREATE UNIQUE INDEX ux_categories_slug ON categories (Slug);
CREATE INDEX ix_categories_parent_sort ON categories (ParentCategoryId, SortOrder);
CREATE INDEX ix_categories_deleted ON categories (IsDeleted);

-- End of schema creation script.

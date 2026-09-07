-- ---------------------------------------------------------------------------
-- VTM sample seed — EXAMPLE DATA, NOT PART OF THE TEMPLATE
--
-- Shows how a client deployment is populated. Everything here is data: categories,
-- languages, branding and menus are rows, never code. Copy this file, change the
-- values, and you have a new client.
--
-- Run it AFTER the API has started at least once, so EF Core has created the schema:
--
--   docker compose exec -T mariadb mariadb -uroot -p"$DB_ROOT_PASSWORD" webapp_base \
--     < scripts/seed/vtm-sample.sql
--
-- Idempotent: re-running changes nothing that already exists.
-- ---------------------------------------------------------------------------

SET @now = UTC_TIMESTAMP();

-- --- Tenant settings ---------------------------------------------------------
-- One row per deployment. Six languages here; a client may configure between two
-- and eleven. The default language must appear in the active list.
INSERT INTO tenant_settings
    (SiteName, DefaultLanguageCode, ActiveLanguageCodes, FeatureFlags, Branding, ContactInfo,
     IsDeleted, CreatedAt)
SELECT
    'VTM',
    'af',
    '["af","en","zu","xh","st","tn"]',
    '{"flags":{"augmentedReality":true,"virtualTour":true,"nfc":true,"chatbot":true}}',
    '{"primaryColour":"#1f5f4b","secondaryColour":"#2d7a63","accentColour":"#c8862a","headingFont":null,"bodyFont":null,"logoReference":null,"faviconReference":null}',
    '{"emailAddress":"info@vtm.co.za","phoneNumber":"+27 12 000 0000","physicalAddress":null,"postalAddress":null}',
    0,
    @now
WHERE NOT EXISTS (SELECT 1 FROM tenant_settings);

-- --- Top-level categories ----------------------------------------------------
INSERT INTO categories (ParentCategoryId, Name, Slug, Colour, Icon, SortOrder, IsDeleted, CreatedAt)
SELECT * FROM (
    SELECT NULL AS p, 'Besoek' AS n, 'besoek' AS s, '#1f5f4b' AS c, NULL AS i, 1 AS o, 0 AS d, @now AS t
    UNION ALL SELECT NULL, 'Beleef', 'beleef', '#2d7a63', NULL, 2, 0, @now
    UNION ALL SELECT NULL, 'Leer',   'leer',   '#c8862a', NULL, 3, 0, @now
    UNION ALL SELECT NULL, 'Winkel', 'winkel', '#8a6116', NULL, 4, 0, @now
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE Slug = seed.s);

-- --- Child categories --------------------------------------------------------
INSERT INTO categories (ParentCategoryId, Name, Slug, Colour, Icon, SortOrder, IsDeleted, CreatedAt)
SELECT parent.Id, seed.n, seed.s, NULL, NULL, seed.o, 0, @now
FROM (
    SELECT 'besoek' AS parent_slug, 'Geleide toere'  AS n, 'geleide-toere'  AS s, 1 AS o
    UNION ALL SELECT 'besoek', 'Selfie-plekke',  'selfie-plekke',  2
    UNION ALL SELECT 'besoek', 'Geskiedenis',    'geskiedenis',    3
    UNION ALL SELECT 'beleef', 'Virtuele toer',  'virtuele-toer',  1
    UNION ALL SELECT 'beleef', 'Geleenthede',    'geleenthede',    2
    UNION ALL SELECT 'leer',   'Skoolgroepe',    'skoolgroepe',    1
) AS seed
JOIN categories AS parent ON parent.Slug = seed.parent_slug
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE Slug = seed.s);

-- --- Category translations ---------------------------------------------------
-- Only the non-default languages need rows; Afrikaans lives on the category itself
-- and is what an untranslated field falls back to.
INSERT INTO translations
    (EntityType, EntityId, FieldName, LanguageCode, Value, IsDeleted, CreatedAt)
SELECT 'Category', category.Id, 'Name', seed.lang, seed.value, 0, @now
FROM (
    SELECT 'besoek' AS slug, 'en' AS lang, 'Visit'      AS value
    UNION ALL SELECT 'besoek', 'zu', 'Vakashela'
    UNION ALL SELECT 'beleef', 'en', 'Experience'
    UNION ALL SELECT 'beleef', 'zu', 'Hlangenwe nakho'
    UNION ALL SELECT 'leer',   'en', 'Learn'
    UNION ALL SELECT 'leer',   'zu', 'Funda'
    UNION ALL SELECT 'winkel', 'en', 'Shop'
    UNION ALL SELECT 'winkel', 'zu', 'Isitolo'
) AS seed
JOIN categories AS category ON category.Slug = seed.slug
WHERE NOT EXISTS (
    SELECT 1 FROM translations AS existing
    WHERE existing.EntityType = 'Category'
      AND existing.EntityId = category.Id
      AND existing.FieldName = 'Name'
      AND existing.LanguageCode = seed.lang
);

-- --- Sample content ----------------------------------------------------------
-- AssetType: 1 = YouTube, 4 = ExternalLink.
-- Note the third row: its event is in the past but its publish window is open, so
-- it stays visible. The two windows are independent by design.
INSERT INTO content_items
    (CategoryId, AssetType, AssetReference, Title, Description, Body,
     PublishedAt, UnpublishedAt, EventStart, EventEnd, Recurrence, IsDeleted, CreatedAt)
SELECT
    category.Id, seed.asset_type, seed.asset_ref, seed.title, seed.description, NULL,
    seed.published_at, NULL, seed.event_start, seed.event_end, seed.recurrence, 0, @now
FROM (
    SELECT 'geleide-toere' AS slug, 1 AS asset_type, 'dQw4w9WgXcQ' AS asset_ref,
           'Welkom by VTM' AS title, 'n Kort video-oorsig van die terrein.' AS description,
           DATE_SUB(@now, INTERVAL 7 DAY) AS published_at,
           NULL AS event_start, NULL AS event_end,
           '{"frequency":0,"dayOfWeek":null,"weekOfMonth":null}' AS recurrence
    UNION ALL SELECT 'virtuele-toer', 4, 'https://voorbeeld.co.za/virtuele-toer',
           'Virtuele toer', 'Stap deur die terrein van waar jy ook al is.',
           DATE_SUB(@now, INTERVAL 3 DAY), NULL, NULL,
           '{"frequency":0,"dayOfWeek":null,"weekOfMonth":null}'
    UNION ALL SELECT 'geleenthede', 0, NULL,
           'Maandelikse boeremark', 'Elke eerste Saterdag van die maand.',
           DATE_SUB(@now, INTERVAL 30 DAY),
           DATE_SUB(@now, INTERVAL 5 DAY), DATE_SUB(@now, INTERVAL 5 DAY),
           '{"frequency":2,"dayOfWeek":6,"weekOfMonth":1}'
) AS seed
JOIN categories AS category ON category.Slug = seed.slug
WHERE NOT EXISTS (SELECT 1 FROM content_items WHERE Title = seed.title);

-- --- Menus -------------------------------------------------------------------
-- MenuType: 1 = Top, 3 = Footer. LinkType: 1 = Category, 2 = StaticPage.
INSERT INTO menu_items
    (MenuType, LinkType, Label, CategoryId, StaticPageSlug, ExternalUrl,
     ParentMenuItemId, SortOrder, IsDeleted, CreatedAt)
SELECT 1, 1, category.Name, category.Id, NULL, NULL, NULL, category.SortOrder, 0, @now
FROM categories AS category
WHERE category.ParentCategoryId IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM menu_items
      WHERE MenuType = 1 AND LinkType = 1 AND CategoryId = category.Id
  );

INSERT INTO menu_items
    (MenuType, LinkType, Label, CategoryId, StaticPageSlug, ExternalUrl,
     ParentMenuItemId, SortOrder, IsDeleted, CreatedAt)
SELECT 3, 2, seed.label, NULL, seed.slug, NULL, NULL, seed.o, 0, @now
FROM (
    SELECT 'Privaatheidsbeleid' AS label, 'privaatheid' AS slug, 1 AS o
    UNION ALL SELECT 'Bepalings en voorwaardes', 'bepalings', 2
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items WHERE MenuType = 3 AND StaticPageSlug = seed.slug
);

-- ---------------------------------------------------------------------------
-- VTM sample seed — EXAMPLE DATA, NOT PART OF THE TEMPLATE
--
-- Shows how a client deployment is populated. Everything here is data: categories,
-- languages, branding, menus and points of interest are rows, never code. Copy this
-- file, change the values, and you have a new client.
--
-- Run it AFTER the API has started at least once, so EF Core has created the schema:
--
--   docker compose exec -T mariadb mariadb -uroot -p"$DB_ROOT_PASSWORD" webapp_base \
--     < scripts/seed/vtm-sample.sql
--
-- Idempotent: re-running changes nothing that already exists.
--
-- COLOURS: taken from the live Voortrekkermonument site (vtm.org.za), whose theme
-- defines five author-set colours: #25404d slate, #26303e navy, #b88f36 brass,
-- #6b723a olive and #b15535 terracotta. Branding uses three of them directly. The map
-- needs ten distinguishable pins, so the rest are lighter and darker steps of the same
-- five; every pin clears 3:1 against the light map ground, which the previous
-- near-white #f5f5f5 pin did not.
--
-- COORDINATES: only the main monument below carries a surveyed coordinate
-- (-25.776600, 28.175300). Every other pin is an approximation placed within the
-- heritage site so the map and itinerary features have something real-shaped to
-- draw. VTM must confirm them before this goes in front of visitors — each one is
-- marked with a "TODO: confirm" note on the location row itself.
-- ---------------------------------------------------------------------------

SET @now = UTC_TIMESTAMP();
SET @published = DATE_SUB(@now, INTERVAL 7 DAY);

-- --- Tenant settings ---------------------------------------------------------
-- One row per deployment. Afrikaans is the default and English is the only other
-- language with content today. The language list is an open array, so adding the
-- remaining official languages later is a settings change, not a release.
INSERT INTO tenant_settings
    (SiteName, DefaultLanguageCode, ActiveLanguageCodes, FeatureFlags, Branding, ContactInfo,
     PrivacyPolicyVersion, TermsVersion, IsDeleted, CreatedAt)
SELECT
    'Voortrekkermonument',
    'af',
    '["af","en"]',
    '{"flags":{"augmentedReality":false,"virtualTour":false,"nfc":false}}',
    '{"primaryColour":"#25404d","secondaryColour":"#26303e","accentColour":"#b88f36","headingFont":null,"bodyFont":null,"logoReference":null,"faviconReference":null}',
    '{"emailAddress":"info@vtm.co.za","phoneNumber":"+27 12 326 6770","physicalAddress":"Eeufeesweg, Groenkloof, Pretoria","postalAddress":null,"socialLinks":{"facebook":"https://www.facebook.com/voortrekkermonument","instagram":"https://www.instagram.com/voortrekkermonument","youtube":"https://www.youtube.com/@voortrekkermonument"}}',
    '1.0',
    '1.0',
    0,
    @now
WHERE NOT EXISTS (SELECT 1 FROM tenant_settings);

-- --- Top-level sections ------------------------------------------------------
-- Tuis / Besoek / Beleef / Behoort. The four sections are rows, not a hardcoded
-- list: which of them appear in which menu is decided by menu_items further down.
INSERT INTO categories
    (ParentCategoryId, Name, Slug, Colour, Icon, SortOrder, Visibility, VisibleToRoles, IsDeleted, CreatedAt)
SELECT * FROM (
    SELECT NULL AS p, 'Tuis' AS n, 'tuis' AS s, '#25404d' AS c, NULL AS i, 1 AS o, 0 AS v, '[]' AS r, 0 AS d, @now AS t
    UNION ALL SELECT NULL, 'Besoek',  'besoek',  '#26303e', NULL, 2, 0, '[]', 0, @now
    UNION ALL SELECT NULL, 'Beleef',  'beleef',  '#b15535', NULL, 3, 0, '[]', 0, @now
    UNION ALL SELECT NULL, 'Behoort', 'behoort', '#91702a', NULL, 4, 0, '[]', 0, @now
    UNION ALL SELECT NULL, 'Nuus',    'nuus',    '#6b723a', NULL, 5, 0, '[]', 0, @now
    UNION ALL SELECT NULL, 'Gebeure', 'gebeure', '#396276', NULL, 6, 0, '[]', 0, @now
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE Slug = seed.s);

-- --- Map categories ----------------------------------------------------------
-- The ten category/colour pairs the map legend draws. Children of Besoek, since a
-- point of interest is somewhere you go.
--
-- "Alles" is the map's show-everything filter rather than a category a pin belongs
-- to. It is seeded so the legend renders from the same source as the rest; no
-- content is attached to it.
INSERT INTO categories
    (ParentCategoryId, Name, Slug, Colour, Icon, SortOrder, Visibility, VisibleToRoles, IsDeleted, CreatedAt)
SELECT parent.Id, seed.n, seed.s, seed.c, NULL, seed.o, 0, '[]', 0, @now
FROM (
    SELECT 'Alles' AS n, 'alles' AS s, '#25404d' AS c, 1 AS o
    UNION ALL SELECT 'Geskiedenis',                 'geskiedenis',                 '#b15535', 2
    UNION ALL SELECT 'Kinders',                     'kinders',                     '#91702a', 3
    UNION ALL SELECT 'Eet en ontspan',              'eet-en-ontspan',              '#cd7557', 4
    UNION ALL SELECT 'Sport en leefstyl',           'sport-en-leefstyl',           '#6b723a', 5
    UNION ALL SELECT 'Fasiliteite',                 'fasiliteite',                 '#396276', 6
    UNION ALL SELECT 'Ontvangs en inligting',       'ontvangs-en-inligting',       '#8a4229', 7
    UNION ALL SELECT 'Parkering en toeganklikheid', 'parkering-en-toeganklikheid', '#26303e', 8
    UNION ALL SELECT 'Badkamers',                   'badkamers',                   '#3d4d64', 9
    UNION ALL SELECT 'Uitkykpunte',                 'uitkykpunte',                 '#4b5029', 10
) AS seed
JOIN categories AS parent ON parent.Slug = 'besoek'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE Slug = seed.s);

-- --- Category translations ---------------------------------------------------
-- Only non-default languages need rows; Afrikaans lives on the category itself and
-- is what an untranslated field falls back to.
INSERT INTO translations
    (EntityType, EntityId, FieldName, LanguageCode, Value, IsDeleted, CreatedAt)
SELECT 'Category', category.Id, 'Name', 'en', seed.value, 0, @now
FROM (
    SELECT 'tuis' AS slug, 'Home' AS value
    UNION ALL SELECT 'besoek',                      'Visit'
    UNION ALL SELECT 'beleef',                      'Experience'
    UNION ALL SELECT 'behoort',                     'Belong'
    UNION ALL SELECT 'nuus',                        'News'
    UNION ALL SELECT 'gebeure',                     'Events'
    UNION ALL SELECT 'alles',                       'All'
    UNION ALL SELECT 'geskiedenis',                 'History'
    UNION ALL SELECT 'kinders',                     'Children'
    UNION ALL SELECT 'eet-en-ontspan',              'Eat and relax'
    UNION ALL SELECT 'sport-en-leefstyl',           'Sport and lifestyle'
    UNION ALL SELECT 'fasiliteite',                 'Facilities'
    UNION ALL SELECT 'ontvangs-en-inligting',       'Reception and information'
    UNION ALL SELECT 'parkering-en-toeganklikheid', 'Parking and accessibility'
    UNION ALL SELECT 'badkamers',                   'Bathrooms'
    UNION ALL SELECT 'uitkykpunte',                 'Viewpoints'
) AS seed
JOIN categories AS category ON category.Slug = seed.slug
WHERE NOT EXISTS (
    SELECT 1 FROM translations AS existing
    WHERE existing.EntityType = 'Category'
      AND existing.EntityId = category.Id
      AND existing.FieldName = 'Name'
      AND existing.LanguageCode = 'en'
);

-- --- Points of interest: content ---------------------------------------------
-- A point of interest is a content item that happens to have coordinates. It
-- carries the name, description, photo and category; the location row carries only
-- geometry and the future-linkage ids. AssetType 5 = Image.
INSERT INTO content_items
    (CategoryId, AssetType, AssetReference, Title, Description, Body,
     PublishedAt, UnpublishedAt, EventStart, EventEnd, Recurrence,
     Visibility, VisibleToRoles, IsDeleted, CreatedAt)
SELECT
    category.Id, 5, seed.asset_ref, seed.title, seed.description, NULL,
    @published, NULL, NULL, NULL, '{"frequency":0,"dayOfWeek":null,"weekOfMonth":null}',
    0, '[]', 0, @now
FROM (
    SELECT 'geskiedenis' AS slug, 'vtm/hoofmonument.jpg' AS asset_ref,
           'Voortrekkermonument' AS title,
           'Die hoofmonument met sy Heldesaal, sarkofaag en historiese fries.' AS description
    UNION ALL SELECT 'geskiedenis', 'vtm/museumteater.jpg',
           'Museumteater',
           'Vertonings en vertellings oor die Groot Trek, binne die monumentkompleks.'
    UNION ALL SELECT 'kinders', 'vtm/pioniersentrum.jpg',
           'Pioniersentrum',
           'Interaktiewe leerruimte waar kinders die pionierslewe self beleef.'
    UNION ALL SELECT 'geskiedenis', 'vtm/plaaswerf.jpg',
           'Plaaswerf en Grensplaas',
           'Herboude grensplaas met werf, kraal en gereedskap uit die tydperk.'
    UNION ALL SELECT 'ontvangs-en-inligting', 'vtm/ontvangs.jpg',
           'Ontvangs en kaartjiekantoor',
           'Kaartjies, inligting en die vertrekpunt vir geleide toere.'
    UNION ALL SELECT 'eet-en-ontspan', 'vtm/restaurant.jpg',
           'Restaurant en koffiewinkel',
           'Ligte etes en koffie met uitsig oor die terrein.'
    UNION ALL SELECT 'uitkykpunte', 'vtm/uitkykdek.jpg',
           'Uitkykdek',
           'Die boonste dek van die monument, met uitsig oor Pretoria.'
    UNION ALL SELECT 'parkering-en-toeganklikheid', 'vtm/parkering.jpg',
           'Hoofparkering',
           'Besoekersparkering met aangewese plekke vir besoekers met gestremdhede.'
    UNION ALL SELECT 'badkamers', 'vtm/badkamers.jpg',
           'Badkamers by ontvangs',
           'Openbare badkamers, insluitend een toeganklike badkamer.'
    UNION ALL SELECT 'fasiliteite', 'vtm/piekniek.jpg',
           'Piekniekterrein',
           'Skaduryke piekniekplekke en braaigeriewe in die natuurreservaat.'
    UNION ALL SELECT 'sport-en-leefstyl', 'vtm/wandelroete.jpg',
           'Wandelroetes',
           'Roetes deur die natuurreservaat rondom die monument.'
) AS seed
JOIN categories AS category ON category.Slug = seed.slug
WHERE NOT EXISTS (SELECT 1 FROM content_items WHERE Title = seed.title);

-- --- Points of interest: English ---------------------------------------------
INSERT INTO translations
    (EntityType, EntityId, FieldName, LanguageCode, Value, IsDeleted, CreatedAt)
SELECT 'Content', content.Id, seed.field, 'en', seed.value, 0, @now
FROM (
    SELECT 'Voortrekkermonument' AS title, 'Title' AS field, 'Voortrekker Monument' AS value
    UNION ALL SELECT 'Voortrekkermonument', 'Description', 'The main monument with its Hall of Heroes, cenotaph and historical frieze.'
    UNION ALL SELECT 'Museumteater', 'Title', 'Museum Theatre'
    UNION ALL SELECT 'Museumteater', 'Description', 'Screenings and storytelling about the Great Trek, inside the monument complex.'
    UNION ALL SELECT 'Pioniersentrum', 'Title', 'Pioneer Centre'
    UNION ALL SELECT 'Pioniersentrum', 'Description', 'An interactive space where children experience pioneer life first-hand.'
    UNION ALL SELECT 'Plaaswerf en Grensplaas', 'Title', 'Farmyard and Frontier Farm'
    UNION ALL SELECT 'Plaaswerf en Grensplaas', 'Description', 'A rebuilt frontier farm with yard, kraal and period implements.'
    UNION ALL SELECT 'Ontvangs en kaartjiekantoor', 'Title', 'Reception and ticket office'
    UNION ALL SELECT 'Ontvangs en kaartjiekantoor', 'Description', 'Tickets, information and the starting point for guided tours.'
    UNION ALL SELECT 'Restaurant en koffiewinkel', 'Title', 'Restaurant and coffee shop'
    UNION ALL SELECT 'Restaurant en koffiewinkel', 'Description', 'Light meals and coffee overlooking the grounds.'
    UNION ALL SELECT 'Uitkykdek', 'Title', 'Viewing deck'
    UNION ALL SELECT 'Uitkykdek', 'Description', 'The monument roof deck, looking out over Pretoria.'
    UNION ALL SELECT 'Hoofparkering', 'Title', 'Main parking'
    UNION ALL SELECT 'Hoofparkering', 'Description', 'Visitor parking including designated accessible bays.'
    UNION ALL SELECT 'Badkamers by ontvangs', 'Title', 'Bathrooms at reception'
    UNION ALL SELECT 'Badkamers by ontvangs', 'Description', 'Public bathrooms, including an accessible bathroom.'
    UNION ALL SELECT 'Piekniekterrein', 'Title', 'Picnic area'
    UNION ALL SELECT 'Piekniekterrein', 'Description', 'Shaded picnic spots and braai facilities in the nature reserve.'
    UNION ALL SELECT 'Wandelroetes', 'Title', 'Walking trails'
    UNION ALL SELECT 'Wandelroetes', 'Description', 'Trails through the nature reserve surrounding the monument.'
) AS seed
JOIN content_items AS content ON content.Title = seed.title
WHERE NOT EXISTS (
    SELECT 1 FROM translations AS existing
    WHERE existing.EntityType = 'Content'
      AND existing.EntityId = content.Id
      AND existing.FieldName = seed.field
      AND existing.LanguageCode = 'en'
);

-- --- Points of interest: geometry --------------------------------------------
-- TourStopId, ArAnchorId and NfcTagId stay null: the tour, AR and NFC tables do not
-- exist yet. The columns are here so those features attach to an existing pin later
-- instead of migrating a table the map is already reading.
INSERT INTO location_details
    (ContentId, Latitude, Longitude, Label, AddressLine, Notes,
     TourStopId, ArAnchorId, NfcTagId, IsDeleted, CreatedAt)
SELECT content.Id, seed.lat, seed.lng, NULL, NULL, seed.notes, NULL, NULL, NULL, 0, @now
FROM (
    SELECT 'Voortrekkermonument' AS title, -25.776600 AS lat, 28.175300 AS lng,
           'Surveyed coordinate.' AS notes
    UNION ALL SELECT 'Museumteater',                -25.776100, 28.175800, 'TODO: confirm with VTM - approximate.'
    UNION ALL SELECT 'Pioniersentrum',              -25.777400, 28.176400, 'TODO: confirm with VTM - approximate.'
    UNION ALL SELECT 'Plaaswerf en Grensplaas',     -25.778900, 28.173600, 'TODO: confirm with VTM - approximate.'
    UNION ALL SELECT 'Ontvangs en kaartjiekantoor', -25.775800, 28.176700, 'TODO: confirm with VTM - approximate.'
    UNION ALL SELECT 'Restaurant en koffiewinkel',  -25.775500, 28.176200, 'TODO: confirm with VTM - approximate.'
    UNION ALL SELECT 'Uitkykdek',                   -25.776600, 28.175300, 'Same footprint as the monument; confirm the pin offset with VTM.'
    UNION ALL SELECT 'Hoofparkering',               -25.774900, 28.177300, 'TODO: confirm with VTM - approximate.'
    UNION ALL SELECT 'Badkamers by ontvangs',       -25.775700, 28.176900, 'TODO: confirm with VTM - approximate.'
    UNION ALL SELECT 'Piekniekterrein',             -25.779600, 28.178100, 'TODO: confirm with VTM - approximate.'
    UNION ALL SELECT 'Wandelroetes',                -25.780400, 28.172900, 'Trailhead. TODO: confirm with VTM - approximate.'
) AS seed
JOIN content_items AS content ON content.Title = seed.title
WHERE NOT EXISTS (SELECT 1 FROM location_details WHERE ContentId = content.Id);

-- --- Menus -------------------------------------------------------------------
-- MenuType: 1 = Top, 2 = BottomHover, 3 = Footer. LinkType: 1 = Category, 2 = StaticPage.
--
-- Sign-in, the language switcher and the social icons are site chrome rather than
-- menu rows: they render from tenant settings and session state, so an administrator
-- cannot accidentally delete the way back into the site.

-- Top menu: news and events.
INSERT INTO menu_items
    (MenuType, LinkType, Label, CategoryId, StaticPageSlug, ExternalUrl,
     ParentMenuItemId, SortOrder, Visibility, VisibleToRoles, IsDeleted, CreatedAt)
SELECT 1, 1, category.Name, category.Id, NULL, NULL, NULL, seed.o, 0, '[]', 0, @now
FROM (
    SELECT 'nuus' AS slug, 1 AS o
    UNION ALL SELECT 'gebeure', 2
) AS seed
JOIN categories AS category ON category.Slug = seed.slug
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items
    WHERE MenuType = 1 AND LinkType = 1 AND CategoryId = category.Id
);

-- Bottom hover menu: the four sections.
INSERT INTO menu_items
    (MenuType, LinkType, Label, CategoryId, StaticPageSlug, ExternalUrl,
     ParentMenuItemId, SortOrder, Visibility, VisibleToRoles, IsDeleted, CreatedAt)
SELECT 2, 1, category.Name, category.Id, NULL, NULL, NULL, seed.o, 0, '[]', 0, @now
FROM (
    SELECT 'tuis' AS slug, 1 AS o
    UNION ALL SELECT 'besoek',  2
    UNION ALL SELECT 'beleef',  3
    UNION ALL SELECT 'behoort', 4
) AS seed
JOIN categories AS category ON category.Slug = seed.slug
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items
    WHERE MenuType = 2 AND LinkType = 1 AND CategoryId = category.Id
);

-- Bottom hover submenus: the map categories hang under Besoek.
INSERT INTO menu_items
    (MenuType, LinkType, Label, CategoryId, StaticPageSlug, ExternalUrl,
     ParentMenuItemId, SortOrder, Visibility, VisibleToRoles, IsDeleted, CreatedAt)
SELECT 2, 1, category.Name, category.Id, NULL, NULL, parent_item.Id, category.SortOrder, 0, '[]', 0, @now
FROM categories AS category
JOIN categories AS parent_category ON parent_category.Slug = 'besoek'
JOIN menu_items AS parent_item
  ON parent_item.MenuType = 2 AND parent_item.CategoryId = parent_category.Id
WHERE category.ParentCategoryId = parent_category.Id
  AND category.Slug <> 'alles'
  AND NOT EXISTS (
      SELECT 1 FROM menu_items AS existing
      WHERE existing.MenuType = 2 AND existing.LinkType = 1 AND existing.CategoryId = category.Id
  );

-- Footer sitemap: every section, plus the two legal pages.
INSERT INTO menu_items
    (MenuType, LinkType, Label, CategoryId, StaticPageSlug, ExternalUrl,
     ParentMenuItemId, SortOrder, Visibility, VisibleToRoles, IsDeleted, CreatedAt)
SELECT 3, 1, category.Name, category.Id, NULL, NULL, NULL, category.SortOrder, 0, '[]', 0, @now
FROM categories AS category
WHERE category.ParentCategoryId IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM menu_items
      WHERE MenuType = 3 AND LinkType = 1 AND CategoryId = category.Id
  );

INSERT INTO menu_items
    (MenuType, LinkType, Label, CategoryId, StaticPageSlug, ExternalUrl,
     ParentMenuItemId, SortOrder, Visibility, VisibleToRoles, IsDeleted, CreatedAt)
SELECT 3, 2, seed.label, NULL, seed.slug, NULL, NULL, seed.o, 0, '[]', 0, @now
FROM (
    SELECT 'Privaatheidsbeleid' AS label, 'privaatheid' AS slug, 90 AS o
    UNION ALL SELECT 'Bepalings en voorwaardes', 'bepalings', 91
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items WHERE MenuType = 3 AND StaticPageSlug = seed.slug
);

-- --- Menu translations -------------------------------------------------------
INSERT INTO translations
    (EntityType, EntityId, FieldName, LanguageCode, Value, IsDeleted, CreatedAt)
SELECT 'MenuItem', menu_item.Id, 'Label', 'en', category_name.value, 0, @now
FROM menu_items AS menu_item
JOIN categories AS category ON category.Id = menu_item.CategoryId
JOIN (
    SELECT 'tuis' AS slug, 'Home' AS value
    UNION ALL SELECT 'besoek',                      'Visit'
    UNION ALL SELECT 'beleef',                      'Experience'
    UNION ALL SELECT 'behoort',                     'Belong'
    UNION ALL SELECT 'nuus',                        'News'
    UNION ALL SELECT 'gebeure',                     'Events'
    UNION ALL SELECT 'geskiedenis',                 'History'
    UNION ALL SELECT 'kinders',                     'Children'
    UNION ALL SELECT 'eet-en-ontspan',              'Eat and relax'
    UNION ALL SELECT 'sport-en-leefstyl',           'Sport and lifestyle'
    UNION ALL SELECT 'fasiliteite',                 'Facilities'
    UNION ALL SELECT 'ontvangs-en-inligting',       'Reception and information'
    UNION ALL SELECT 'parkering-en-toeganklikheid', 'Parking and accessibility'
    UNION ALL SELECT 'badkamers',                   'Bathrooms'
    UNION ALL SELECT 'uitkykpunte',                 'Viewpoints'
) AS category_name ON category_name.slug = category.Slug
WHERE NOT EXISTS (
    SELECT 1 FROM translations AS existing
    WHERE existing.EntityType = 'MenuItem'
      AND existing.EntityId = menu_item.Id
      AND existing.FieldName = 'Label'
      AND existing.LanguageCode = 'en'
);

-- ---------------------------------------------------------------------------
-- VTM visitor information — REAL CONTENT, sourced from vtm.org.za
--
-- Loaded on top of vtm-sample.sql, which creates the tenant settings, categories
-- and points of interest this file's content items hang off. Run it after that one:
--
--   docker compose exec -T mariadb mariadb -uroot -p"$DB_ROOT_PASSWORD" webapp_base \
--     < scripts/seed/vtm-content.sql
--
-- Idempotent: keyed on Title, so re-running changes nothing that already exists.
--
-- WHY THIS EXISTS: Oom Paul's harness knows the persona; it knows nothing about this
-- site. The content indexer embeds every published, public item into
-- `content_embeddings`, and the MCP server serves those passages back to the harness
-- when a visitor asks something factual. Without real content here, the retrieval
-- tools return nothing and Oom Paul answers only from the model's own memory.
--
-- SOURCE AND ACCURACY: captured from vtm.org.za on 2026-09-18. Prices, times and
-- distances change — treat this as a snapshot to verify with VTM, not a contract.
-- Two figures need care:
--   * Opening times below are the ones the contact page states directly. The site
--     also advertises seasonal hours elsewhere (Sep–Apr 08:00–18:00, May–Aug
--     08:00–17:00), which do not agree with them. Confirm which governs before a
--     visitor is told.
--   * No email address is recorded here. The one on the site did not survive
--     capture intact, and a wrong address is worse than none.
-- ---------------------------------------------------------------------------

SET @now = UTC_TIMESTAMP();
SET @published = DATE_SUB(@now, INTERVAL 7 DAY);

-- --- Visitor information -----------------------------------------------------
-- Body carries the detail the chunker embeds; paragraphs are split on blank lines,
-- so each stays a retrievable unit rather than being cut mid-fact.
INSERT INTO content_items
    (CategoryId, AssetType, AssetReference, Title, Description, Body,
     PublishedAt, UnpublishedAt, EventStart, EventEnd, Recurrence,
     Visibility, VisibleToRoles, IsDeleted, CreatedAt)
SELECT
    category.Id, 0, NULL, seed.title, seed.description, seed.body,
    @published, NULL, NULL, NULL, '{"frequency":0,"dayOfWeek":null,"weekOfMonth":null}',
    0, '[]', 0, @now
FROM (
    SELECT 'ontvangs-en-inligting' AS slug,
           'Openingstye' AS title,
           'Wanneer die monument en die terrein oop is, en wanneer dit gesluit is.' AS description,
           CONCAT(
             'Die monument self is Maandag tot Sondag van 08:00 tot 17:30 oop. Die res van die terrein open vroeër, om 07:00, en sluit ook om 17:30.',
             '\n\n',
             'Die monument is elke jaar op 24 en 25 Desember, op 31 Desember en 1 Januarie, en op Goeie Vrydag gesluit.',
             '\n\n',
             'Besoekers moet by die hoofingang inkom en daarna by Ontvangs aanmeld.'
           ) AS body

    UNION ALL SELECT 'ontvangs-en-inligting',
           'Toegangsfooie',
           'Wat dit kos om die museum en die terrein te besoek, vir plaaslike en internasionale besoekers.',
           CONCAT(
             'Plaaslike besoekers (SADC): volwassenes 19 jaar en ouer betaal R250 per persoon. Kinders onder 18 en geregistreerde universiteitstudente betaal R130 — die eerste twee kinders is gratis. Pensioenarisse van 60 jaar en ouer betaal R130. Hierdie kaartjie sluit volle toegang tot die museum en die terrein in.',
             '\n\n',
             'Internasionale besoekers: volwassenes 19 jaar en ouer betaal R370 per persoon en kinders onder 18 betaal R180. Ook hierdie kaartjie sluit volle toegang tot die museum en die terrein in.',
             '\n\n',
             'Slegs buitelugaktiwiteite: volwassenes betaal R55 en kinders onder 18 betaal R35. Hierdie kaartjie gee toegang tot die terrein alleen — dit sluit nie die museum in nie.',
             '\n\n',
             'Bo en behalwe die kaartjie geld ''n erfenisheffing van R20 per voertuig vir parkering.',
             '\n\n',
             'Kaartjies wat vooraf aanlyn gekoop word, geniet ''n afslag op bogenoemde pryse.'
           )

    UNION ALL SELECT 'ontvangs-en-inligting',
           'Kontak en ligging',
           'Waar die Voortrekkermonument is en hoe om die terrein te kontak.',
           CONCAT(
             'Die Voortrekkermonument is in Eeufeeslaan, Groenkloof, Pretoria, 0027.',
             '\n\n',
             'Telefoon: +27 (0)12 326 6770. Dieselfde nommer hanteer navrae oor toere sowel as besprekings van geleenthede en lokale.',
             '\n\n',
             'Besoekers gebruik die hoofingang en meld daarna by Ontvangs aan, waar kaartjies, inligting en die vertrekpunt vir geleide toere is.'
           )

    UNION ALL SELECT 'geskiedenis',
           'Die Heldesaal en die marmerfries',
           'Die saal waar die verhaal van die Groot Trek in marmer uitgebeeld word.',
           CONCAT(
             'Die Heldesaal bevat 27 marmerfriespanele wat die verhaal van die Groot Trek uitbeeld. Dit word beskryf as die langste aaneenlopende friespanele ter wêreld.',
             '\n\n',
             'Die monument herdenk die Groot Trek van 1835, toe duisende mense die Kaapkolonie met al hulle besittings verlaat het op soek na vryheid.'
           )

    UNION ALL SELECT 'geskiedenis',
           'Die sarkofaag en die sonstraal op 16 Desember',
           'Hoe die lig elke jaar op 16 Desember presies om 12:00 op die sarkofaag val.',
           CONCAT(
             'Die sarkofaag is die middelpunt van die Sarkofaagsaal, onderin die monument.',
             '\n\n',
             'Elke jaar op 16 Desember skyn ''n sonstraal presies om 12:00 deur die opening in die boonste koepel van die monument en val op die middel van die sarkofaag. Die straal verlig die woorde "Ons vir jou, Suid-Afrika".'
           )

    UNION ALL SELECT 'geskiedenis',
           'Vrijheidsreis-museum',
           'Die interaktiewe museumuitstalling oor die pad van die Groot Trek tot die Republiek.',
           CONCAT(
             'Vrijheidsreis is ''n interaktiewe speel-en-leer-reis wat van die Groot Trek af loop tot waar Suid-Afrika ''n Republiek word en die Voortrekkermonument gebou word.',
             '\n\n',
             'Die uitstalling bevat historiese artefakte, kleimodelle, tapisserieë en skilderye. Onder die uitstalstukke is Sarel Cilliers se broek en ''n oorspronklike afskrif van die Retief-Dingaan-traktaat.'
           )

    UNION ALL SELECT 'geskiedenis',
           'Museums en uitstallings op die terrein',
           'Die ander museums, uitstallings en historiese plekke op die monumentterrein.',
           CONCAT(
             'Benewens die hoofmonument en Vrijheidsreis is daar verskeie ander plekke om te besoek: die Transvaalse Voortrekkermuseum, die Toekomsbou-museumteater, die Kruger-sterfkamer, die Erfenissentrum, die Pionierswerf en die Versoeningstuin.',
             '\n\n',
             'Fort Schanskop, ''n historiese fort op die terrein, is ook vir besoekers oop.',
             '\n\n',
             'Die Toekomsbou-museumteater bied teatervertonings sowel as ''n ontsnapkamer-aktiwiteit.'
           )

    UNION ALL SELECT 'sport-en-leefstyl',
           'Bergfietsroetes',
           'Vyf bergfietsroetes op die terrein, vir verskillende vlakke van fiksheid en ervaring.',
           CONCAT(
             'Daar is vyf bergfietsroetes wat verskillende vaardigheidsvlakke akkommodeer.',
             '\n\n',
             'Geel roete: 4,6 km met ''n klim van 96 m. Rooi roete: 4,2 km met ''n klim van 86 m. Wit roete: 4,8 km met ''n klim van 82 m. Grys roete: 17 km met ''n klim van 150 m. Swart roete: 3,8 km met ''n klim van 97 m.',
             '\n\n',
             'Vir padfietsryers en gesinne bied die teerpaaie op die terrein ''n veilige, gemaklike en skilderagtige omgewing.'
           )

    -- Not simply "Wandelroetes": vtm-sample.sql already carries a point of interest
    -- by that name, and this file keys on Title to stay idempotent, so a collision
    -- would silently drop these distances rather than insert them.
    UNION ALL SELECT 'sport-en-leefstyl',
           'Wandelroetes en hul afstande',
           'Vyf wandelroetes deur die natuur rondom die monument, met afstande.',
           CONCAT(
             'Daar is vyf uitgemerkte wandelroetes.',
             '\n\n',
             'Rooi roete: 3 km, met panoramiese uitsigte. Groen roete: 3 km, deur die tuine en gedenkplekke. Geel roete: 3,5 km, deur fynbosgebiede. Blou roete: 3,5 km, deur grasveld waar wild gesien kan word. Swart roete: 8 km, ''n drie-in-een-roete wat die ander kombineer.',
             '\n\n',
             'Die roetes loop deur inheemse natuur met uitsigte oor Pretoria.'
           )

    UNION ALL SELECT 'sport-en-leefstyl',
           'parkrun, buiteluggimnasium en perdry',
           'Gereelde en gratis aktiwiteite op die terrein, en wat perdry kos.',
           CONCAT(
             'parkrun vind weer by die Voortrekkermonument plaas: ''n gratis 5 km-parkrun op Saterdae tussen 08:00 en 10:00.',
             '\n\n',
             'Daar is ''n buiteluggimnasium op die terrein wat gratis gebruik kan word.',
             '\n\n',
             'Perdry word in sessies van een uur aangebied. Volwassenes betaal R200 en studente R150. Besprekings moet vooraf gemaak word.'
           )

    UNION ALL SELECT 'fasiliteite',
           'Lokale vir geleenthede',
           'Die lokale wat op die terrein bespreek kan word, en hoeveel mense elkeen hanteer.',
           CONCAT(
             'Die terrein bied ''n reeks lokale vir geleenthede. Die Kapel neem 80 mense en is ''n kliponstruktuur met houtsitplek, ''n bruidskamer en ''n klankstelsel. Die Fort Schanskop-amfiteater neem 200 tot 300 sittend, of 1 200 tot 1 500 staande.',
             '\n\n',
             'De Kroonkamer neem 100 mense en het ''n basiese kombuis, ''n kroeg en uitsig oor die stad. Die Voortrekkersaal neem 200 tot 250 mense en het ''n selfsorgkombuis, ''n verhoog, ''n kroegarea en braaigeriewe. Stokkiesdraai is ''n lapa vir 35 mense met ''n vuurmaakplek en braairooster.',
             '\n\n',
             'Die FAK-Liedjietuin neem 100 tot 150 mense in die tuin en 50 in die lapa, met ''n klein verhoog en ''n klimraam. Die Transvaalkamer neem 16 mense en het ''n klankstelsel vir vergaderings. Die Krugergalery neem 100 mense en het ''n kombuis, ''n klein verhoog en verskeie buitepleine. Blinkvosperd neem 80 mense en het braaigeriewe en ''n ruim grasperk.',
             '\n\n',
             'Die amfiteater self neem tot 30 000 mense, en die amfiteaterdak bied ruimte vir uitstallings vir tot 10 000 mense of 179 stalletjies, met kragtoevoer.',
             '\n\n',
             'Besprekings word by 012 326 6770 gedoen.'
           )

    UNION ALL SELECT 'fasiliteite',
           'Geriewe vir besoekers',
           'Parkering, badkamers, toeganklikheid en ander geriewe op die terrein.',
           CONCAT(
             'Daar is ruim parkering by die meeste plekke op die terrein. ''n Erfenisheffing van R20 per voertuig geld vir parkering.',
             '\n\n',
             'Badkamers is by die meeste lokale beskikbaar, en verskeie geriewe op die terrein is rolstoelvriendelik.',
             '\n\n',
             'Daar is restaurante en winkels op die terrein, sowel as piekniekplekke, wandelpaaie en koffiegeriewe.'
           )
) AS seed
JOIN categories AS category ON category.Slug = seed.slug
WHERE NOT EXISTS (SELECT 1 FROM content_items WHERE Title = seed.title);

-- --- English titles and descriptions ------------------------------------------
-- Bodies stay Afrikaans for now: a half-translated page reads worse than one that
-- falls back cleanly, and the retrieval index embeds the Afrikaans either way.
INSERT INTO translations
    (EntityType, EntityId, FieldName, LanguageCode, Value, IsDeleted, CreatedAt)
SELECT 'Content', item.Id, 'Title', 'en', seed.value, 0, @now
FROM (
    SELECT 'Openingstye' AS title, 'Opening times' AS value
    UNION ALL SELECT 'Toegangsfooie',                                'Entrance fees'
    UNION ALL SELECT 'Kontak en ligging',                            'Contact and location'
    UNION ALL SELECT 'Die Heldesaal en die marmerfries',             'The Hall of Heroes and the marble frieze'
    UNION ALL SELECT 'Die sarkofaag en die sonstraal op 16 Desember','The cenotaph and the 16 December sunray'
    UNION ALL SELECT 'Vrijheidsreis-museum',                         'Vrijheidsreis museum'
    UNION ALL SELECT 'Museums en uitstallings op die terrein',       'Museums and exhibitions on the grounds'
    UNION ALL SELECT 'Bergfietsroetes',                              'Mountain bike routes'
    UNION ALL SELECT 'Wandelroetes en hul afstande',                 'Walking trails and their distances'
    UNION ALL SELECT 'parkrun, buiteluggimnasium en perdry',         'parkrun, outdoor gym and horse riding'
    UNION ALL SELECT 'Lokale vir geleenthede',                       'Event venues'
    UNION ALL SELECT 'Geriewe vir besoekers',                        'Visitor amenities'
) AS seed
JOIN content_items AS item ON item.Title = seed.title
WHERE NOT EXISTS (
    SELECT 1 FROM translations AS existing
    WHERE existing.EntityType = 'Content'
      AND existing.EntityId = item.Id
      AND existing.FieldName = 'Title'
      AND existing.LanguageCode = 'en'
);

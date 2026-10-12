-- ============================================================
--  Ortol — schema del database (PostgreSQL 14+)
--  Documentazione: docs/DATABASE.md
-- ============================================================

BEGIN;

-- ---------- Tipi enumerati ----------
CREATE TYPE user_role             AS ENUM ('User', 'Admin');
CREATE TYPE soil_type             AS ENUM ('Sabbioso', 'MedioImpasto', 'Argilloso');
CREATE TYPE cultivation_type      AS ENUM ('Terra', 'Vaso');
CREATE TYPE care_type             AS ENUM ('Water', 'Fertilize', 'Harvest', 'Note');
CREATE TYPE container_suitability AS ENUM ('Ottima', 'Buona', 'Discreta', 'Sconsigliata');
CREATE TYPE relation_kind         AS ENUM ('Companion', 'Antagonist');

-- ---------- Utenti ----------
CREATE TABLE users (
    id              uuid         PRIMARY KEY,
    username        varchar(40)  NOT NULL,
    display_name    varchar(80)  NOT NULL,
    password_hash   varchar(200) NOT NULL,
    role            user_role    NOT NULL DEFAULT 'User',
    disabled        boolean      NOT NULL DEFAULT false,
    security_stamp  varchar(32)  NOT NULL,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    last_login_at   timestamptz,
    CONSTRAINT ck_users_username CHECK (char_length(username) BETWEEN 3 AND 40)
);
CREATE UNIQUE INDEX ux_users_username ON users (lower(username));

-- ---------- Clima (cache delle normali) ----------
CREATE TABLE climate_profiles (
    id                       uuid          PRIMARY KEY,
    lat_key                  numeric(6,2)  NOT NULL,
    lon_key                  numeric(6,2)  NOT NULL,
    source                   varchar(120)  NOT NULL,
    period                   varchar(20)   NOT NULL,
    estimated                boolean       NOT NULL DEFAULT false,
    last_spring_frost_doy    smallint      CHECK (last_spring_frost_doy BETWEEN 1 AND 366),
    first_autumn_frost_doy   smallint      CHECK (first_autumn_frost_doy BETWEEN 1 AND 366),
    frost_free_days          smallint      NOT NULL CHECK (frost_free_days BETWEEN 0 AND 366),
    annual_precipitation_mm  numeric(6,1)  NOT NULL,
    annual_mean_temp_c       numeric(4,1)  NOT NULL,
    computed_at              timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT uq_climate_location UNIQUE (lat_key, lon_key)
);

CREATE TABLE climate_monthly (
    climate_profile_id  uuid          NOT NULL REFERENCES climate_profiles(id) ON DELETE CASCADE,
    month               smallint      NOT NULL CHECK (month BETWEEN 1 AND 12),
    t_max_c             numeric(4,1)  NOT NULL,
    t_min_c             numeric(4,1)  NOT NULL,
    t_mean_c            numeric(4,1)  NOT NULL,
    precipitation_mm    numeric(5,1)  NOT NULL,
    et0_mm              numeric(5,1)  NOT NULL,
    frost_days          numeric(4,1)  NOT NULL,
    hot_days            numeric(4,1)  NOT NULL,
    PRIMARY KEY (climate_profile_id, month)
);

-- ---------- Orti ----------
CREATE TABLE gardens (
    id                  uuid              PRIMARY KEY,
    owner_id            uuid              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    climate_profile_id  uuid              REFERENCES climate_profiles(id) ON DELETE SET NULL,
    name                varchar(100)      NOT NULL,
    city                varchar(100)      NOT NULL,
    region              varchar(100),
    country             varchar(100),
    latitude            numeric(8,5)      NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude           numeric(8,5)      NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    elevation_m         numeric(6,1),
    soil                soil_type         NOT NULL DEFAULT 'MedioImpasto',
    cultivation         cultivation_type  NOT NULL DEFAULT 'Terra',
    width_m             numeric(6,2)      NOT NULL CHECK (width_m BETWEEN 0.2 AND 200),
    length_m            numeric(6,2)      NOT NULL CHECK (length_m BETWEEN 0.2 AND 200),
    created_at          timestamptz       NOT NULL DEFAULT now()
);
CREATE INDEX ix_gardens_owner ON gardens (owner_id);

-- ---------- Lotti / vasi ----------
CREATE TABLE lots (
    id         uuid          PRIMARY KEY,
    garden_id  uuid          NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
    name       varchar(60)   NOT NULL,
    x_m        numeric(6,3)  NOT NULL CHECK (x_m >= 0),
    y_m        numeric(6,3)  NOT NULL CHECK (y_m >= 0),
    width_m    numeric(6,3)  NOT NULL CHECK (width_m >= 0.1),
    length_m   numeric(6,3)  NOT NULL CHECK (length_m >= 0.1),
    depth_cm   numeric(5,1)  CHECK (depth_cm BETWEEN 5 AND 150)
);
CREATE INDEX ix_lots_garden ON lots (garden_id);
-- Confini dell'orto e assenza di sovrapposizioni: verificati dall'applicazione.

-- ---------- Catalogo specie ----------
CREATE TABLE plant_species (
    id                         varchar(40)   PRIMARY KEY,
    name                       varchar(80)   NOT NULL,
    scientific_name            varchar(120)  NOT NULL,
    family                     varchar(60)   NOT NULL,
    category                   varchar(30)   NOT NULL,
    emoji                      varchar(8)    NOT NULL,
    description                text          NOT NULL,
    lifecycle                  varchar(60)   NOT NULL,
    -- messa a dimora
    planting_method            varchar(60)   NOT NULL,
    planting_temp_min_c        numeric(4,1)  NOT NULL,
    planting_temp_max_c        numeric(4,1)  NOT NULL,
    sowing_depth_cm            numeric(4,1),
    spacing_row_cm             smallint      NOT NULL CHECK (spacing_row_cm > 0),
    spacing_plant_cm           smallint      NOT NULL CHECK (spacing_plant_cm > 0),
    -- temperature
    germ_min_c                 numeric(4,1)  NOT NULL,
    germ_opt_c                 numeric(4,1)  NOT NULL,
    base_gdd_c                 numeric(4,1)  NOT NULL,
    growth_min_c               numeric(4,1)  NOT NULL,
    opt_min_c                  numeric(4,1)  NOT NULL,
    opt_max_c                  numeric(4,1)  NOT NULL,
    growth_max_c               numeric(4,1)  NOT NULL,
    frost_tender               boolean       NOT NULL,
    min_survival_c             numeric(4,1)  NOT NULL,
    -- ciclo
    gdd_to_maturity            numeric(6,1)  NOT NULL CHECK (gdd_to_maturity > 0),
    days_to_maturity           smallint      NOT NULL CHECK (days_to_maturity > 0),
    harvest_window_days        smallint      NOT NULL,
    continuous_harvest         boolean       NOT NULL,
    needs_vernalization        boolean       NOT NULL,
    -- acqua (FAO-56)
    kc_ini                     numeric(3,2)  NOT NULL,
    kc_mid                     numeric(3,2)  NOT NULL,
    kc_end                     numeric(3,2)  NOT NULL,
    stage_ini_days             smallint      NOT NULL,
    stage_dev_days             smallint      NOT NULL,
    stage_mid_days             smallint      NOT NULL,
    stage_late_days            smallint      NOT NULL,
    root_depth_min_m           numeric(3,2)  NOT NULL,
    root_depth_max_m           numeric(3,2)  NOT NULL,
    depletion_fraction         numeric(3,2)  NOT NULL CHECK (depletion_fraction > 0 AND depletion_fraction < 1),
    water_notes                text,
    -- suolo
    ph_min                     numeric(3,1)  NOT NULL,
    ph_max                     numeric(3,1)  NOT NULL,
    sun                        varchar(60)   NOT NULL,
    soil_notes                 text,
    -- concimazione
    nutrient_demand            varchar(20)   NOT NULL,
    fert_start_after_days      smallint      NOT NULL,
    fert_interval_days         smallint      NOT NULL CHECK (fert_interval_days >= 0),
    fert_stop_before_end_days  smallint      NOT NULL,
    fert_vegetative            text,
    fert_reproductive          text,
    fert_organic               text,
    -- raccolta e resa
    harvest_signs              text,
    harvest_tips               text,
    yield_kg_m2                numeric(4,2)  NOT NULL CHECK (yield_kg_m2 >= 0),
    -- vaso
    container_suitability      container_suitability NOT NULL,
    container_min_liters       numeric(5,1)  NOT NULL,
    container_min_depth_cm     numeric(4,1)  NOT NULL,
    container_notes            text,
    CONSTRAINT ck_species_opt    CHECK (opt_min_c <= opt_max_c),
    CONSTRAINT ck_species_growth CHECK (growth_min_c <= growth_max_c),
    CONSTRAINT ck_species_ph     CHECK (ph_min <= ph_max)
);

CREATE TABLE species_relations (
    species_id          varchar(40)    NOT NULL REFERENCES plant_species(id) ON DELETE CASCADE,
    related_name        varchar(60)    NOT NULL,
    kind                relation_kind  NOT NULL,
    related_species_id  varchar(40)    REFERENCES plant_species(id) ON DELETE SET NULL,
    PRIMARY KEY (species_id, related_name, kind)
);

CREATE TABLE species_pests (
    species_id  varchar(40)   NOT NULL REFERENCES plant_species(id) ON DELETE CASCADE,
    position    smallint      NOT NULL,
    name        varchar(120)  NOT NULL,
    PRIMARY KEY (species_id, position)
);

CREATE TABLE species_tips (
    species_id  varchar(40)  NOT NULL REFERENCES plant_species(id) ON DELETE CASCADE,
    position    smallint     NOT NULL,
    tip         text         NOT NULL,
    PRIMARY KEY (species_id, position)
);

-- ---------- Colture ----------
CREATE TABLE crops (
    id          uuid          PRIMARY KEY,
    garden_id   uuid          NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
    lot_id      uuid          REFERENCES lots(id) ON DELETE SET NULL,
    species_id  varchar(40)   NOT NULL REFERENCES plant_species(id) ON DELETE RESTRICT,
    label       varchar(100),
    quantity    integer       NOT NULL DEFAULT 1 CHECK (quantity > 0),
    planted_on  date          NOT NULL,
    active      boolean       NOT NULL DEFAULT true,
    ended_on    date,
    notes       text,
    CONSTRAINT ck_crops_ended CHECK (ended_on IS NULL OR ended_on >= planted_on)
);
CREATE INDEX ix_crops_garden_active ON crops (garden_id, active);
-- al massimo una coltura attiva per lotto
CREATE UNIQUE INDEX ux_crops_active_lot ON crops (lot_id) WHERE active AND lot_id IS NOT NULL;

-- ---------- Registro operazioni ----------
CREATE TABLE care_logs (
    id          uuid          PRIMARY KEY,
    crop_id     uuid          NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    type        care_type     NOT NULL,
    log_date    date          NOT NULL,
    amount      numeric(8,2)  CHECK (amount IS NULL OR amount >= 0),
    note        text,
    created_at  timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX ix_care_logs_crop_recent ON care_logs (crop_id, log_date DESC, created_at DESC);

COMMIT;

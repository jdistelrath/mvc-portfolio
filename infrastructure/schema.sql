-- ============================================================================
-- MVC Portfolio Management — Aurora Serverless v2 PostgreSQL Schema
-- Multi-tenant SaaS from day one
-- ============================================================================

-- gen_random_uuid() is built into Postgres 16, no extension needed

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE membership_level AS ENUM (
  'Explorer', 'Silver', 'Gold', 'Platinum', 'Presidential', 'Chairman''s Club'
);

CREATE TYPE member_role AS ENUM ('admin', 'member', 'viewer');

CREATE TYPE contract_type AS ENUM ('week', 'trust');

CREATE TYPE contract_flag AS ENUM ('ok', 'expire', 'warn');

CREATE TYPE contract_year_status AS ENUM ('Available', 'OCCUPY', 'Elected');

CREATE TYPE resort_region AS ENUM (
  'hawaii', 'florida', 'arizona', 'california', 'nevada',
  'colorado', 'southeast', 'northeast', 'international'
);

CREATE TYPE unit_type AS ENUM ('studio', '1br', '2br', '3br');

CREATE TYPE season_tier AS ENUM ('low', 'mid', 'peak', 'holiday');

CREATE TYPE trip_status AS ENUM ('planned', 'booked', 'checked_in', 'completed', 'cancelled');

CREATE TYPE block_type AS ENUM ('personal', 'rental');

CREATE TYPE point_movement AS ENUM (
  'annual_allocation',
  'use',
  'bank',
  'borrow',
  'expire',
  'rental_allocation',
  'rental_return',
  'hold',
  'adjustment'
);

CREATE TYPE rental_listing_status AS ENUM (
  'draft', 'active', 'booked', 'confirmed', 'completed', 'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'authorized', 'captured', 'refunded', 'failed'
);

CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system', 'tool');

-- ============================================================================
-- ACCOUNTS & MEMBERS
-- ============================================================================

CREATE TABLE accounts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text UNIQUE NOT NULL,
  name               text NOT NULL,
  membership_level   membership_level NOT NULL DEFAULT 'Explorer',
  stripe_customer_id text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text,
  initials    varchar(3) NOT NULL,
  color       varchar(7) NOT NULL DEFAULT '#93c5fd',
  role        member_role NOT NULL DEFAULT 'member',
  auth_sub    text UNIQUE,                     -- Cognito subject ID
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_members_account ON members(account_id);
CREATE UNIQUE INDEX idx_members_auth_sub ON members(auth_sub) WHERE auth_sub IS NOT NULL;

-- ============================================================================
-- RESORTS (global reference data — NOT tenant-scoped)
-- ============================================================================

CREATE TABLE resorts (
  id                  text PRIMARY KEY,          -- slug, e.g. 'maui-ocean-club-original'
  name                text NOT NULL,
  location            text NOT NULL,
  region              resort_region NOT NULL,
  unit_types          unit_type[] NOT NULL,
  available_via_trust boolean NOT NULL DEFAULT true,
  exchange_only       boolean NOT NULL DEFAULT false,
  notes               text DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_resorts_region ON resorts(region);

-- Point costs per season tier (optionally per unit type)
CREATE TABLE resort_point_costs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id   text NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  season      season_tier NOT NULL,
  points_cost integer NOT NULL CHECK (points_cost > 0),
  unit_type   unit_type,                       -- null = default/2br
  UNIQUE (resort_id, season, unit_type)
);

CREATE INDEX idx_rpc_resort ON resort_point_costs(resort_id);

-- Market rental rates (versioned by effective_date so history is preserved)
CREATE TABLE resort_market_rates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id      text NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  rate_low       numeric(10,2) NOT NULL,
  rate_avg       numeric(10,2) NOT NULL,
  rate_peak      numeric(10,2) NOT NULL,
  source         text NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (resort_id, effective_date)
);

CREATE INDEX idx_rmr_resort ON resort_market_rates(resort_id);

-- Monthly demand scores (1-10, Jan=1 through Dec=12)
CREATE TABLE resort_demand (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id    text NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  month        smallint NOT NULL CHECK (month >= 1 AND month <= 12),
  demand_score smallint NOT NULL CHECK (demand_score >= 1 AND demand_score <= 10),
  UNIQUE (resort_id, month)
);

CREATE INDEX idx_rd_resort ON resort_demand(resort_id);

-- ============================================================================
-- CONTRACTS (unified week + trust)
-- ============================================================================

CREATE TABLE contracts (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id             uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  external_id            text NOT NULL,          -- Marriott ID, e.g. 'MU*9203*24*B'
  contract_type          contract_type NOT NULL,
  name                   text NOT NULL,
  points                 integer NOT NULL CHECK (points > 0),
  annual_fee             numeric(10,2),
  fee_confirmed          boolean NOT NULL DEFAULT false,

  -- Week-specific (null for trust)
  resort_id              text REFERENCES resorts(id),
  location               text,
  floor_plan             text,
  season                 text,
  seasonal_demand        smallint[12],

  -- Trust-specific (null for week)
  expiry_date            date,
  flag                   contract_flag DEFAULT 'ok',

  -- Market rate estimates
  market_low             numeric(10,2),
  market_high            numeric(10,2),
  market_note            text,
  default_rate_per_point numeric(6,4),

  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_account ON contracts(account_id);
CREATE UNIQUE INDEX idx_contracts_external ON contracts(account_id, external_id);
CREATE INDEX idx_contracts_type ON contracts(account_id, contract_type);

-- Per-year status for week contracts
CREATE TABLE contract_year_statuses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  use_year    smallint NOT NULL CHECK (use_year >= 2018 AND use_year <= 2050),
  status      contract_year_status NOT NULL DEFAULT 'Available',
  UNIQUE (contract_id, use_year)
);

CREATE INDEX idx_cys_account_year ON contract_year_statuses(account_id, use_year);

-- ============================================================================
-- POINTS LEDGER (append-only journal)
-- ============================================================================

CREATE TABLE points_ledger (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contract_id    uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  use_year       smallint NOT NULL CHECK (use_year >= 2018 AND use_year <= 2050),
  movement_type  point_movement NOT NULL,
  amount         integer NOT NULL,               -- positive = credit, negative = debit
  description    text,
  reference_type text,                           -- 'trip', 'rental_listing', etc.
  reference_id   uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES members(id)
);

CREATE INDEX idx_pl_account_year ON points_ledger(account_id, use_year);
CREATE INDEX idx_pl_contract_year ON points_ledger(contract_id, use_year);
CREATE INDEX idx_pl_type ON points_ledger(account_id, movement_type);
CREATE INDEX idx_pl_reference ON points_ledger(reference_type, reference_id)
  WHERE reference_id IS NOT NULL;

-- Materialized view for fast balance lookups
CREATE MATERIALIZED VIEW point_balances AS
SELECT
  account_id,
  contract_id,
  use_year,
  SUM(amount) AS balance,
  SUM(amount) FILTER (WHERE movement_type = 'annual_allocation') AS allocated,
  SUM(amount) FILTER (WHERE movement_type = 'use') AS used,
  SUM(amount) FILTER (WHERE movement_type = 'bank') AS banked,
  SUM(amount) FILTER (WHERE movement_type = 'borrow') AS borrowed,
  SUM(amount) FILTER (WHERE movement_type = 'hold') AS on_hold,
  SUM(amount) FILTER (WHERE movement_type = 'rental_allocation') AS rental_allocated,
  SUM(amount) FILTER (WHERE movement_type = 'expire') AS expired
FROM points_ledger
GROUP BY account_id, contract_id, use_year;

CREATE UNIQUE INDEX idx_pb_unique ON point_balances(account_id, contract_id, use_year);
CREATE INDEX idx_pb_account_year ON point_balances(account_id, use_year);

-- ============================================================================
-- YEARLY ALLOCATIONS
-- ============================================================================

CREATE TABLE yearly_allocations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  use_year          smallint NOT NULL,
  elected_pts       integer NOT NULL DEFAULT 0,
  primary_trust_pts integer NOT NULL DEFAULT 0,
  legacy_trust_pts  integer NOT NULL DEFAULT 0,
  total_pts         integer NOT NULL DEFAULT 0,
  recurring_total   integer NOT NULL DEFAULT 0,
  note              text,
  UNIQUE (account_id, use_year)
);

CREATE INDEX idx_ya_account ON yearly_allocations(account_id, use_year);

-- ============================================================================
-- TRIPS & RESERVATIONS
-- ============================================================================

CREATE TABLE trips (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  guest_member_id       uuid REFERENCES members(id),
  guest_name            text,
  resort_id             text REFERENCES resorts(id),
  resort_name           text,                    -- denormalized for display
  check_in              date,
  check_out             date,
  month                 varchar(3),              -- for planning before dates are set
  use_year              smallint NOT NULL,
  points_cost           integer NOT NULL DEFAULT 0,
  status                trip_status NOT NULL DEFAULT 'planned',
  confirmation_number   text,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trips_account_year ON trips(account_id, use_year);
CREATE INDEX idx_trips_resort ON trips(resort_id) WHERE resort_id IS NOT NULL;
CREATE INDEX idx_trips_status ON trips(account_id, status);
CREATE INDEX idx_trips_dates ON trips(account_id, check_in, check_out)
  WHERE check_in IS NOT NULL;

-- ============================================================================
-- HISTORICAL TRIPS (imported, immutable reference)
-- ============================================================================

CREATE TABLE historical_trips (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  label       text NOT NULL,
  member_id   uuid REFERENCES members(id),
  member_tag  text NOT NULL,                     -- 'dave', 'sarah', 'jim', 'rental'
  resort_name text,
  resort_id   text REFERENCES resorts(id),
  points_used integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ht_account ON historical_trips(account_id);
CREATE INDEX idx_ht_dates ON historical_trips(account_id, start_date);

-- ============================================================================
-- SCHEDULE BLOCKS (multi-member per day)
-- ============================================================================

-- One row per member per day — multiple members on the same day = multiple rows
CREATE TABLE schedule_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  block_date  date NOT NULL,
  member_id   uuid NOT NULL REFERENCES members(id),
  block_type  block_type NOT NULL,
  trip_id     uuid REFERENCES trips(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, block_date, member_id)
);

CREATE INDEX idx_sb_account_date ON schedule_blocks(account_id, block_date);
CREATE INDEX idx_sb_member ON schedule_blocks(member_id, block_date);

-- ============================================================================
-- RENTAL LISTINGS, BOOKINGS & PAYMENTS
-- ============================================================================

CREATE TABLE rental_listings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contract_id       uuid NOT NULL REFERENCES contracts(id),
  resort_id         text REFERENCES resorts(id),
  use_year          smallint NOT NULL,
  points_allocated  integer NOT NULL,
  rate_per_point    numeric(6,4) NOT NULL,
  listing_price     numeric(10,2) NOT NULL,
  check_in          date,
  check_out         date,
  unit_description  text,
  status            rental_listing_status NOT NULL DEFAULT 'draft',
  published_at      timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rl_account ON rental_listings(account_id);
CREATE INDEX idx_rl_account_status ON rental_listings(account_id, status);
CREATE INDEX idx_rl_resort ON rental_listings(resort_id) WHERE resort_id IS NOT NULL;
CREATE INDEX idx_rl_year ON rental_listings(account_id, use_year);

CREATE TABLE rental_bookings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id            uuid NOT NULL REFERENCES rental_listings(id),
  account_id            uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  renter_name           text NOT NULL,
  renter_email          text,
  renter_phone          text,
  agreed_price          numeric(10,2) NOT NULL,
  check_in              date NOT NULL,
  check_out             date NOT NULL,
  confirmation_number   text,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rb_listing ON rental_bookings(listing_id);
CREATE INDEX idx_rb_account ON rental_bookings(account_id);

CREATE TABLE rental_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES rental_bookings(id),
  account_id      uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount          numeric(10,2) NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  payment_method  text,
  external_txn_id text,
  paid_at         timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rp_booking ON rental_payments(booking_id);
CREATE INDEX idx_rp_account ON rental_payments(account_id);
CREATE INDEX idx_rp_status ON rental_payments(account_id, status);

-- ============================================================================
-- CONTRACT RENTAL SETTINGS
-- ============================================================================

CREATE TABLE contract_rental_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contract_id         uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  available_to_rent   boolean NOT NULL DEFAULT false,
  rate_per_point      numeric(6,4) NOT NULL DEFAULT 0.55,
  trust_pts_allocated integer NOT NULL DEFAULT 0,
  UNIQUE (account_id, contract_id)
);

CREATE INDEX idx_crs_account ON contract_rental_settings(account_id);

-- ============================================================================
-- OPTIMIZER SETTINGS
-- ============================================================================

CREATE TABLE optimizer_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  coverage_pct      smallint NOT NULL DEFAULT 100 CHECK (coverage_pct BETWEEN 0 AND 200),
  listing_price_pct smallint NOT NULL DEFAULT 68 CHECK (listing_price_pct BETWEEN 0 AND 100),
  min_personal_pts  integer NOT NULL DEFAULT 8000,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- ARBITRAGE TARGETS
-- ============================================================================

CREATE TABLE arbitrage_targets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  resort_id     text NOT NULL REFERENCES resorts(id),
  points_needed integer NOT NULL,
  market_low    numeric(10,2) NOT NULL,
  market_high   numeric(10,2) NOT NULL,
  ev_per_point  numeric(6,4) NOT NULL,
  note          text,
  use_year      smallint,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_at_account ON arbitrage_targets(account_id);
CREATE INDEX idx_at_yield ON arbitrage_targets(ev_per_point DESC) WHERE is_active = true;

-- ============================================================================
-- CHAT SESSIONS & MESSAGES
-- ============================================================================

CREATE TABLE chat_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES members(id),
  title       text,
  model       text DEFAULT 'claude-sonnet-4-20250514',
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cs_account ON chat_sessions(account_id);
CREATE INDEX idx_cs_member ON chat_sessions(member_id, created_at DESC);

CREATE TABLE chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role        chat_role NOT NULL,
  content     text NOT NULL,
  tool_name   text,
  tool_input  jsonb,
  tool_output jsonb,
  token_count integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cm_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_cm_account ON chat_messages(account_id);

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ============================================================================
-- The app sets current_setting('app.current_account_id') on each DB connection.
-- Global tables (resorts, resort_point_costs, resort_market_rates, resort_demand)
-- are readable by all — no RLS.

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_year_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE yearly_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_rental_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimizer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE arbitrage_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY account_isolation ON accounts
  USING (id = current_setting('app.current_account_id')::uuid);

CREATE POLICY tenant_isolation ON members
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON contracts
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON contract_year_statuses
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON points_ledger
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON yearly_allocations
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON trips
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON historical_trips
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON schedule_blocks
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON rental_listings
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON rental_bookings
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON rental_payments
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON contract_rental_settings
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON optimizer_settings
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON arbitrage_targets
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON chat_sessions
  USING (account_id = current_setting('app.current_account_id')::uuid);
CREATE POLICY tenant_isolation ON chat_messages
  USING (account_id = current_setting('app.current_account_id')::uuid);

-- App roles
CREATE ROLE app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Admin bypasses RLS for cross-tenant analytics
CREATE ROLE app_admin BYPASSRLS;
GRANT app_user TO app_admin;

-- ============================================================================
-- AUTO-UPDATE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'accounts', 'members', 'contracts', 'resorts', 'trips',
      'rental_listings', 'rental_bookings', 'rental_payments',
      'chat_sessions', 'optimizer_settings', 'arbitrage_targets'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================================
-- ANALYTICS VIEWS (admin-only, bypasses RLS)
-- ============================================================================

-- Popular resorts across all tenants
CREATE VIEW analytics_resort_popularity AS
SELECT
  t.resort_id,
  r.name AS resort_name,
  r.region,
  COUNT(*) AS total_bookings,
  SUM(t.points_cost) AS total_points_used,
  COUNT(DISTINCT t.account_id) AS unique_accounts
FROM trips t
JOIN resorts r ON r.id = t.resort_id
WHERE t.status IN ('booked', 'completed')
GROUP BY t.resort_id, r.name, r.region
ORDER BY total_bookings DESC;

-- Aggregate rental revenue
CREATE VIEW analytics_rental_revenue AS
SELECT
  DATE_TRUNC('month', rp.paid_at) AS month,
  COUNT(DISTINCT rb.id) AS bookings,
  SUM(rp.amount) AS total_revenue,
  AVG(rp.amount) AS avg_booking_value,
  COUNT(DISTINCT rb.account_id) AS active_accounts
FROM rental_payments rp
JOIN rental_bookings rb ON rb.id = rp.booking_id
WHERE rp.status = 'captured'
GROUP BY DATE_TRUNC('month', rp.paid_at)
ORDER BY month DESC;

-- Resort yield rankings (latest market rates vs point costs)
CREATE VIEW resort_yield_rankings AS
SELECT
  r.id AS resort_id,
  r.name,
  r.region,
  rmr.rate_low,
  rmr.rate_avg,
  rmr.rate_peak,
  rpc_low.points_cost AS pts_low,
  rpc_mid.points_cost AS pts_mid,
  rpc_peak.points_cost AS pts_peak,
  CASE WHEN rpc_peak.points_cost > 0
    THEN rmr.rate_peak / rpc_peak.points_cost ELSE 0 END AS yield_peak,
  CASE WHEN rpc_mid.points_cost > 0
    THEN rmr.rate_avg / rpc_mid.points_cost ELSE 0 END AS yield_avg,
  CASE WHEN rpc_low.points_cost > 0
    THEN rmr.rate_low / rpc_low.points_cost ELSE 0 END AS yield_low
FROM resorts r
LEFT JOIN LATERAL (
  SELECT * FROM resort_market_rates
  WHERE resort_id = r.id ORDER BY effective_date DESC LIMIT 1
) rmr ON true
LEFT JOIN resort_point_costs rpc_low
  ON rpc_low.resort_id = r.id AND rpc_low.season = 'low' AND rpc_low.unit_type IS NULL
LEFT JOIN resort_point_costs rpc_mid
  ON rpc_mid.resort_id = r.id AND rpc_mid.season = 'mid' AND rpc_mid.unit_type IS NULL
LEFT JOIN resort_point_costs rpc_peak
  ON rpc_peak.resort_id = r.id AND rpc_peak.season = 'peak' AND rpc_peak.unit_type IS NULL
ORDER BY yield_peak DESC;

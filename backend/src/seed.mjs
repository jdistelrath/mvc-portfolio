/**
 * Seed script: populates Aurora Serverless v2 from static data files.
 * Run with: DB_CLUSTER_ARN=xxx DB_SECRET_ARN=xxx node src/seed.mjs
 */
import { execute, query, param } from './lib/db.mjs'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read the compiled TypeScript data — we'll parse it manually from the TS source
// For simplicity, we hardcode the seed data here matching portfolio.ts

async function run() {
  console.log('Running schema...')
  const schema = readFileSync(resolve(__dirname, '../../infrastructure/schema.sql'), 'utf8')
  // Split on semicolons but skip empty statements and the DO $$ blocks
  const statements = schema
    .split(/;(?=\s*(?:CREATE|ALTER|GRANT|DO|\s*$))/gm)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const stmt of statements) {
    try {
      await execute(stmt)
    } catch (err) {
      // Skip errors from enums/types already existing, etc.
      if (!err.message?.includes('already exists') && !err.message?.includes('does not exist')) {
        console.warn('Statement warning:', err.message?.substring(0, 120))
      }
    }
  }
  console.log('Schema applied.')

  // ── Account ──
  console.log('Seeding account...')
  await execute(`INSERT INTO accounts (id, slug, name, membership_level) VALUES (:id, 'distelrath', 'Distelrath', 'Chairman''s Club') ON CONFLICT (slug) DO NOTHING`,
    [param('id', process.env.ACCOUNT_ID || '00000000-0000-0000-0000-000000000001')])

  const ACCT = process.env.ACCOUNT_ID || '00000000-0000-0000-0000-000000000001'

  // ── Members ──
  const members = [
    { id: '00000000-0000-0000-0000-000000000010', name: 'Dave', initials: 'DD', color: '#93c5fd', role: 'admin' },
    { id: '00000000-0000-0000-0000-000000000011', name: 'Sarah', initials: 'SD', color: '#f9a8d4', role: 'member' },
    { id: '00000000-0000-0000-0000-000000000012', name: 'Jim', initials: 'JD', color: '#fcd34d', role: 'member' },
  ]
  for (const m of members) {
    await execute(
      `INSERT INTO members (id, account_id, name, initials, color, role) VALUES (:id, :acct, :name, :initials, :color, :role::member_role) ON CONFLICT (id) DO NOTHING`,
      [param('id', m.id), param('acct', ACCT), param('name', m.name), param('initials', m.initials), param('color', m.color), param('role', m.role)]
    )
  }
  console.log('Members seeded.')

  // ── Week Contracts ──
  console.log('Seeding contracts...')
  const weekContracts = [
    { ext: 'MU*9203*24*B', name: 'Maui Ocean Club', loc: 'Lahaina, Maui, HI', pts: 6625, fee: 3802.68, floor: '2BR Ocean View', season: 'Platinum', status2027: 'Available', seasonal: [9,9,10,9,5,7,8,7,4,5,7,10], mktLow: 6000, mktHigh: 12000, mktNote: 'RedWeek Apr 2026: $7,850/wk', rate: 1.13 },
    { ext: 'CV*3109*46*B', name: 'Canyon Villas A', loc: 'Scottsdale, AZ', pts: 2950, fee: 2128.14, floor: '2BR', season: 'Platinum', status2027: 'Available', seasonal: [10,9,8,7,3,2,2,2,4,6,6,7], mktLow: 1500, mktHigh: 6000, mktNote: 'Peak: Barrett-Jackson (Jan), PGA (Feb)', rate: 0.51 },
    { ext: 'CV*3259*50*B', name: 'Canyon Villas B', loc: 'Scottsdale, AZ', pts: 2950, fee: 2128.14, floor: '2BR', season: 'Platinum', status2027: 'Available', seasonal: [10,9,8,7,3,2,2,2,4,6,6,7], mktLow: 1500, mktHigh: 6000, mktNote: 'Peak: Barrett-Jackson (Jan), PGA (Feb)', rate: 0.51 },
    { ext: 'PS*5320*06*B', name: 'Ocean Pointe A', loc: 'Palm Beach Shores, FL', pts: 4325, fee: 2923.18, floor: '2BR Ocean Side', season: 'Platinum', status2027: 'OCCUPY', seasonal: [8,8,9,7,7,8,8,7,5,6,8,9], mktLow: 2500, mktHigh: 5000, mktNote: 'RedWeek from $142/nt', rate: 0.69 },
    { ext: 'PS*8116*10*B', name: 'Ocean Pointe B', loc: 'Palm Beach Shores, FL', pts: 4325, fee: 2923.18, floor: '2BR Ocean Side', season: 'Platinum', status2027: 'OCCUPY', seasonal: [8,8,9,7,7,8,8,7,5,6,8,9], mktLow: 2500, mktHigh: 5000, mktNote: 'RedWeek from $142/nt', rate: 0.69 },
  ]

  for (const c of weekContracts) {
    const result = await query(
      `INSERT INTO contracts (account_id, external_id, contract_type, name, points, annual_fee, fee_confirmed, location, floor_plan, season, seasonal_demand, market_low, market_high, market_note, default_rate_per_point)
       VALUES (:acct, :ext, 'week', :name, :pts, :fee, true, :loc, :floor, :season, :seasonal::smallint[], :mktLow, :mktHigh, :mktNote, :rate)
       ON CONFLICT (account_id, external_id) DO NOTHING RETURNING id`,
      [param('acct', ACCT), param('ext', c.ext), param('name', c.name), param('pts', c.pts), param('fee', c.fee), param('loc', c.loc), param('floor', c.floor), param('season', c.season), param('seasonal', '{' + c.seasonal.join(',') + '}'), param('mktLow', c.mktLow), param('mktHigh', c.mktHigh), param('mktNote', c.mktNote), param('rate', c.rate)]
    )

    // Set 2027 status
    if (result.length > 0) {
      await execute(
        `INSERT INTO contract_year_statuses (contract_id, account_id, use_year, status) VALUES (:cid, :acct, 2027, :status::contract_year_status) ON CONFLICT DO NOTHING`,
        [param('cid', result[0].id), param('acct', ACCT), param('status', c.status2027)]
      )
    }
  }

  // ── Trust Contracts ──
  const trustContracts = [
    { ext: '10609899', name: 'MVCD Trust 2026', pts: 11750, fee: 9893.90, expiry: '2026-12-31', flag: 'expire', mktNote: 'Varies by resort booked', rate: 0.55 },
    { ext: '10648719', name: 'MVCD Trust 2027', pts: 11750, fee: null, expiry: null, flag: 'ok', mktNote: 'Starts 1/1/2027', rate: 0.55 },
    { ext: '1348954', name: 'MVCD Trust (legacy)', pts: 1500, fee: null, expiry: '2026-12-31', flag: 'expire', mktNote: 'Expires 12/31/2026', rate: 0.45 },
    { ext: '1673690', name: 'MVCD Trust (legacy)', pts: 2250, fee: null, expiry: null, flag: 'warn', mktNote: 'Invalid expiry date', rate: 0.45 },
    { ext: '1753382', name: 'MVCD Trust (legacy)', pts: 3000, fee: null, expiry: null, flag: 'warn', mktNote: 'Invalid expiry date', rate: 0.45 },
  ]

  for (const t of trustContracts) {
    await execute(
      `INSERT INTO contracts (account_id, external_id, contract_type, name, points, annual_fee, fee_confirmed, expiry_date, flag, market_note, default_rate_per_point)
       VALUES (:acct, :ext, 'trust', :name, :pts, :fee, :confirmed, :expiry::date, :flag::contract_flag, :mktNote, :rate)
       ON CONFLICT (account_id, external_id) DO NOTHING`,
      [param('acct', ACCT), param('ext', t.ext), param('name', t.name), param('pts', t.pts), param('fee', t.fee), param('confirmed', t.fee !== null), param('expiry', t.expiry), param('flag', t.flag), param('mktNote', t.mktNote), param('rate', t.rate)]
    )
  }
  console.log('Contracts seeded.')

  // ── Yearly Allocations ──
  console.log('Seeding allocations...')
  const allocs = [
    { year: 2026, elected: 21175, primary: 11750, legacy: 6750, total: 39675, recurring: 32925, note: null },
    { year: 2027, elected: 21175, primary: 11750, legacy: 0, total: 32925, recurring: 32925, note: 'Ocean Pointe weeks set to Occupy' },
    { year: 2028, elected: 21175, primary: 11750, legacy: 0, total: 32925, recurring: 32925, note: null },
  ]
  for (const a of allocs) {
    await execute(
      `INSERT INTO yearly_allocations (account_id, use_year, elected_pts, primary_trust_pts, legacy_trust_pts, total_pts, recurring_total, note)
       VALUES (:acct, :year, :elected, :primary, :legacy, :total, :recurring, :note)
       ON CONFLICT (account_id, use_year) DO NOTHING`,
      [param('acct', ACCT), param('year', a.year), param('elected', a.elected), param('primary', a.primary), param('legacy', a.legacy), param('total', a.total), param('recurring', a.recurring), param('note', a.note)]
    )
  }

  // ── Planned Trips ──
  console.log('Seeding trips...')
  const trips = [
    { name: 'Barrett-Jackson', guest: 'Dave', month: 'Jan', year: 2026, pts: 2350, status: 'booked', resort: 'Canyon Villas' },
    { name: 'Grande Vista', guest: 'Dave/David', month: 'Mar', year: 2026, pts: 1311, status: 'booked', resort: 'Grande Vista' },
    { name: 'MVC Waikiki', guest: 'James', month: 'Apr', year: 2026, pts: 665, status: 'booked', resort: 'MVC Waikiki' },
    { name: 'Kauai Lagoons', guest: 'Dave', month: 'Mar', year: 2026, pts: 3175, status: 'booked', resort: 'Kauai Lagoons' },
    { name: 'Ko Olina Beach Club', guest: 'Dave', month: 'Apr', year: 2026, pts: 1234, status: 'booked', resort: 'Ko Olina' },
    { name: 'Luke Combs - Grand Chateau', guest: 'Dave', month: 'Mar', year: 2026, pts: 4407, status: 'booked', resort: 'Grand Chateau' },
    { name: 'Newport Coast Villas', guest: 'Dave', month: 'Feb', year: 2027, pts: 2321, status: 'booked', resort: 'Newport Coast' },
    { name: 'Ocean Pointe (Occupy)', guest: 'Dave', month: 'TBD', year: 2027, pts: 4325, status: 'booked', resort: 'Ocean Pointe' },
    { name: 'Ocean Pointe (Occupy)', guest: 'David', month: 'TBD', year: 2027, pts: 4325, status: 'booked', resort: 'Ocean Pointe' },
  ]
  for (const t of trips) {
    await execute(
      `INSERT INTO trips (account_id, name, guest_name, month, use_year, points_cost, status, resort_name)
       VALUES (:acct, :name, :guest, :month, :year, :pts, :status::trip_status, :resort)`,
      [param('acct', ACCT), param('name', t.name), param('guest', t.guest), param('month', t.month), param('year', t.year), param('pts', t.pts), param('status', t.status), param('resort', t.resort)]
    )
  }

  // ── Live Balances (points ledger) ──
  console.log('Seeding point balances...')
  // First get contract UUIDs
  const contractRows = await query(
    `SELECT id, external_id FROM contracts WHERE account_id = :acct`,
    [param('acct', ACCT)]
  )
  const contractMap = {}
  for (const c of contractRows) contractMap[c.external_id] = c.id

  const balances = [
    { contractExt: 'MU*9203*24*B', type: 'annual_allocation', pts: 2107 },
    { contractExt: 'MU*9203*24*B', type: 'hold', pts: 124 },
    { contractExt: 'CV*3259*50*B', type: 'hold', pts: 1032 },
    { contractExt: '10609899', type: 'annual_allocation', pts: 925 },
  ]
  for (const b of balances) {
    const cid = contractMap[b.contractExt]
    if (!cid) { console.warn('Contract not found:', b.contractExt); continue }
    await execute(
      `INSERT INTO points_ledger (account_id, contract_id, use_year, movement_type, amount, description)
       VALUES (:acct, :cid, 2026, :type::point_movement, :pts, :desc)`,
      [param('acct', ACCT), param('cid', cid), param('type', b.type), param('pts', b.pts), param('desc', b.type + ' - ' + b.contractExt)]
    )
  }

  console.log('Seed complete!')
  console.log('Account ID:', ACCT)
}

run().catch(err => { console.error('Seed failed:', err); process.exit(1) })

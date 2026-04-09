import { query, param } from '../lib/db.mjs'
import { ok, serverError } from '../lib/response.mjs'
import { getAccountId } from '../lib/auth.mjs'

export async function handler(event) {
  try {
    const accountId = getAccountId()
    const path = event.path || event.rawPath || ''

    if (path.includes('/trust')) {
      // GET /contracts/trust
      const rows = await query(
        `SELECT external_id as id, name, points as pts, annual_fee as fee,
                fee_confirmed as "feeConfirmed", expiry_date, flag,
                market_note as "mktNote", default_rate_per_point as "defaultRate"
         FROM contracts WHERE account_id = :acct AND contract_type = 'trust'
         ORDER BY name`,
        [param('acct', accountId)]
      )
      return ok(rows.map(r => ({
        id: r.id, name: r.name, pts: r.pts,
        fee: r.fee, feeConfirmed: r.feeConfirmed,
        expiry: r.expiry_date, flag: r.flag || 'ok',
        mktNote: r.mktNote || '', defaultRate: r.defaultRate || 0.55,
      })))
    }

    // GET /contracts — week contracts
    const rows = await query(
      `SELECT c.external_id as id, c.name, c.location as loc, c.points as pts,
              c.annual_fee as fee, c.fee_confirmed as "feeConfirmed",
              c.contract_type as type, c.floor_plan as floor, c.season,
              c.seasonal_demand as seasonal, c.market_low as "mktLow",
              c.market_high as "mktHigh", c.market_note as "mktNote",
              c.default_rate_per_point as "defaultRate",
              cys.status as status2027
       FROM contracts c
       LEFT JOIN contract_year_statuses cys ON cys.contract_id = c.id AND cys.use_year = 2027
       WHERE c.account_id = :acct AND c.contract_type = 'week'
       ORDER BY c.name`,
      [param('acct', accountId)]
    )
    return ok(rows.map(r => ({
      id: r.id, name: r.name, loc: r.loc || '', pts: r.pts,
      fee: r.fee, feeConfirmed: r.feeConfirmed,
      type: r.type, floor: r.floor || '', season: r.season || '',
      status2027: r.status2027 || 'Available',
      seasonal: r.seasonal || [5,5,5,5,5,5,5,5,5,5,5,5],
      mktLow: r.mktLow || 0, mktHigh: r.mktHigh || 0,
      mktNote: r.mktNote || '', defaultRate: r.defaultRate || 0.5,
    })))
  } catch (err) {
    return serverError(err)
  }
}

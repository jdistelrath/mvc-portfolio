import { query, param } from '../lib/db.mjs'
import { ok, serverError } from '../lib/response.mjs'
import { getAccountId } from '../lib/auth.mjs'

export async function handler(event) {
  try {
    const accountId = getAccountId()
    const path = event.path || event.rawPath || ''

    if (path.includes('/total')) {
      // GET /balances/total
      const rows = await query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM points_ledger
         WHERE account_id = :acct AND use_year = 2026`,
        [param('acct', accountId)]
      )
      return ok(rows[0]?.total || 0)
    }

    // GET /balances
    const rows = await query(
      `SELECT pl.contract_id, c.external_id as "contractId",
              pl.movement_type as type, SUM(pl.amount) as pts
       FROM points_ledger pl
       JOIN contracts c ON c.id = pl.contract_id
       WHERE pl.account_id = :acct AND pl.use_year = 2026
       GROUP BY pl.contract_id, c.external_id, pl.movement_type`,
      [param('acct', accountId)]
    )

    const typeMap = {
      annual_allocation: 'Annual',
      hold: 'Hold',
      // trust annual mapped separately
    }

    return ok(rows.map(r => ({
      contractId: r.contractId,
      type: typeMap[r.type] || r.type,
      pts: r.pts,
    })))
  } catch (err) {
    return serverError(err)
  }
}

import { query, param } from '../lib/db.mjs'
import { ok, serverError } from '../lib/response.mjs'
import { getAccountId } from '../lib/auth.mjs'

export async function handler() {
  try {
    const accountId = getAccountId()
    const rows = await query(
      `SELECT use_year, elected_pts, primary_trust_pts, legacy_trust_pts,
              total_pts, recurring_total, note
       FROM yearly_allocations WHERE account_id = :acct
       ORDER BY use_year`,
      [param('acct', accountId)]
    )

    const result = {}
    for (const r of rows) {
      result[r.use_year] = {
        elected: r.elected_pts,
        primaryTrust: r.primary_trust_pts,
        legacyTrust: r.legacy_trust_pts,
        total: r.total_pts,
        recurringTotal: r.recurring_total,
        ...(r.note ? { note: r.note } : {}),
      }
    }
    return ok(result)
  } catch (err) {
    return serverError(err)
  }
}

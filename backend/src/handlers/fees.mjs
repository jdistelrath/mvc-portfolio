import { query, param } from '../lib/db.mjs'
import { ok, serverError } from '../lib/response.mjs'
import { getAccountId } from '../lib/auth.mjs'

export async function handler() {
  try {
    const accountId = getAccountId()
    const rows = await query(
      `SELECT COALESCE(SUM(annual_fee), 0) as total
       FROM contracts WHERE account_id = :acct::uuid AND fee_confirmed = true`,
      [param('acct', accountId)]
    )
    return ok(rows[0]?.total || 0)
  } catch (err) {
    return serverError(err)
  }
}

import { query, execute, param } from '../lib/db.mjs'
import { ok, created, badRequest, serverError } from '../lib/response.mjs'
import { getAccountId } from '../lib/auth.mjs'

export async function handler(event) {
  try {
    const accountId = getAccountId()
    const method = event.httpMethod || event.requestContext?.http?.method

    if (method === 'GET') {
      const rows = await query(
        `SELECT id, name, guest_name as guest, month, use_year as year,
                points_cost as pts, status, resort_name as resort
         FROM trips WHERE account_id = :acct
         ORDER BY use_year, month`,
        [param('acct', accountId)]
      )
      return ok(rows.map(r => ({
        id: r.id, name: r.name, guest: r.guest || '',
        month: r.month || '', year: r.year, pts: r.pts,
        booked: r.status === 'booked' || r.status === 'completed',
        resort: r.resort || '',
      })))
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}')
      if (!body.name) return badRequest('name is required')

      await execute(
        `INSERT INTO trips (account_id, name, guest_name, month, use_year, points_cost, status, resort_name)
         VALUES (:acct, :name, :guest, :month, :year, :pts, :status, :resort)`,
        [
          param('acct', accountId), param('name', body.name),
          param('guest', body.guest || ''), param('month', body.month || ''),
          param('year', body.year || 2026), param('pts', body.pts || 0),
          param('status', body.booked ? 'booked' : 'planned'),
          param('resort', body.resort || ''),
        ]
      )
      return created({ success: true })
    }

    return badRequest('Unsupported method')
  } catch (err) {
    return serverError(err)
  }
}

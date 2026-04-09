import { query, param } from '../lib/db.mjs'
import { ok, serverError } from '../lib/response.mjs'
import { getAccountId } from '../lib/auth.mjs'

export async function handler(event) {
  try {
    const accountId = getAccountId()

    const accounts = await query(
      'SELECT id, slug, name, membership_level FROM accounts WHERE id = :id',
      [param('id', accountId)]
    )
    if (!accounts.length) return ok({ id: '', name: '', membershipLevel: '', members: [] })

    const acct = accounts[0]

    const members = await query(
      'SELECT id, name, initials, color, role FROM members WHERE account_id = :id ORDER BY role DESC, name',
      [param('id', accountId)]
    )

    return ok({
      id: acct.id,
      name: acct.name,
      membershipLevel: acct.membership_level,
      members: members.map(m => ({
        id: m.id,
        name: m.name,
        initials: m.initials,
        color: m.color,
        role: m.role,
      })),
    })
  } catch (err) {
    return serverError(err)
  }
}

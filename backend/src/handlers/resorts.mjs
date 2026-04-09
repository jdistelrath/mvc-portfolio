import { query, param } from '../lib/db.mjs'
import { ok, serverError } from '../lib/response.mjs'

export async function handler(event) {
  try {
    const qs = event.queryStringParameters || {}
    const regionFilter = qs.region

    let sql = `
      SELECT r.id, r.name, r.location, r.region, r.unit_types, r.notes,
             r.available_via_trust as "availableViaTrust",
             r.exchange_only as "exchangeOnly",
             rpc_low.points_cost as pts_low,
             rpc_mid.points_cost as pts_mid,
             rpc_peak.points_cost as pts_peak,
             rmr.rate_low, rmr.rate_avg, rmr.rate_peak, rmr.source
      FROM resorts r
      LEFT JOIN resort_point_costs rpc_low ON rpc_low.resort_id = r.id AND rpc_low.season = 'low' AND rpc_low.unit_type IS NULL
      LEFT JOIN resort_point_costs rpc_mid ON rpc_mid.resort_id = r.id AND rpc_mid.season = 'mid' AND rpc_mid.unit_type IS NULL
      LEFT JOIN resort_point_costs rpc_peak ON rpc_peak.resort_id = r.id AND rpc_peak.season = 'peak' AND rpc_peak.unit_type IS NULL
      LEFT JOIN LATERAL (
        SELECT * FROM resort_market_rates WHERE resort_id = r.id ORDER BY effective_date DESC LIMIT 1
      ) rmr ON true`

    const params = []
    if (regionFilter) {
      sql += ` WHERE r.region = :region`
      params.push(param('region', regionFilter))
    }
    sql += ` ORDER BY r.region, r.name`

    const rows = await query(sql, params)

    // Also fetch demand scores
    const demandRows = await query(
      'SELECT resort_id, month, demand_score FROM resort_demand ORDER BY resort_id, month'
    )
    const demandMap = {}
    for (const d of demandRows) {
      if (!demandMap[d.resort_id]) demandMap[d.resort_id] = Array(12).fill(5)
      demandMap[d.resort_id][d.month - 1] = d.demand_score
    }

    return ok(rows.map(r => ({
      id: r.id,
      name: r.name,
      location: r.location,
      region: r.region,
      unitTypes: r.unit_types || ['2br'],
      pointCosts: { low: r.pts_low || 0, mid: r.pts_mid || 0, peak: r.pts_peak || 0 },
      marketRates: {
        low: r.rate_low || 0, avg: r.rate_avg || 0, peak: r.rate_peak || 0,
        source: r.source || '',
      },
      demandByMonth: demandMap[r.id] || Array(12).fill(5),
      notes: r.notes || '',
      availableViaTrust: r.availableViaTrust ?? true,
      exchangeOnly: r.exchangeOnly ?? false,
    })))
  } catch (err) {
    return serverError(err)
  }
}

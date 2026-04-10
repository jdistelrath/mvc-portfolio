import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data'
import { readFileSync } from 'fs'

const client = new RDSDataClient({ region: 'us-east-1' })
const CLUSTER_ARN = process.env.DB_CLUSTER_ARN
const SECRET_ARN = process.env.DB_SECRET_ARN
const DATABASE = process.env.DB_NAME || 'mvcportfolio'

async function exec(sql) {
  return client.send(new ExecuteStatementCommand({
    resourceArn: CLUSTER_ARN, secretArn: SECRET_ARN, database: DATABASE, sql,
  }))
}

/**
 * Split SQL into executable statements, respecting $$ dollar-quoted blocks.
 */
function splitStatements(sql) {
  const stmts = []
  let current = ''
  let inDollarQuote = false

  const lines = sql.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('--') && !inDollarQuote) continue

    // Track $$ blocks
    const dollarCount = (line.match(/\$\$/g) || []).length
    if (dollarCount % 2 === 1) inDollarQuote = !inDollarQuote

    current += line + '\n'

    // If we're outside $$ and line ends with ;, it's a statement boundary
    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmt = current.trim()
      if (stmt.length > 1) stmts.push(stmt)
      current = ''
    }
  }
  // Catch any trailing statement
  if (current.trim().length > 1) stmts.push(current.trim())

  return stmts
}

async function run() {
  const schema = readFileSync('infrastructure/schema.sql', 'utf8')
  const stmts = splitStatements(schema)

  console.log(`Running ${stmts.length} statements...`)
  let ok = 0, fail = 0
  for (let i = 0; i < stmts.length; i++) {
    const sql = stmts[i]
    try {
      await exec(sql)
      ok++
      if (ok % 10 === 0) process.stdout.write('.')
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('already exists')) { ok++; continue }
      fail++
      console.error(`\nFAIL [${i}]: ${msg.substring(0, 120)}`)
      console.error(`  SQL: ${sql.substring(0, 80)}...`)
    }
  }
  console.log(`\nSchema: ${ok} ok, ${fail} failed`)
}

run().catch(e => { console.error(e); process.exit(1) })

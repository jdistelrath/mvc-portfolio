import { RDSDataClient, ExecuteStatementCommand, BatchExecuteStatementCommand } from '@aws-sdk/client-rds-data'

const client = new RDSDataClient({ region: process.env.AWS_REGION || 'us-east-1' })

const CLUSTER_ARN = process.env.DB_CLUSTER_ARN
const SECRET_ARN = process.env.DB_SECRET_ARN
const DATABASE = process.env.DB_NAME || 'mvcportfolio'

export async function query(sql, parameters = []) {
  const cmd = new ExecuteStatementCommand({
    resourceArn: CLUSTER_ARN,
    secretArn: SECRET_ARN,
    database: DATABASE,
    sql,
    parameters,
    includeResultMetadata: true,
    formatRecordsAs: 'JSON',
  })
  const result = await client.send(cmd)
  // Parse the JSON-formatted records
  if (result.formattedRecords) {
    return JSON.parse(result.formattedRecords)
  }
  return result
}

export async function execute(sql, parameters = []) {
  const cmd = new ExecuteStatementCommand({
    resourceArn: CLUSTER_ARN,
    secretArn: SECRET_ARN,
    database: DATABASE,
    sql,
    parameters,
  })
  return client.send(cmd)
}

export async function batchExecute(sql, parameterSets) {
  const cmd = new BatchExecuteStatementCommand({
    resourceArn: CLUSTER_ARN,
    secretArn: SECRET_ARN,
    database: DATABASE,
    sql,
    parameterSets,
  })
  return client.send(cmd)
}

// Helper to build Data API parameter objects
export function param(name, value) {
  if (value === null || value === undefined) {
    return { name, value: { isNull: true } }
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { name, value: { longValue: value } }
    return { name, value: { doubleValue: value } }
  }
  if (typeof value === 'boolean') {
    return { name, value: { booleanValue: value } }
  }
  return { name, value: { stringValue: String(value) } }
}

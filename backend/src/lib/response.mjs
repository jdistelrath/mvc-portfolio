const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
}

export function ok(body) {
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(body) }
}

export function created(body) {
  return { statusCode: 201, headers: CORS_HEADERS, body: JSON.stringify(body) }
}

export function badRequest(message) {
  return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: message }) }
}

export function notFound(message = 'Not found') {
  return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: message }) }
}

export function serverError(err) {
  console.error(err)
  return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal server error' }) }
}

// Extract user info from API Gateway's Cognito authorizer claims
export function getUser(event) {
  const claims = event.requestContext?.authorizer?.claims || {}
  return {
    sub: claims.sub || '',
    email: claims.email || '',
    role: claims['custom:role'] || 'member',
  }
}

export function isAdmin(event) {
  return getUser(event).role === 'admin'
}

// For now, hardcoded account ID — will be resolved from user's member record in multi-tenant
export function getAccountId() {
  return process.env.DEFAULT_ACCOUNT_ID || ''
}

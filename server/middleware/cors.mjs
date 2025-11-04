import { defineEventHandler, setResponseHeaders, getHeader } from 'h3'

// In production, restrict CORS to specific origins
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['*']

export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin') || '*'
  const allowed = ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)
  const allowedOrigin = allowed ? origin : ALLOWED_ORIGINS[0]

  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Pin',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
    'Permissions-Policy': 'bluetooth=*, serial=*, geolocation=*',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  })

  if (event.node.req.method === 'OPTIONS') {
    event.node.res.statusCode = 204
    event.node.res.end()
  }
})


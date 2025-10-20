import { defineEventHandler, setResponseHeaders, getHeader } from 'h3'

// In production, restrict CORS to specific origins
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['*']

export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin')
  
  // Check if origin is allowed
  const allowedOrigin = ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)
    ? (origin || '*')
    : ALLOWED_ORIGINS[0]
  
  // Set CORS headers
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    // Enable Web Bluetooth and Web Serial APIs
    'Permissions-Policy': 'bluetooth=*, serial=*, geolocation=*',
    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  })
  
  // Handle preflight requests
  if (event.node.req.method === 'OPTIONS') {
    event.node.res.statusCode = 204
    event.node.res.end()
    return
  }
})


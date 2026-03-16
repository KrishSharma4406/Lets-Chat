import { createHash, randomBytes } from 'crypto'

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Verify a CSRF token
 */
export function verifyCSRFToken(token: string, storedToken: string): boolean {
  try {
    return token === storedToken
  } catch {
    return false
  }
}

/**
 * Hash sensitive data for logging (never store actual values)
 */
export function hashForLogging(data: string): string {
  return createHash('sha256').update(data).digest('hex').substring(0, 16)
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .trim()
}

/**
 * Rate limiting using token bucket algorithm
 */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>(
)

  constructor(
    private maxTokens: number = 100,
    private refillInterval: number = 60000 // 1 minute
  ) {}

  isAllowed(key: string, tokensNeeded: number = 1): boolean {
    const now = Date.now()
    let bucket = this.buckets.get(key)

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now }
      this.buckets.set(key, bucket)
    }

    // Refill tokens based on time elapsed
    const timePassed = now - bucket.lastRefill
    const tokensToAdd = (timePassed / this.refillInterval) * this.maxTokens
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now

    if (bucket.tokens >= tokensNeeded) {
      bucket.tokens -= tokensNeeded
      return true
    }

    return false
  }

  reset(key: string): void {
    this.buckets.delete(key)
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isStrong: boolean
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score++
  else feedback.push('Password should be at least 8 characters long')

  if (/[a-z]/.test(password)) score++
  else feedback.push('Password should contain lowercase letters')

  if (/[A-Z]/.test(password)) score++
  else feedback.push('Password should contain uppercase letters')

  if (/\d/.test(password)) score++
  else feedback.push('Password should contain numbers')

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
  else feedback.push('Password should contain special characters')

  return {
    isStrong: score >= 4,
    score,
    feedback
  }
}

/**
 * Generate audit log entry
 */
export function createAuditLog(
  action: string,
  userId: string,
  details: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  return {
    action,
    userId,
    details: JSON.stringify(details),
    ipAddress: ipAddress || 'UNKNOWN',
    userAgent: userAgent || 'UNKNOWN'
  }
}

/**
 * Check if a request is coming from a suspicious source
 */
export function isSuspiciousRequest(
  ipAddress: string | undefined,
  userAgent: string | undefined
): boolean {
  // This is a basic check. In production, integrate with services like MaxMind
  if (!ipAddress || !userAgent) {
    return false
  }

  // Check for common bot user agents
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i
  ]

  return botPatterns.some(pattern => pattern.test(userAgent))
}

export default {
  generateCSRFToken,
  verifyCSRFToken,
  hashForLogging,
  sanitizeInput,
  RateLimiter,
  isValidEmail,
  validatePasswordStrength,
  createAuditLog,
  isSuspiciousRequest
}

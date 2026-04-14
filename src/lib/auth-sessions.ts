import crypto from 'node:crypto'

import { prisma } from '@/lib/prisma'
import {
  SESSION_MAX_AGE_DEFAULT_SECONDS,
  SESSION_MAX_AGE_REMEMBER_SECONDS,
} from '@/lib/auth-token'

const ACTIVE_STATUS = 'active'
const EXPIRED_STATUS = 'expired'
const REVOKED_STATUS = 'revoked'
const LAST_ACTIVE_UPDATE_INTERVAL_MS = 5 * 60 * 1000
const MAX_ACTIVE_SESSIONS = 3

type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'

export interface SessionUser {
  id: string
  email: string
  name: string
}

export interface SessionContext {
  session: {
    id: string
    userId: string
    deviceName: string
    deviceType: string
    browser: string
    os: string
    ipAddress: string
    userAgent: string
    lastActiveAt: Date
    expiresAt: Date
    revokedAt: Date | null
    status: string
    createdAt: Date
    updatedAt: Date
  }
  user: SessionUser
}

function sessionLifetimeSeconds(remember: boolean) {
  return remember ? SESSION_MAX_AGE_REMEMBER_SECONDS : SESSION_MAX_AGE_DEFAULT_SECONDS
}

function getIpAddress(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || ''
  }

  return request.headers.get('x-real-ip') || ''
}

function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase()

  if (!ua) return 'unknown'
  if (/bot|crawler|spider|crawling/.test(ua)) return 'bot'
  if (/ipad|tablet/.test(ua)) return 'tablet'
  if (/mobi|iphone|android/.test(ua)) return 'mobile'
  if (/macintosh|windows|linux|x11/.test(ua)) return 'desktop'

  return 'unknown'
}

function detectBrowser(userAgent: string) {
  if (!userAgent) return 'Unknown'
  if (/Edg\//.test(userAgent)) return 'Edge'
  if (/OPR\//.test(userAgent) || /Opera/.test(userAgent)) return 'Opera'
  if (/Firefox\//.test(userAgent)) return 'Firefox'
  if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) return 'Chrome'
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent) && !/CriOS\//.test(userAgent)) return 'Safari'
  if (/MSIE|Trident\//.test(userAgent)) return 'Internet Explorer'
  return 'Unknown'
}

function detectOs(userAgent: string) {
  if (!userAgent) return 'Unknown'
  if (/Windows NT/.test(userAgent)) return 'Windows'
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS'
  if (/Android/.test(userAgent)) return 'Android'
  if (/Mac OS X|Macintosh/.test(userAgent)) return 'macOS'
  if (/Linux|X11/.test(userAgent)) return 'Linux'
  return 'Unknown'
}

function formatDeviceName(deviceType: DeviceType, os: string, browser: string) {
  const typeLabel =
    deviceType === 'mobile'
      ? 'Mobile'
      : deviceType === 'tablet'
        ? 'Tablet'
        : deviceType === 'bot'
          ? 'Bot'
          : 'Desktop'

  if (os !== 'Unknown') {
    return `${typeLabel} · ${os}`
  }

  if (browser !== 'Unknown') {
    return `${typeLabel} · ${browser}`
  }

  return 'Unknown device'
}

function getDeviceInfo(request: Request) {
  const userAgent = request.headers.get('user-agent') || ''
  const deviceType = detectDeviceType(userAgent)
  const browser = detectBrowser(userAgent)
  const os = detectOs(userAgent)

  return {
    deviceName: formatDeviceName(deviceType, os, browser),
    deviceType,
    browser,
    os,
    ipAddress: getIpAddress(request),
    userAgent,
  }
}

function sessionTokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function createRawSessionToken() {
  return crypto.randomBytes(32).toString('base64url')
}

async function markSessionExpired(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { status: EXPIRED_STATUS },
  }).catch(() => null)
}

function toSessionUser(user: { id: string; email: string; name: string | null }): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name || 'User',
  }
}

export async function createUserSession(input: {
  userId: string
  remember?: boolean
  request: Request
}) {
  const remember = Boolean(input.remember)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + sessionLifetimeSeconds(remember) * 1000)
  const rawToken = createRawSessionToken()
  const tokenHash = sessionTokenHash(rawToken)
  const device = getDeviceInfo(input.request)

  const session = await prisma.$transaction(async (tx) => {
    const activeSessions = await tx.session.findMany({
      where: {
        userId: input.userId,
        status: ACTIVE_STATUS,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: [{ lastActiveAt: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    })

    const sessionsToRevoke = Math.max(0, activeSessions.length - MAX_ACTIVE_SESSIONS + 1)
    const oldestIds = activeSessions.slice(0, sessionsToRevoke).map((item) => item.id)

    if (oldestIds.length > 0) {
      await tx.session.updateMany({
        where: { id: { in: oldestIds } },
        data: {
          status: REVOKED_STATUS,
          revokedAt: now,
        },
      })
    }

    return tx.session.create({
      data: {
        userId: input.userId,
        tokenHash,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
        ipAddress: device.ipAddress,
        userAgent: device.userAgent,
        lastActiveAt: now,
        expiresAt,
        status: ACTIVE_STATUS,
      },
    })
  })

  return { session, rawToken, expiresAt }
}

export async function validateSessionToken(token: string | null): Promise<SessionContext | null> {
  if (!token) return null

  const now = new Date()
  const tokenHash = sessionTokenHash(token)
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })

  if (!session) return null

  if (session.expiresAt <= now) {
    if (session.status === ACTIVE_STATUS) {
      await markSessionExpired(session.id)
    }
    return null
  }

  if (session.status !== ACTIVE_STATUS || session.revokedAt) {
    return null
  }

  if (now.getTime() - session.lastActiveAt.getTime() >= LAST_ACTIVE_UPDATE_INTERVAL_MS) {
    const updated = await prisma.session.update({
      where: { id: session.id },
      data: { lastActiveAt: now },
    })
    session.lastActiveAt = updated.lastActiveAt
    session.updatedAt = updated.updatedAt
  }

  return {
    session: {
      id: session.id,
      userId: session.userId,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
    user: toSessionUser(session.user),
  }
}

export async function revokeSessionById(sessionId: string, userId: string) {
  const now = new Date()
  const result = await prisma.session.updateMany({
    where: {
      id: sessionId,
      userId,
      status: ACTIVE_STATUS,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    data: {
      status: REVOKED_STATUS,
      revokedAt: now,
    },
  })

  return result.count > 0
}

export async function revokeSessionByToken(token: string | null) {
  if (!token) return false

  const now = new Date()
  const result = await prisma.session.updateMany({
    where: {
      tokenHash: sessionTokenHash(token),
      status: ACTIVE_STATUS,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    data: {
      status: REVOKED_STATUS,
      revokedAt: now,
    },
  })

  return result.count > 0
}

export async function revokeOtherSessions(userId: string, currentSessionId: string) {
  const now = new Date()
  const result = await prisma.session.updateMany({
    where: {
      userId,
      id: { not: currentSessionId },
      status: ACTIVE_STATUS,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    data: {
      status: REVOKED_STATUS,
      revokedAt: now,
    },
  })

  return result.count
}

export async function listActiveSessions(userId: string) {
  const now = new Date()

  await prisma.session.updateMany({
    where: {
      userId,
      status: ACTIVE_STATUS,
      revokedAt: null,
      expiresAt: { lte: now },
    },
    data: { status: EXPIRED_STATUS },
  })

  return prisma.session.findMany({
    where: {
      userId,
      status: ACTIVE_STATUS,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: [{ lastActiveAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      deviceName: true,
      deviceType: true,
      browser: true,
      os: true,
      ipAddress: true,
      userAgent: true,
      lastActiveAt: true,
      expiresAt: true,
      createdAt: true,
    },
  })
}

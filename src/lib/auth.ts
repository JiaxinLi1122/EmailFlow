import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
    async signIn({ user, account }) {
      // Store Gmail tokens when user signs in
      if (account?.provider === 'google' && user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            gmailAccessToken: account.access_token,
            gmailRefreshToken: account.refresh_token,
            gmailTokenExpiry: account.expires_at
              ? new Date(account.expires_at * 1000)
              : null,
            gmailConnected: true,
            syncEnabled: true,
          },
        })
      }
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'database',
  },
})

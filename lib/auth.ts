import { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

console.log('NextAuth config loading...');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'present' : 'MISSING');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'not set');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'present' : 'MISSING');
console.log('GITHUB_ID:', process.env.GITHUB_ID ? 'present' : 'MISSING');
console.log('Prisma:', typeof prisma !== 'undefined' ? 'available' : 'missing');

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // OAuth providers disabled for debugging CLIENT_FETCH_ERROR
    // Uncomment after fixing env vars and testing Credentials works

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('[Credentials] Authorize called');
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email and password are required")
          }

          console.log('[Credentials] Looking up user:', credentials.email);
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user) {
            console.log('[Credentials] No user found');
            throw new Error("No user found with this email")
          }

          if (!user.password) {
            console.log('[Credentials] No password hash - social account');
            throw new Error("This account uses social login. Please sign in with your social provider")
          }

          console.log('[Credentials] Comparing password...');
          const isCorrectPassword = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isCorrectPassword) {
            console.log('[Credentials] Invalid password');
            throw new Error("Invalid password")
          }

          console.log('[Credentials] Success, returning user');
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image
          }
        } catch (error) {
          console.error('Auth error:', error)
          if (error instanceof Error) {
            throw new Error(error.message)
          }
          throw new Error("Authentication failed")
        }
      }
    })
  ],
  pages: {
    signIn: '/auth',
    error: '/auth',
  },
  debug: process.env.NODE_ENV === 'development',
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET as string,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      if (account) {
        token.provider = account.provider
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl + '/chat'
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as default }

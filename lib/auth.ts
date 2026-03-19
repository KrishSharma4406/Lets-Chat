import { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

console.log('NextAuth config loading...');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'present' : 'MISSING');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'not set');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'present' : 'MISSING');
console.log('GITHUB_ID:', process.env.GITHUB_ID ? 'present' : 'MISSING');

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Demo Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "demo@example.com" },
        password: { label: "Password", type: "password", placeholder: "password" }
      },
      async authorize(credentials) {
        console.log('[Credentials Auth] Login attempt:', credentials?.email);
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email and password are required")
          }

          // Find user in db
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })
          
          if (!user || !user.password) {
            console.log('[Credentials Auth] User not found or uses OAuth:', credentials.email);
            throw new Error("Invalid email or password")
          }

          const passwordToCompare = user.password;

          // Check password
          const isCorrectPassword = await bcrypt.compare(
            credentials.password,
            passwordToCompare
          )

          if (!isCorrectPassword) {
            console.log('[Credentials Auth] Invalid password');
            throw new Error("Invalid email or password")
          }

          console.log('[Credentials Auth] Login successful:', user.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image
          }
        } catch (error) {
          console.error('[Credentials Auth] Error:', error)
          throw error
        }
      }
    })
  ],
  pages: {
    signIn: '/auth',
    error: '/auth'
  },
  debug: process.env.NODE_ENV === 'development',
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET as string,
  callbacks: {
    async jwt({ token, user}) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
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
      // Allow relative URLs (e.g., /chat)
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      // Allow absolute URLs on the same origin
      try {
        const urlObj = new URL(url)
        if (urlObj.origin === baseUrl) {
          return url
        }
      } catch (err) {
        // Invalid URL, redirect to /chat
      }
      // Default fallback for OAuth redirects
      return `${baseUrl}/chat`
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as default }

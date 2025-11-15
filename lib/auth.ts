import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { redis } from './redis';
import crypto from 'crypto';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

// Extended JWT token type
interface ExtendedJWT {
  id?: string;
  email?: string;
  name?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
  error?: string;
}

// Generate a secure random refresh token
function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Refresh the access token using the refresh token
async function refreshAccessToken(token: ExtendedJWT): Promise<ExtendedJWT> {
  try {
    const userId = token.id;
    const refreshToken = token.refreshToken;

    if (!userId || !refreshToken) {
      throw new Error('Missing user ID or refresh token');
    }

    // Verify refresh token is valid in Redis
    const isValid = await redis.isRefreshTokenValid(userId, refreshToken);

    if (!isValid) {
      throw new Error('Refresh token is invalid or expired');
    }

    // Generate new tokens
    const newRefreshToken = generateRefreshToken();
    const newAccessTokenExpires = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY;

    // Store new refresh token in Redis
    await redis.storeRefreshToken(userId, newRefreshToken, REFRESH_TOKEN_EXPIRY);

    console.log(`✓ Tokens refreshed for user ${userId}`);

    return {
      ...token,
      accessTokenExpires: newAccessTokenExpires,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);

    // Return token with error flag
    return {
      ...token,
      error: 'RefreshTokenError',
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: REFRESH_TOKEN_EXPIRY, // Session max age matches refresh token expiry
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;

        // If there's a refresh error, the session should be invalidated
        if (token.error === 'RefreshTokenError') {
          // Session will be invalid, forcing re-authentication
          session.error = 'RefreshTokenError';
        }
      }
      return session;
    },
    async jwt({ token, user, trigger }) {
      // Initial sign in - create new tokens
      if (user) {
        const refreshToken = generateRefreshToken();
        const accessTokenExpires = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY;

        // Store refresh token in Redis
        await redis.storeRefreshToken(user.id, refreshToken, REFRESH_TOKEN_EXPIRY);

        console.log(`✓ New session created for user ${user.id}`);

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          accessTokenExpires,
          refreshToken,
        };
      }

      // Return previous token if the access token has not expired yet
      const extendedToken = token as ExtendedJWT;
      const now = Math.floor(Date.now() / 1000);

      if (extendedToken.accessTokenExpires && now < extendedToken.accessTokenExpires) {
        return extendedToken;
      }

      // Access token has expired, try to refresh it
      console.log(`⚠ Access token expired for user ${extendedToken.id}, attempting refresh...`);
      return refreshAccessToken(extendedToken);
    },
  },
  events: {
    async signOut({ token }) {
      // Clean up refresh token from Redis on logout
      if (token && token.id) {
        await redis.deleteRefreshToken(token.id as string);
        console.log(`✓ Refresh token deleted for user ${token.id}`);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
    };
    error?: string;
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    error?: string;
  }
}

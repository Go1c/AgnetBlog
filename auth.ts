import type { DefaultSession, NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      login?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    githubLogin?: string | null;
  }
}

function getGitHubLogin(profile: unknown): string | null {
  if (!profile || typeof profile !== 'object' || !('login' in profile)) {
    return null;
  }

  const login = (profile as { login?: unknown }).login;
  return typeof login === 'string' && login.length > 0 ? login : null;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID ?? '',
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? '',
    }),
  ],
  callbacks: {
    jwt({ token, profile }) {
      const login = getGitHubLogin(profile);

      if (login) {
        token.githubLogin = login;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.login =
          typeof token.githubLogin === 'string' ? token.githubLogin : null;
      }

      return session;
    },
  },
};

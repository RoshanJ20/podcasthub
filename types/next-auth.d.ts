/**
 * NextAuth.js type augmentation for The Audit Brief.
 *
 * Extends the default NextAuth Session, JWT, and User types to include
 * the application's role-based access control fields.
 */
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: string;
    };
  }

  interface User {
    role: string;
    displayName: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    userId: string;
  }
}

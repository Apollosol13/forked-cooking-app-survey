import React, { useEffect, useState } from 'react';
import netlifyIdentity from 'netlify-identity-widget';

export interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

interface AuthProps {
  children: (props: { user: User | null; signIn: () => void; signOut: () => void }) => React.ReactNode;
}

export const Auth: React.FC<AuthProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Initialize Netlify Identity
    netlifyIdentity.init();

    // Check if user is already logged in
    const currentUser = netlifyIdentity.currentUser();
    if (currentUser) {
      setUser(currentUser as User);
    }

    // Listen for auth events
    netlifyIdentity.on('init', (user: any) => {
      setUser(user as User);
    });

    netlifyIdentity.on('login', (user: any) => {
      setUser(user as User);
      netlifyIdentity.close();
    });

    netlifyIdentity.on('logout', () => {
      setUser(null);
    });

    // Cleanup
    return () => {
      netlifyIdentity.off('init');
      netlifyIdentity.off('login');
      netlifyIdentity.off('logout');
    };
  }, []);

  const signIn = () => {
    netlifyIdentity.open();
  };

  const signOut = () => {
    netlifyIdentity.logout();
  };

  return <>{children({ user, signIn, signOut })}</>;
};

export default Auth; 
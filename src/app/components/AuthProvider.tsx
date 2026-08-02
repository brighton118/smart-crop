import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { FirebaseUser, auth, onAuthStateChanged, signOut as firebaseSignOut } from "../../firebase/auth";

// ─── Context Types ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: FirebaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => { },
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {

      // --- DEV OVERRIDE ---
      // Inject a dummy user directly so we can bypass Firebase authentication entirely during testing! 
      if (!firebaseUser) {
        const fakeUser = {
          uid: "admin-bypass-id",
          email: "development@tester.com",
          displayName: "Dev Mode"
        } as unknown as FirebaseUser;
        setUser(fakeUser);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}


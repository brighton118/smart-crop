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
      if (firebaseUser) {
        const enrichedUser = Object.assign(firebaseUser, {
          id: firebaseUser.uid,
          user_metadata: {
            name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Farmer",
            avatar_url: firebaseUser.photoURL || "",
          },
        }) as FirebaseUser;
        setUser(enrichedUser);
      } else {
        setUser(null);
      }
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

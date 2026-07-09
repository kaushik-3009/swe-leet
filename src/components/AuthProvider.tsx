"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { auth as getAuth } from "@/lib/firebase";
import { api, ApiError } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const firebaseAuth = getAuth();
    if (!firebaseAuth) { setLoading(false); return; }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const p = await api.get<UserProfile>("/api/users/me");
          setProfile(p);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function signup(email: string, password: string, username: string) {
    const firebaseAuth = getAuth();
    if (!firebaseAuth) throw new Error("Firebase not initialized");

    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await updateProfile(cred.user, { displayName: username });

    try {
      const p = await api.post<UserProfile>("/api/users/register", { username });
      setProfile(p);
    } catch (e) {
      // Roll back the Firebase account so the user isn't left in a half-signed-up state
      // (e.g. username already taken in Postgres).
      await cred.user.delete().catch(() => {});
      throw e instanceof ApiError ? new Error(e.message) : e;
    }
  }

  async function login(email: string, password: string) {
    const firebaseAuth = getAuth();
    if (!firebaseAuth) throw new Error("Firebase not initialized");
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  }

  async function logout() {
    const firebaseAuth = getAuth();
    if (!firebaseAuth) throw new Error("Firebase not initialized");
    await signOut(firebaseAuth);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

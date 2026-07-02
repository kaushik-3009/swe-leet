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
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth as getAuth, db as getDb } from "@/lib/firebase";

interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  createdAt: any;
}

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
        const db = getDb();
        if (db) {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          }
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
    const db = getDb();
    if (!firebaseAuth || !db) throw new Error("Firebase not initialized");

    // Check username uniqueness
    const usernameQuery = query(collection(db, "users"), where("username", "==", username.toLowerCase().trim()));
    const usernameSnapshot = await getDocs(usernameQuery);
    if (!usernameSnapshot.empty) {
      throw new Error("Username is already taken");
    }

    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await updateProfile(cred.user, { displayName: username });

    const userProfile: UserProfile = {
      uid: cred.user.uid,
      username: username.toLowerCase().trim(),
      displayName: username.trim(),
      email: email.toLowerCase().trim(),
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", cred.user.uid), userProfile);
    await setDoc(doc(db, "usernames", username.toLowerCase().trim()), { uid: cred.user.uid });
    setProfile(userProfile);
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

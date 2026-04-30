import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

type UserRole = "user" | "admin";

type AuthUser = {
  uid: string;
  email: string | null;
  provider: "firebase" | "local";
};

type LocalAccount = {
  uid: string;
  email: string;
  password: string;
  role: UserRole;
};

const LOCAL_ACCOUNTS_KEY = "hydrosentinel.localAccounts";
const LOCAL_SESSION_KEY = "hydrosentinel.session";
const DEMO_ACCOUNTS: LocalAccount[] = [
  {
    uid: "demo-user",
    email: "user@demo.com",
    password: "password",
    role: "user",
  },
  {
    uid: "demo-admin",
    email: "admin@demo.com",
    password: "password",
    role: "admin",
  },
];

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  signup: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  getUserRole: () => UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readLocalAccounts = (): LocalAccount[] => {
  if (typeof window === "undefined") {
    return DEMO_ACCOUNTS;
  }

  try {
    const rawAccounts = window.localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!rawAccounts) {
      return DEMO_ACCOUNTS;
    }

    const parsedAccounts = JSON.parse(rawAccounts) as LocalAccount[];
    return [...DEMO_ACCOUNTS, ...parsedAccounts];
  } catch {
    return DEMO_ACCOUNTS;
  }
};

const saveLocalAccounts = (accounts: LocalAccount[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
};

const saveSession = (session: { user: AuthUser; role: UserRole } | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
};

const readSession = (): { user: AuthUser; role: UserRole } | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(LOCAL_SESSION_KEY);
    if (!rawSession) {
      return null;
    }

    return JSON.parse(rawSession) as { user: AuthUser; role: UserRole };
  } catch {
    return null;
  }
};

const persistUserDoc = async (uid: string, email: string | null, role: UserRole) => {
  try {
    await setDoc(doc(db, "users", uid), {
      email,
      role,
      deviceCount: 0,
      createdAt: new Date().toISOString(),
      locations: role === "user" ? ["default"] : [],
      uniqueId: `USER_${uid.slice(0, 8).toUpperCase()}`,
    });
  } catch (error) {
    console.warn("Firestore sync skipped:", error);
  }
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Authentication failed";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = readSession();

    if (session) {
      setUser(session.user);
      setRole(session.role);
    }

    setLoading(false);
  }, []);

  const setAuthState = (nextUser: AuthUser, nextRole: UserRole) => {
    setUser(nextUser);
    setRole(nextRole);
    saveSession({ user: nextUser, role: nextRole });
  };

  const findLocalAccount = (email: string) =>
    readLocalAccounts().find((account) => account.email.toLowerCase() === email.toLowerCase());

  const resolveRole = async (uid: string, fallbackRole: UserRole) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return userDoc.data().role as UserRole;
      }
    } catch (error) {
      console.warn("Role lookup skipped:", error);
    }

    return fallbackRole;
  };

  const login = async (email: string, password: string, selectedRole: UserRole) => {
    const localAccount = findLocalAccount(email);

    if (localAccount && localAccount.password === password) {
      if (localAccount.role !== selectedRole) {
        throw new Error("Role mismatch or user not found");
      }

      setAuthState(
        { uid: localAccount.uid, email: localAccount.email, provider: "local" },
        selectedRole
      );
      return;
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const resolvedRole = await resolveRole(result.user.uid, selectedRole);

      if (resolvedRole !== selectedRole) {
        await signOut(auth);
        throw new Error("Role mismatch or user not found");
      }

      setAuthState(
        { uid: result.user.uid, email: result.user.email, provider: "firebase" },
        resolvedRole
      );
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  };

  const signup = async (
    email: string,
    password: string,
    selectedRole: UserRole
  ) => {
    const nextAccount: LocalAccount = {
      uid: crypto.randomUUID(),
      email,
      password,
      role: selectedRole,
    };

    const existingAccounts = readLocalAccounts().filter(
      (account) => account.email.toLowerCase() !== email.toLowerCase()
    );

    saveLocalAccounts([...existingAccounts, nextAccount]);
    await persistUserDoc(nextAccount.uid, email, selectedRole);
    setAuthState(
      { uid: nextAccount.uid, email: nextAccount.email, provider: "local" },
      selectedRole
    );
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore when Firebase Auth is not available in the current environment.
    }

    setRole(null);
    setUser(null);
    saveSession(null);
  };

  const getUserRole = () => role;

  return (
    <AuthContext.Provider
      value={{ user, role, loading, login, signup, logout, getUserRole }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

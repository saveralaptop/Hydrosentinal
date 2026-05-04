import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";

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
  resetCode?: string;
  fullName?: string;
  username?: string;
  organization?: string;
  systemId?: string;
};

type SignupData = {
  email: string;
  password: string;
  fullName: string;
  username: string;
  organizationType: string;
  organizationName?: string;
  recoveryCode: string;
};

const LOCAL_ACCOUNTS_KEY = "hydrosentinel.localAccounts";
const LOCAL_SESSION_KEY = "hydrosentinel.session";
const DEMO_ACCOUNTS: LocalAccount[] = [
  {
    uid: "demo-user",
    email: "user@demo.com",
    password: "password",
    role: "user",
    resetCode: "demo-code",
  },
  {
    uid: "demo-admin-nikhil",
    email: "nikhil@admin.com",
    password: "Nikhil",
    role: "admin",
    resetCode: "nikhil",
  },
  {
    uid: "demo-admin-harsh",
    email: "harsh@admin.com",
    password: "Harsh",
    role: "admin",
    resetCode: "harsh",
  },
  {
    uid: "demo-admin-himanshu",
    email: "himanshu@admin.com",
    password: "Himanshu",
    role: "admin",
    resetCode: "himanshu",
  },
  {
    uid: "demo-admin-kartik",
    email: "kartik@admin.com",
    password: "Kartik",
    role: "admin",
    resetCode: "kartik",
  },
  {
    uid: "demo-admin-khushi",
    email: "khushi@admin.com",
    password: "Khushi",
    role: "admin",
    resetCode: "khushi",
  },
];

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  signup: (email: string, password: string, role: UserRole, resetCode: string) => Promise<void>;
  signupWithProfile: (data: SignupData) => Promise<{ uid: string; systemId: string }>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  resetPasswordWithRecoveryCode: (email: string, password: string, recoveryCode: string) => Promise<void>;
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

const normalizeUsername = (username: string): string => {
  return username
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_-]/g, "");
};

const generateSystemId = (organization: string, username: string): string => {
  const orgPart = organization
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join("")
    .slice(0, 10);
  const userPart = normalizeUsername(username).slice(0, 10);
  return `${orgPart}_${userPart}`.slice(0, 20);
};

const persistUserDoc = async (
  uid: string,
  email: string | null,
  role: UserRole,
  resetCode?: string,
  profileData?: {
    fullName?: string;
    username?: string;
    organizationType?: string;
    organizationName?: string;
    systemId?: string;
  }
) => {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        email,
        role,
        resetCode: resetCode ?? null,
        fullName: profileData?.fullName ?? null,
        username: profileData?.username ?? null,
        organizationType: profileData?.organizationType ?? null,
        organizationName: profileData?.organizationName ?? null,
        organization: profileData?.organizationName ?? profileData?.organizationType ?? null,
        systemId: profileData?.systemId ?? null,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        locations: role === "user" ? ["default"] : [],
        uniqueId: `USER_${uid.slice(0, 8).toUpperCase()}`,
      },
      { merge: true }
    );
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

  const updateLocalAccount = (nextAccount: LocalAccount) => {
    const existingAccounts = readLocalAccounts().filter(
      (account) => account.email.toLowerCase() !== nextAccount.email.toLowerCase()
    );
    saveLocalAccounts([...existingAccounts, nextAccount]);
  };

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

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    try {
      const normalizedUsername = normalizeUsername(username);
      if (!normalizedUsername) {
        return false;
      }

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", normalizedUsername));
      const snapshot = await getDocs(q);
      return snapshot.empty;
    } catch (error) {
      console.warn("Username check skipped:", error);
      return true;
    }
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
    selectedRole: UserRole,
    resetCode: string
  ) => {
    const nextAccount: LocalAccount = {
      uid: crypto.randomUUID(),
      email,
      password,
      role: selectedRole,
      resetCode: resetCode.trim(),
    };

    const existingAccounts = readLocalAccounts().filter(
      (account) => account.email.toLowerCase() !== email.toLowerCase()
    );

    saveLocalAccounts([...existingAccounts, nextAccount]);
    await persistUserDoc(nextAccount.uid, email, selectedRole, nextAccount.resetCode);
    setAuthState(
      { uid: nextAccount.uid, email: nextAccount.email, provider: "local" },
      selectedRole
    );
  };

  const signupWithProfile = async (data: SignupData) => {
    const { email, password, fullName, username, organizationType, organizationName, recoveryCode } = data;

    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
      throw new Error("Invalid username format");
    }

    const isAvailable = await checkUsernameAvailable(normalizedUsername);
    if (!isAvailable) {
      throw new Error("Username already taken");
    }

    const orgForSystem = organizationName && organizationName.trim().length > 0 ? organizationName : organizationType;
    const systemId = generateSystemId(orgForSystem ?? "ORG", normalizedUsername);

    // Create user securely using Firebase Auth so passwords are not stored locally
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      await persistUserDoc(uid, email, "user", recoveryCode.trim(), {
        fullName,
        username: normalizedUsername,
        organizationType,
        organizationName: organizationName ?? null,
        systemId,
      });

      setAuthState({ uid, email, provider: "firebase" }, "user");

      return { uid, systemId };
    } catch (error) {
      // If Firebase signup fails, surface readable message
      const msg = error instanceof Error ? error.message : "Signup failed";
      throw new Error(msg);
    }
  };

  const resetPasswordWithRecoveryCode = async (
    email: string,
    password: string,
    recoveryCode: string
  ) => {
    const existingAccount = findLocalAccount(email);
    if (!existingAccount) {
      throw new Error("Account not found or cannot be recovered with code");
    }

    if (!existingAccount.resetCode || existingAccount.resetCode !== recoveryCode.trim()) {
      throw new Error("Invalid recovery code");
    }

    const updatedAccount: LocalAccount = {
      ...existingAccount,
      password,
    };

    updateLocalAccount(updatedAccount);
    await persistUserDoc(
      updatedAccount.uid,
      updatedAccount.email,
      updatedAccount.role,
      updatedAccount.resetCode
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
      value={{
        user,
        role,
        loading,
        login,
        signup,
        signupWithProfile,
        checkUsernameAvailable,
        resetPasswordWithRecoveryCode,
        logout,
        getUserRole,
      }}
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

export type { SignupData };

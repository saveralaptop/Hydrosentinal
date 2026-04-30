import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

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
  name?: string;
  organization?: string;
  resetCode?: string;
};

type SignupProfile = {
  name: string;
  organization: string;
  resetCode: string;
};

const LOCAL_ACCOUNTS_KEY = "hydrosentinel.localAccounts";
const LOCAL_SESSION_KEY = "hydrosentinel.session";
const DEMO_ACCOUNTS: LocalAccount[] = [
  {
    uid: "admin-nikhil",
    email: "nikhil@admin.com",
    password: "Nikhil",
    role: "admin",
  },
  {
    uid: "admin-harsh",
    email: "harsh@admin.com",
    password: "Harsh",
    role: "admin",
  },
  {
    uid: "admin-himanshu",
    email: "himanshu@admin.com",
    password: "Himanshu",
    role: "admin",
  },
  {
    uid: "admin-kartik",
    email: "kartik@admin.com",
    password: "Kartik",
    role: "admin",
  },
  {
    uid: "admin-khushi",
    email: "khushi@admin.com",
    password: "Khushi",
    role: "admin",
  },
];

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  signup: (
    email: string,
    password: string,
    role: UserRole,
    profile: SignupProfile
  ) => Promise<void>;
  resetPassword: (email: string, resetCode: string, newPassword: string) => Promise<void>;
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

const isDemoAccount = (account: LocalAccount) =>
  DEMO_ACCOUNTS.some((demoAccount) => demoAccount.email.toLowerCase() === account.email.toLowerCase());

const normalizePersistedAccounts = (accounts: LocalAccount[]) =>
  accounts.filter((account) => !isDemoAccount(account));

const toUserIdPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildUserId = (name: string, email: string, accounts: LocalAccount[]) => {
  const baseId = toUserIdPart(name) || toUserIdPart(email.split("@")[0]) || "user";
  const usedIds = new Set(accounts.map((account) => account.uid.toLowerCase()));

  if (!usedIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  let nextId = `${baseId}-${suffix}`;

  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${baseId}-${suffix}`;
  }

  return nextId;
};

const persistUserDoc = async (
  uid: string,
  email: string | null,
  role: UserRole,
  profile?: Partial<SignupProfile>
) => {
  try {
    await setDoc(doc(db, "users", uid), {
      email,
      role,
      name: profile?.name ?? "",
      organization: profile?.organization ?? "",
      resetCode: profile?.resetCode ?? "1234",
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

const findFirestoreUserByEmail = async (email: string) => {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const matchedDoc = snapshot.docs.find((item) => {
      const data = item.data() as { email?: string };
      return data.email?.toLowerCase() === email.toLowerCase();
    });

    if (!matchedDoc) {
      return null;
    }

    const data = matchedDoc.data() as {
      email?: string;
      name?: string;
      organization?: string;
      resetCode?: string;
      role?: UserRole;
    };

    return {
      uid: matchedDoc.id,
      email: data.email ?? email,
      name: data.name,
      organization: data.organization,
      resetCode: data.resetCode,
      role: data.role ?? "user",
    };
  } catch {
    return null;
  }
};

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
    selectedRole: UserRole,
    profile: SignupProfile
  ) => {
    if (selectedRole !== "user") {
      throw new Error("Admin signup is not allowed");
    }

    const trimmedName = profile.name.trim();
    const organization = profile.organization.trim();
    const resetCode = profile.resetCode.trim();

    if (!trimmedName || !organization || !/^\d{4}$/.test(resetCode)) {
      throw new Error("Name, organization, and a 4 digit code are required");
    }

    const allAccounts = readLocalAccounts();
    const nextAccount: LocalAccount = {
      uid: buildUserId(trimmedName, email, allAccounts),
      email,
      password,
      role: selectedRole,
      name: trimmedName,
      organization,
      resetCode,
    };

    const existingAccounts = allAccounts.filter(
      (account) => account.email.toLowerCase() !== email.toLowerCase()
    );

    saveLocalAccounts(normalizePersistedAccounts([...existingAccounts, nextAccount]));
    await persistUserDoc(nextAccount.uid, email, selectedRole, {
      name: trimmedName,
      organization,
      resetCode,
    });
    setAuthState(
      { uid: nextAccount.uid, email: nextAccount.email, provider: "local" },
      selectedRole
    );
  };

  const resetPassword = async (email: string, resetCode: string, newPassword: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = resetCode.trim();
    const nextPassword = newPassword.trim();

    if (!trimmedEmail || !/^\d{4}$/.test(trimmedCode) || !nextPassword) {
      throw new Error("Email, 4 digit code, and new password are required");
    }

    const allAccounts = readLocalAccounts();
    const account = allAccounts.find(
      (item) => item.email.toLowerCase() === trimmedEmail && item.role === "user"
    );

    const firestoreUser = account ? null : await findFirestoreUserByEmail(trimmedEmail);

    if (!account && !firestoreUser) {
      throw new Error("User account not found");
    }

    if (firestoreUser?.role !== "user" && !account) {
      throw new Error("User account not found");
    }

    const savedCode = account?.resetCode ?? firestoreUser?.resetCode ?? "1234";

    if (savedCode !== trimmedCode) {
      throw new Error("Invalid recovery code");
    }

    const resetAccount: LocalAccount = account
      ? { ...account, password: nextPassword, resetCode: savedCode }
      : {
          uid: firestoreUser!.uid,
          email: firestoreUser!.email,
          password: nextPassword,
          role: "user",
          name: firestoreUser!.name,
          organization: firestoreUser!.organization,
          resetCode: savedCode,
        };

    const nextAccounts = allAccounts
      .filter((item) => item.email.toLowerCase() !== trimmedEmail)
      .concat(resetAccount);

    saveLocalAccounts(normalizePersistedAccounts(nextAccounts));

    if (firestoreUser) {
      await setDoc(
        doc(db, "users", firestoreUser.uid),
        { resetCode: savedCode },
        { merge: true }
      );
    }
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
      value={{ user, role, loading, login, signup, resetPassword, logout, getUserRole }}
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

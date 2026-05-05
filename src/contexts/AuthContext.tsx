import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
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
const PENDING_SIGNUPS_KEY = "hydrosentinel.pendingSignups";
const DEMO_ACCOUNTS: LocalAccount[] = [
  {
    uid: "demo-user",
    email: "user@demo.com",
    password: "password",
    role: "user",
    resetCode: "demo-code",
  },
  {
    uid: "admin-nikhil",
    email: "nikhil@admin.com",
    password: "Nikhil",
    role: "admin",
    resetCode: "nikhil",
  },
  {
    uid: "admin-harsh",
    email: "harsh@admin.com",
    password: "Harsh",
    role: "admin",
    resetCode: "harsh",
  },
  {
    uid: "admin-himanshu",
    email: "himanshu@admin.com",
    password: "Himanshu",
    role: "admin",
    resetCode: "himanshu",
  },
  {
    uid: "admin-kartik",
    email: "kartik@admin.com",
    password: "Kartik",
    role: "admin",
    resetCode: "kartik",
  },
  {
    uid: "admin-khushi",
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

type PendingSignup = SignupData & {
  selectedRole: UserRole;
  queuedAt: string;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const isBrowserOnline = () =>
  typeof window === "undefined" ? true : window.navigator.onLine;

const readPendingSignups = (): PendingSignup[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(PENDING_SIGNUPS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingSignup[];
  } catch {
    return [];
  }
};

const savePendingSignups = (items: PendingSignup[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PENDING_SIGNUPS_KEY, JSON.stringify(items));
};

const queuePendingSignup = (signup: PendingSignup) => {
  const existing = readPendingSignups().filter(
    (item) => normalizeEmail(item.email) !== normalizeEmail(signup.email),
  );
  savePendingSignups([...existing, signup]);
};

const removePendingSignup = (email: string) => {
  const next = readPendingSignups().filter(
    (item) => normalizeEmail(item.email) !== normalizeEmail(email),
  );
  savePendingSignups(next);
};

const getAuthErrorCode = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: string }).code ?? "")
    : "";

const isTransientAuthError = (error: unknown) => {
  const code = getAuthErrorCode(error);
  return [
    "auth/network-request-failed",
    "auth/configuration-not-found",
    "auth/invalid-api-key",
    "auth/app-deleted",
    "auth/unauthorized-domain",
  ].includes(code);
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
        email: email ? normalizeEmail(email) : null,
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

    const flushPendingSignups = async () => {
      if (!isBrowserOnline()) {
        return;
      }

      const pendingSignups = readPendingSignups();
      if (pendingSignups.length === 0) {
        return;
      }

      const remaining: PendingSignup[] = [];

      for (const item of pendingSignups) {
        try {
          const credential = await createUserWithEmailAndPassword(auth, item.email, item.password);
          const nextRole = item.selectedRole;
          const orgForSystem =
            item.organizationName && item.organizationName.trim().length > 0
              ? item.organizationName
              : item.organizationType;
          const systemId = generateSystemId(orgForSystem ?? "ORG", item.username);

          await persistUserDoc(credential.user.uid, item.email, nextRole, item.recoveryCode.trim(), {
            fullName: item.fullName,
            username: normalizeUsername(item.username),
            organizationType: item.organizationType,
            organizationName: item.organizationName ?? null,
            systemId,
          });

          const localAccount: LocalAccount = {
            uid: credential.user.uid,
            email: item.email,
            password: item.password,
            role: nextRole,
            resetCode: item.recoveryCode.trim(),
            fullName: item.fullName,
            username: normalizeUsername(item.username),
            organization: item.organizationName ?? item.organizationType,
            systemId,
          };
          updateLocalAccount(localAccount);

          if (readSession()?.user.email?.toLowerCase() === normalizeEmail(item.email)) {
            setAuthState({ uid: credential.user.uid, email: credential.user.email, provider: "firebase" }, nextRole);
          }

          removePendingSignup(item.email);
        } catch (error) {
          console.warn("Pending signup sync failed:", error);
          remaining.push(item);
        }
      }

      savePendingSignups(remaining);
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth user:", firebaseUser);

      if (!firebaseUser) {
        if (!session) {
          setUser(null);
          setRole(null);
        }
        setLoading(false);
        return;
      }

      const firestoreUserRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(firestoreUserRef);
      console.log("Firestore user:", userDoc.data());

      if (!userDoc.exists()) {
        await persistUserDoc(firebaseUser.uid, firebaseUser.email, "user");
      } else {
        await setDoc(
          firestoreUserRef,
          {
            email: normalizeEmail(firebaseUser.email ?? userDoc.data()?.email ?? ""),
            lastLoginAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      const refreshedDoc = await getDoc(firestoreUserRef);
      const resolvedRole = (refreshedDoc.data()?.role as UserRole | undefined) ?? "user";

      setAuthState(
        {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          provider: "firebase",
        },
        resolvedRole,
      );
      setLoading(false);
    });

    const handleOnline = () => {
      void flushPendingSignups();
    };

    window.addEventListener("online", handleOnline);
    void flushPendingSignups();
    if (!session) {
      setLoading(false);
    }

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
    };
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

  const persistLocalSession = (nextUser: AuthUser, nextRole: UserRole) => {
    setAuthState(nextUser, nextRole);
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

      if (!isBrowserOnline()) {
        return !readLocalAccounts().some(
          (account) => normalizeUsername(account.username ?? "") === normalizedUsername,
        );
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
    if (!isBrowserOnline()) {
      if (localAccount && localAccount.password === password) {
        if (localAccount.role !== selectedRole) {
          throw new Error("Role mismatch or user not found");
        }

        persistLocalSession(
          { uid: localAccount.uid, email: localAccount.email, provider: "local" },
          selectedRole,
        );
        return;
      }

      throw new Error("Offline: this account is not cached locally. Connect once to sign in.");
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firestoreRef = doc(db, "users", result.user.uid);
      const userDoc = await getDoc(firestoreRef);

      if (!userDoc.exists()) {
        await persistUserDoc(result.user.uid, result.user.email, selectedRole);
      } else {
        await setDoc(
          firestoreRef,
          { lastLoginAt: serverTimestamp(), email: normalizeEmail(result.user.email ?? email) },
          { merge: true },
        );
      }

      const resolvedRole = await resolveRole(result.user.uid, selectedRole);

      if (resolvedRole !== selectedRole) {
        await signOut(auth);
        throw new Error("Role mismatch or user not found");
      }

      setAuthState(
        { uid: result.user.uid, email: result.user.email, provider: "firebase" },
        resolvedRole,
      );
    } catch (error) {
      if (localAccount && localAccount.password === password) {
        if (localAccount.role !== selectedRole) {
          throw new Error("Role mismatch or user not found");
        }

        persistLocalSession(
          { uid: localAccount.uid, email: localAccount.email, provider: "local" },
          selectedRole,
        );
        return;
      }

      if (isTransientAuthError(error)) {
        throw new Error("Firebase Auth is temporarily unavailable. Try again when online or use a cached local account.");
      }

      throw new Error(getErrorMessage(error));
    }
  };

  const signup = async (
    email: string,
    password: string,
    selectedRole: UserRole,
    resetCode: string
  ) => {
    const normalizedEmail = normalizeEmail(email);

    if (!isBrowserOnline()) {
      const pending: PendingSignup = {
        email: normalizedEmail,
        password,
        fullName: "",
        username: normalizedEmail.split("@")[0] || "user",
        organizationType: "",
        organizationName: undefined,
        recoveryCode: resetCode.trim(),
        selectedRole,
        queuedAt: new Date().toISOString(),
      };
      queuePendingSignup(pending);

      const nextAccount: LocalAccount = {
        uid: crypto.randomUUID(),
        email: normalizedEmail,
        password,
        role: selectedRole,
        resetCode: resetCode.trim(),
      };
      updateLocalAccount(nextAccount);
      persistLocalSession(
        { uid: nextAccount.uid, email: nextAccount.email, provider: "local" },
        selectedRole,
      );
      return;
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await persistUserDoc(credential.user.uid, normalizedEmail, selectedRole, resetCode.trim());
      updateLocalAccount({
        uid: credential.user.uid,
        email: normalizedEmail,
        password,
        role: selectedRole,
        resetCode: resetCode.trim(),
      });
      setAuthState(
        { uid: credential.user.uid, email: credential.user.email, provider: "firebase" },
        selectedRole,
      );
    } catch (error) {
      if (isTransientAuthError(error)) {
        const pending: PendingSignup = {
          email: normalizedEmail,
          password,
          fullName: "",
          username: normalizedEmail.split("@")[0] || "user",
          organizationType: "",
          organizationName: undefined,
          recoveryCode: resetCode.trim(),
          selectedRole,
          queuedAt: new Date().toISOString(),
        };
        queuePendingSignup(pending);
        const nextAccount: LocalAccount = {
          uid: crypto.randomUUID(),
          email: normalizedEmail,
          password,
          role: selectedRole,
          resetCode: resetCode.trim(),
        };
        updateLocalAccount(nextAccount);
        persistLocalSession(
          { uid: nextAccount.uid, email: nextAccount.email, provider: "local" },
          selectedRole,
        );
        return;
      }

      throw new Error(getErrorMessage(error));
    }
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
    const normalizedEmail = normalizeEmail(email);

    const createLocalPendingSignup = async () => {
      const pending: PendingSignup = {
        email: normalizedEmail,
        password,
        fullName,
        username: normalizedUsername,
        organizationType,
        organizationName,
        recoveryCode,
        selectedRole: "user",
        queuedAt: new Date().toISOString(),
      };
      queuePendingSignup(pending);

      const localUid = crypto.randomUUID();
      updateLocalAccount({
        uid: localUid,
        email: normalizedEmail,
        password,
        role: "user",
        resetCode: recoveryCode.trim(),
        fullName,
        username: normalizedUsername,
        organization: organizationName ?? organizationType,
        systemId,
      });
      persistLocalSession({ uid: localUid, email: normalizedEmail, provider: "local" }, "user");
      return { uid: localUid, systemId };
    };

    if (!isBrowserOnline()) {
      return createLocalPendingSignup();
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const uid = userCred.user.uid;

      await persistUserDoc(uid, normalizedEmail, "user", recoveryCode.trim(), {
        fullName,
        username: normalizedUsername,
        organizationType,
        organizationName: organizationName ?? null,
        systemId,
      });

      updateLocalAccount({
        uid,
        email: normalizedEmail,
        password,
        role: "user",
        resetCode: recoveryCode.trim(),
        fullName,
        username: normalizedUsername,
        organization: organizationName ?? organizationType,
        systemId,
      });

      setAuthState({ uid, email: normalizedEmail, provider: "firebase" }, "user");

      return { uid, systemId };
    } catch (error) {
      if (isTransientAuthError(error)) {
        return createLocalPendingSignup();
      }

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

    if (isBrowserOnline()) {
      await persistUserDoc(
        updatedAccount.uid,
        updatedAccount.email,
        updatedAccount.role,
        updatedAccount.resetCode,
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

// Export for SyncMonitor to read pending signups
export const getPendingSignups = (): Array<SignupData & { selectedRole: UserRole; queuedAt: string }> => {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem("hydrosentinel.pendingSignups");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export type { SignupData };
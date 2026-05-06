import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import {
  queuePendingSignup as syncQueuePendingSignup,
  removePendingSignup as syncRemovePendingSignup,
  readPendingSignups as syncReadPendingSignups,
} from "@/lib/syncEngine";
import { getConnectionSnapshot } from "@/lib/connectionManager";

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
    resetCode: "1234",
  },
  {
    uid: "admin-nikhil",
    email: "nikhil@admin.com",
    password: "Nikhil",
    role: "admin",
    resetCode: "1234",
  },
  {
    uid: "admin-harsh",
    email: "harsh@admin.com",
    password: "Harsh",
    role: "admin",
    resetCode: "1234",
  },
  {
    uid: "admin-himanshu",
    email: "himanshu@admin.com",
    password: "Himanshu",
    role: "admin",
    resetCode: "1234",
  },
  {
    uid: "admin-kartik",
    email: "kartik@admin.com",
    password: "Kartik",
    role: "admin",
    resetCode: "1234",
  },
  {
    uid: "admin-khushi",
    email: "khushi@admin.com",
    password: "Khushi",
    role: "admin",
    resetCode: "1234",
  },
];

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  signup: (email: string, password: string, role: UserRole, resetCode: string) => Promise<void>;
  signupWithProfile: (data: SignupData) => Promise<{ uid: string; systemId: string; syncStatus: "synced" | "pending" }>;
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
  authUid?: string;
  syncUid?: string;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const buildPendingSignup = (
  data: SignupData,
  selectedRole: UserRole,
  syncUid?: string,
  authUid?: string,
): PendingSignup => ({
  email: normalizeEmail(data.email),
  password: data.password,
  fullName: data.fullName,
  username: normalizeUsername(data.username),
  organizationType: data.organizationType,
  organizationName: data.organizationName,
  recoveryCode: data.recoveryCode,
  selectedRole,
  queuedAt: new Date().toISOString(),
  syncUid,
  authUid,
});

const isBrowserOnline = () =>
  typeof window === "undefined" ? true : getConnectionSnapshot().status !== "OFFLINE";

const readPendingSignups = (): PendingSignup[] => {
  return syncReadPendingSignups();
};

const savePendingSignups = (items: PendingSignup[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PENDING_SIGNUPS_KEY, JSON.stringify(items));
};

const queuePendingSignup = (signup: PendingSignup) => {
  void syncQueuePendingSignup(signup);
};

const removePendingSignup = (email: string) => {
  syncRemovePendingSignup(email);
};

const getAuthErrorCode = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: string }).code ?? "")
    : "";

const isRetryableSyncError = (error: unknown) => {
  const code = getAuthErrorCode(error);
  return ["auth/network-request-failed", "unavailable", "deadline-exceeded", "resource-exhausted", "aborted"].includes(code);
};

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
    throw error;
  }
};

const getErrorMessage = (error: unknown) => {
  const code = getAuthErrorCode(error);
  const mapped: Record<string, string> = {
    "auth/network-request-failed":
      "Unable to connect to login service. Please check your internet connection and try again.",
    "auth/configuration-not-found":
      "Authentication is not configured correctly. Please contact support.",
    "auth/invalid-api-key":
      "There is a problem with the login system configuration. Please refresh the page or try again later.",
    "auth/app-deleted":
      "Authentication service is unavailable at the moment. Please try again later.",
    "auth/unauthorized-domain":
      "This website is not authorized for login. Please use the official Hydrosentinel site.",
    "auth/user-not-found":
      "No account was found for that email. Please check your email or sign up.",
    "auth/wrong-password":
      "Incorrect password. Please try again or reset your password.",
    "auth/invalid-email":
      "Please enter a valid email address.",
    "auth/too-many-requests":
      "Too many login attempts. Please wait a few minutes and try again.",
    "auth/user-disabled":
      "This account has been disabled. If you think this is a mistake, contact support.",
    "auth/email-already-in-use":
      "An account already exists with this email address.",
    "auth/weak-password":
      "Please choose a stronger password with at least 6 characters.",
    "auth/operation-not-allowed":
      "Email/password sign-in is currently disabled for this project.",
    "auth/invalid-credential":
      "The email or password is incorrect.",
    "permission-denied":
      "Your account was created, but Firebase denied the profile write. Please contact support or check Firestore rules.",
    "unavailable":
      "Firebase is temporarily unavailable. Please try again shortly.",
    "failed-precondition":
      "Firebase is not ready to save this account yet. Please try again.",
    "deadline-exceeded":
      "Firebase timed out while saving this account. Please try again.",
    "resource-exhausted":
      "Firebase quota was exceeded while saving this account. Please try again later.",
    "aborted":
      "Firebase cancelled the account save. Please try again.",
  };

  if (mapped[code]) {
    return mapped[code];
  }

  if (error instanceof Error) {
    if (error.message.includes("Firebase Auth is temporarily unavailable")) {
      return "Login service is temporarily unavailable. Try again when you are online, or use a cached local account if available.";
    }

    return error.message;
  }

  return "Authentication failed. Please try again.";
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
          const credential = item.authUid
            ? { user: { uid: item.authUid, email: item.email } }
            : await createUserWithEmailAndPassword(auth, item.email, item.password);
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
          if (getAuthErrorCode(error) === "auth/email-already-in-use" && !item.authUid) {
            try {
              const recovered = await signInWithEmailAndPassword(auth, item.email, item.password);
              const nextRole = item.selectedRole;
              const orgForSystem =
                item.organizationName && item.organizationName.trim().length > 0
                  ? item.organizationName
                  : item.organizationType;
              const systemId = generateSystemId(orgForSystem ?? "ORG", item.username);

              await persistUserDoc(recovered.user.uid, item.email, nextRole, item.recoveryCode.trim(), {
                fullName: item.fullName,
                username: normalizeUsername(item.username),
                organizationType: item.organizationType,
                organizationName: item.organizationName ?? null,
                systemId,
              });

              updateLocalAccount({
                uid: recovered.user.uid,
                email: item.email,
                password: item.password,
                role: nextRole,
                resetCode: item.recoveryCode.trim(),
                fullName: item.fullName,
                username: normalizeUsername(item.username),
                organization: item.organizationName ?? item.organizationType,
                systemId,
              });

              if (readSession()?.user.email?.toLowerCase() === normalizeEmail(item.email)) {
                setAuthState({ uid: recovered.user.uid, email: recovered.user.email, provider: "firebase" }, nextRole);
              }

              removePendingSignup(item.email);
              continue;
            } catch (retryError) {
              console.warn("Pending signup recovery failed:", retryError);
            }
          }

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
      try {
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
      } catch (error) {
        console.warn("Firestore profile refresh failed:", error);
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
      console.log("[Auth] Connection restored, flushing pending signups");
      void flushPendingSignups();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isBrowserOnline()) {
        console.log("[Auth] App became visible, flushing pending signups");
        void flushPendingSignups();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void flushPendingSignups();
    if (!session) {
      setLoading(false);
    }

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
      const localUid = crypto.randomUUID();
      const pending = buildPendingSignup(
        {
          email: normalizedEmail,
          password,
          fullName: "",
          username: normalizedEmail.split("@")[0] || "user",
          organizationType: "",
          organizationName: undefined,
          recoveryCode: resetCode.trim(),
        },
        selectedRole,
        localUid,
      );
      queuePendingSignup(pending);

      const nextAccount: LocalAccount = {
        uid: localUid,
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
      try {
        await persistUserDoc(credential.user.uid, normalizedEmail, selectedRole, resetCode.trim());
      } catch (error) {
        if (isRetryableSyncError(error)) {
          const pending = buildPendingSignup(
            {
              email: normalizedEmail,
              password,
              fullName: "",
              username: normalizedEmail.split("@")[0] || "user",
              organizationType: "",
              organizationName: undefined,
              recoveryCode: resetCode.trim(),
            },
            selectedRole,
            credential.user.uid,
            credential.user.uid,
          );
          queuePendingSignup(pending);

          const nextAccount: LocalAccount = {
            uid: credential.user.uid,
            email: normalizedEmail,
            password,
            role: selectedRole,
            resetCode: resetCode.trim(),
          };
          updateLocalAccount(nextAccount);
          persistLocalSession(
            { uid: nextAccount.uid, email: nextAccount.email, provider: "firebase" },
            selectedRole,
          );
          return;
        }

        await signOut(auth);
        throw new Error(getErrorMessage(error));
      }

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
        const localUid = crypto.randomUUID();
        const pending = buildPendingSignup(
          {
            email: normalizedEmail,
            password,
            fullName: "",
            username: normalizedEmail.split("@")[0] || "user",
            organizationType: "",
            organizationName: undefined,
            recoveryCode: resetCode.trim(),
          },
          selectedRole,
          localUid,
        );
        queuePendingSignup(pending);
        const nextAccount: LocalAccount = {
          uid: localUid,
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
      const localUid = crypto.randomUUID();
      const pending = buildPendingSignup(
        {
          email: normalizedEmail,
          password,
          fullName,
          username: normalizedUsername,
          organizationType,
          organizationName,
          recoveryCode,
        },
        "user",
        localUid,
      );
      queuePendingSignup(pending);
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
      return { uid: localUid, systemId, syncStatus: "pending" as const };
    };

    if (!isBrowserOnline()) {
      return createLocalPendingSignup();
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const uid = userCred.user.uid;

      try {
        await persistUserDoc(uid, normalizedEmail, "user", recoveryCode.trim(), {
          fullName,
          username: normalizedUsername,
          organizationType,
          organizationName: organizationName ?? null,
          systemId,
        });
      } catch (error) {
        if (isRetryableSyncError(error)) {
          const pending = buildPendingSignup(
            {
              email: normalizedEmail,
              password,
              fullName,
              username: normalizedUsername,
              organizationType,
              organizationName,
              recoveryCode,
            },
            "user",
            uid,
            uid,
          );
          queuePendingSignup(pending);

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
          return { uid, systemId, syncStatus: "pending" as const };
        }

        await signOut(auth);
        throw new Error(getErrorMessage(error));
      }

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

      return { uid, systemId, syncStatus: "synced" as const };
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
export const getPendingSignups = (): Array<SignupData & { selectedRole: UserRole; queuedAt: string; authUid?: string }> => {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem("hydrosentinel.pendingSignups");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const triggerPendingSignupSync = async () => {
  if (typeof window === "undefined") return;
  
  if (!isBrowserOnline()) {
    console.warn("[Sync] Cannot sync pending signups: offline");
    return;
  }

  const pendingSignups = readPendingSignups();
  if (pendingSignups.length === 0) {
    console.log("[Sync] No pending signups to sync");
    return;
  }

  console.log(`[Sync] Attempting to sync ${pendingSignups.length} pending signups`);
  const remaining: PendingSignup[] = [];

  for (const item of pendingSignups) {
    try {
      const credential = item.authUid
        ? { user: { uid: item.authUid, email: item.email } }
        : await createUserWithEmailAndPassword(auth, item.email, item.password);
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

      console.log(`[Sync] Successfully synced signup for ${item.email}`);
      removePendingSignup(item.email);
    } catch (error) {
      if (getAuthErrorCode(error) === "auth/email-already-in-use" && !item.authUid) {
        try {
          const recovered = await signInWithEmailAndPassword(auth, item.email, item.password);
          const nextRole = item.selectedRole;
          const orgForSystem =
            item.organizationName && item.organizationName.trim().length > 0
              ? item.organizationName
              : item.organizationType;
          const systemId = generateSystemId(orgForSystem ?? "ORG", item.username);

          await persistUserDoc(recovered.user.uid, item.email, nextRole, item.recoveryCode.trim(), {
            fullName: item.fullName,
            username: normalizeUsername(item.username),
            organizationType: item.organizationType,
            organizationName: item.organizationName ?? null,
            systemId,
          });

          console.log(`[Sync] Recovered and synced signup for ${item.email}`);
          removePendingSignup(item.email);
          continue;
        } catch (retryError) {
          console.warn(`[Sync] Failed to recover signup for ${item.email}:`, retryError);
        }
      }

      console.warn(`[Sync] Failed to sync signup for ${item.email}:`, error);
      remaining.push(item);
    }
  }

  savePendingSignups(remaining);
  console.log(`[Sync] Completed with ${remaining.length} failures`);
};

export type { SignupData };
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut,
  Auth,
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/firebase";

// Simple hash function (for demo - use bcrypt in production)
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

// Verify password hash
export const verifyPasswordHash = async (password: string, hash: string): Promise<boolean> => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
};

// Initialize reCAPTCHA verifier (invisible)
export const initializeRecaptcha = (auth: Auth): RecaptchaVerifier => {
  try {
    return new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: (token) => {
        console.log("reCAPTCHA token received:", token);
      },
    });
  } catch (error) {
    console.error("Error initializing reCAPTCHA:", error);
    throw new Error("Failed to initialize reCAPTCHA");
  }
};

// Send OTP to phone number
export const sendOTP = async (phoneNumber: string): Promise<ConfirmationResult> => {
  try {
    const cleanedNumber = phoneNumber.replace(/\D/g, "");
    if (cleanedNumber.length < 10) {
      throw new Error("Invalid phone number format");
    }

    let formattedNumber = phoneNumber;
    if (!phoneNumber.startsWith("+")) {
      formattedNumber = "+91" + cleanedNumber.slice(-10);
    }

    const recaptchaVerifier = initializeRecaptcha(auth);
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      formattedNumber,
      recaptchaVerifier
    );

    return confirmationResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send OTP";
    throw new Error(errorMessage);
  }
};

// Verify OTP
export const verifyOTP = async (
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<string> => {
  try {
    const userCredential = await confirmationResult.confirm(otp);
    return userCredential.user.uid;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Invalid OTP";
    throw new Error(errorMessage);
  }
};

// Check if phone number already exists
export const checkPhoneExists = async (phone: string): Promise<boolean> => {
  try {
    const cleanedPhone = "+91" + phone.replace(/\D/g, "").slice(-10);
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("phone", "==", cleanedPhone));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking phone:", error);
    return false;
  }
};

// Register user with phone and password
export const registerUser = async (
  uid: string,
  phone: string,
  password: string,
  name: string = ""
): Promise<void> => {
  try {
    const cleanedPhone = "+91" + phone.replace(/\D/g, "").slice(-10);
    const passwordHash = await hashPassword(password);

    await setDoc(doc(db, "users", uid), {
      uid,
      phone: cleanedPhone,
      passwordHash,
      name: name || "Water Monitor",
      role: "user",
      provider: "phone",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      locations: ["default"],
      deviceCount: 0,
      uniqueId: `USER_${uid.slice(0, 8).toUpperCase()}`,
    });

    // Store in localStorage for offline access
    const userSession = {
      uid,
      phone: cleanedPhone,
      name: name || "Water Monitor",
      lastLoginAt: new Date().toISOString(),
    };
    localStorage.setItem("hydrosentinel_user", JSON.stringify(userSession));
  } catch (error) {
    console.error("Error registering user:", error);
    throw new Error("Failed to register user");
  }
};

// Phone + Password Login
export const loginWithPhonePassword = async (
  phone: string,
  password: string
): Promise<{ uid: string; name: string }> => {
  try {
    const cleanedPhone = "+91" + phone.replace(/\D/g, "").slice(-10);

    // Query Firestore for user with this phone
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("phone", "==", cleanedPhone));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("User not found");
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Verify password
    const isPasswordValid = await verifyPasswordHash(password, userData.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Incorrect password");
    }

    // Update last login
    await setDoc(
      doc(db, "users", userDoc.id),
      { lastLoginAt: new Date().toISOString() },
      { merge: true }
    );

    // Store session
    const userSession = {
      uid: userDoc.id,
      phone: cleanedPhone,
      name: userData.name,
      lastLoginAt: new Date().toISOString(),
    };
    localStorage.setItem("hydrosentinel_user", JSON.stringify(userSession));

    return {
      uid: userDoc.id,
      name: userData.name,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Login failed";
    throw new Error(errorMessage);
  }
};

// Get stored session
export const getStoredSession = () => {
  try {
    const session = localStorage.getItem("hydrosentinel_user");
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
};

// Clear session
export const clearSession = async (): Promise<void> => {
  try {
    await signOut(auth);
    localStorage.removeItem("hydrosentinel_user");
  } catch (error) {
    console.error("Error logging out:", error);
    throw new Error("Failed to logout");
  }
};


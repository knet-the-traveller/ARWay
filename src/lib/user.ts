export interface User {
  name: string;
  username: string;
  email: string;
  bio: string;
}

const DEFAULT_USER: User = {
  name: "Knet",
  username: "knet",
  email: "knet@example.com",
  bio: "Exploring Manila one place at a time."
};

const USER_KEY = "arway_user";
const SESSION_KEY = "arway_session";

export function getUser(): User {
  if (typeof window === "undefined") return DEFAULT_USER;
  try {
    const data = localStorage.getItem(USER_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return DEFAULT_USER;
  } catch (err) {
    console.error("Failed to get user", err);
    return DEFAULT_USER;
  }
}

export function saveUser(user: User): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error("Failed to save user", err);
  }
}

export function isSignedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const session = localStorage.getItem(SESSION_KEY);
    if (session === null) {
      // Default to signed in on first visit
      localStorage.setItem(SESSION_KEY, "1");
      return true;
    }
    return session === "1";
  } catch (err) {
    console.error("Failed to check session", err);
    return false;
  }
}

export function signIn(user: User): void {
  if (typeof window === "undefined") return;
  try {
    saveUser(user);
    localStorage.setItem(SESSION_KEY, "1");
  } catch (err) {
    console.error("Failed to sign in", err);
  }
}

export function signOut(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.error("Failed to sign out", err);
  }
}

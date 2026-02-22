import { createAuthClient } from "better-auth/client";
import { adminClient, usernameClient } from "better-auth/client/plugins";
import { CMS_API_URL } from "./config.js";

export const authClient = createAuthClient({
  baseURL: CMS_API_URL || window.location.origin,
  basePath: "/api/auth",
  plugins: [adminClient(), usernameClient()],
});

let currentUser = null;
const listeners = new Set();

export const getUser = () => currentUser;

export const onAuthChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => listeners.forEach((fn) => fn(currentUser));

export const refreshSession = async () => {
  try {
    const { data } = await authClient.getSession();
    currentUser = data?.user || null;
  } catch {
    currentUser = null;
  }
  notify();
  return currentUser;
};

export const signIn = async (email, password) => {
  const { data, error } = await authClient.signIn.email({ email, password });
  if (error) throw new Error(error.message || "Sign in failed");
  currentUser = data?.user || null;
  notify();
  return currentUser;
};

export const signUp = async (email, password, name, username) => {
  const { data, error } = await authClient.signUp.email({
    email,
    password,
    name,
    username,
  });
  if (error) throw new Error(error.message || "Sign up failed");
  currentUser = data?.user || null;
  notify();
  return currentUser;
};

export const signOut = async () => {
  await authClient.signOut();
  currentUser = null;
  notify();
};

export const isAdmin = () => currentUser?.role === "admin";

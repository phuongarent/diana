"use client";

export default function NextAuthSessionProvider({ children }) {
  // Auth disabled in current focus; this provider is a no-op wrapper.
  return <>{children}</>;
}
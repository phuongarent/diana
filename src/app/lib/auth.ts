// Authentication is disabled in the current project focus.
// Return null for session-based user lookup so code depending on this
// function continues to work without next-auth.
export async function getSessionUser(): Promise<{ id?: string } | null> {
  return null;
}
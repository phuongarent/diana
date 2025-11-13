"use client";

// Auth disabled: provide a simple no-op sign-in button.
export default function SignInButton() {
  const session = null;
  function signIn(provider) {
    // no-op: authentication disabled in current development focus
    console.info("signIn called (noop)", provider);
  }
  function signOut() {
    // no-op
    console.info("signOut called (noop)");
  }

  if (session && session.user) {
    return (
      <div className="flex gap-4 ml-auto">
        <p className="text-sky-600">{session.user.name}</p>
        <img src={session.user.image} alt="Profile" className="w-8 h-8 rounded-full" />
        <button onClick={() => signOut()} className="text-red-600">
          Sign Out
        </button>
      </div>
    );
  }
  return (
    <button onClick={() => signIn("google")} className="text-green-600 ml-auto">
      Sign In
    </button>
  );
}
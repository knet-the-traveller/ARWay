import Link from "next/link";
import { useState } from "react";
import { getUser, signIn } from "@/lib/user";

interface SignInScreenProps {
  onSignIn: () => void;
}

export default function SignInScreen({ onSignIn }: SignInScreenProps) {
  const existingUser = getUser();
  const [email, setEmail] = useState(existingUser.email || "");
  const [password, setPassword] = useState("");
  const [imgError, setImgError] = useState(false);

  // We keep validation basic to mock it
  const isValid = email.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    // Use the email prefix as a quick mock username/name
    const nameStr = email.split('@')[0];

    signIn({
      ...existingUser,
      name: nameStr,
      email: email.trim()
    });
    onSignIn();
  };

  const handleGuest = (e: React.MouseEvent) => {
    e.preventDefault();
    signIn({ ...existingUser, name: "Guest", email: "guest@example.com" });
    onSignIn();
  };

  return (
    <main 
      className="absolute top-0 left-0 right-0 flex flex-col bg-[var(--aw-bg)] text-white overflow-y-auto no-scrollbar z-[100]"
      style={{ bottom: "calc(-56px - env(safe-area-inset-bottom))" }}
    >
      
      {/* Glow Effect behind Mascot */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[240px] h-[240px] bg-[var(--aw-accent)]/10 blur-[60px] rounded-full pointer-events-none z-0" />

      <div 
        className="flex flex-col items-center w-full max-w-sm px-6 m-auto shrink-0 z-10"
        style={{ paddingTop: "24px", paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
      >
        
        {/* Mascot Image container */}
        <div className="relative flex flex-col items-center w-full mb-2 shrink-0">
          {!imgError && (
            <img 
              src="/mascot1.png" 
              alt="ARWay" 
              width={240} 
              height={210} 
              loading="eager" 
              decoding="async"
              className="object-contain w-auto max-w-[240px] max-h-[210px]"
              style={{
                WebkitMaskImage: "radial-gradient(ellipse at center, black 70%, transparent 100%)",
                maskImage: "radial-gradient(ellipse at center, black 70%, transparent 100%)"
              }}
              onError={() => setImgError(true)}
            />
          )}
        </div>

        <div className="w-full flex flex-col items-center shrink-0">
          <h1 className="sr-only">ARWay</h1>
          <p className="text-[var(--aw-muted)] text-[15px] mb-4 text-center">
            Point. Discover. Share. Even off the grid.
          </p>
          
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5">
            <input
              type="text"
              placeholder="Email or Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 h-[44px] text-white text-[15px] focus:outline-none focus:border-[var(--aw-accent)]"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 h-[44px] text-white text-[15px] focus:outline-none focus:border-[var(--aw-accent)]"
            />
            <button
              type="submit"
              disabled={!isValid}
              className="w-full rounded-xl h-[46px] font-bold text-[16px] disabled:opacity-50 mt-1 transition-opacity text-[var(--aw-bg)]"
              style={{ backgroundColor: "var(--aw-accent)" }}
            >
              Log In
            </button>
          </form>
          
          <p className="text-[#9ca3af] text-[12px] mt-2 mb-2 text-center">
            Prototype: accounts are saved on this device only.
          </p>

          <div className="w-full flex items-center gap-3 my-1">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[13px] text-white/40">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            disabled
            aria-disabled="true"
            className="w-full flex flex-col items-center justify-center bg-white/5 rounded-xl h-[46px] mt-2 opacity-50 relative pointer-events-none"
          >
            <span className="font-semibold text-[15px] text-white">Continue with Google</span>
            <span className="text-[10px] text-[var(--aw-accent)] absolute bottom-0.5">Coming soon</span>
          </button>

          <button
            type="button"
            onClick={handleGuest}
            className="mt-4 text-[14px] font-semibold text-[var(--aw-muted)] active:text-white"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </main>
  );
}

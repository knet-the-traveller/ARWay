import { useState } from "react";
import { getUser, signIn } from "@/lib/user";

interface SignInScreenProps {
  onSignIn: () => void;
}

export default function SignInScreen({ onSignIn }: SignInScreenProps) {
  const existingUser = getUser();
  const [name, setName] = useState(existingUser.name || "");
  const [email, setEmail] = useState(existingUser.email || "");

  const isValid = name.trim().length > 0 && email.includes("@") && email.includes(".");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    signIn({
      ...existingUser,
      name: name.trim(),
      email: email.trim()
    });
    onSignIn();
  };

  return (
    <main className="flex flex-col w-full flex-1 bg-black text-white items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-2">ARWay</h1>
        <p className="text-gray-400 mb-8">Find your way, in AR.</p>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-neutral-900 border border-gray-700 rounded-xl p-4 text-white text-[16px] focus:outline-none focus:border-blue-500"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-neutral-900 border border-gray-700 rounded-xl p-4 text-white text-[16px] focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!isValid}
            className="w-full bg-blue-500 text-white rounded-xl h-[48px] font-semibold text-lg disabled:opacity-50 mt-4 active:bg-blue-600 transition-colors"
          >
            Sign In
          </button>
        </form>
        <p className="text-gray-500 text-sm mt-4 text-center">
          Prototype: no password needed.
        </p>
      </div>
    </main>
  );
}

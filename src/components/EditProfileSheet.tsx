import { useState } from "react";
import { User, saveUser } from "@/lib/user";
import { CloseIcon } from "./icons";

interface EditProfileSheetProps {
  user: User;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

export default function EditProfileSheet({ user, onClose, onSuccess }: EditProfileSheetProps) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio);

  const nameError = !name.trim() ? "Name is required" : name.length > 30 ? "Name max 30 characters" : null;
  const usernameError = !username.trim() 
    ? "Username is required" 
    : username.length > 20 
      ? "Username max 20 characters" 
      : !/^[a-z0-9._]+$/.test(username) 
        ? "Only lowercase letters, numbers, dots, and underscores allowed" 
        : null;
  const emailError = !email.trim() 
    ? "Email is required" 
    : (!email.includes("@") || !email.includes(".")) 
      ? "Invalid email format" 
      : null;

  const isInvalid = nameError || usernameError || emailError;

  const handleSave = () => {
    if (isInvalid) return;
    const updated = {
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      bio: bio.trim(),
    };
    saveUser(updated);
    onSuccess(updated);
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="fixed bottom-0 left-0 right-0 max-h-[80vh] h-full bg-[#1c1c1e] z-[101] rounded-t-2xl flex flex-col sm:w-[375px] sm:left-1/2 sm:-translate-x-1/2">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
          <h2 className="text-white font-semibold text-lg">Edit Profile</h2>
          <button onClick={onClose} className="p-1 active:opacity-70 text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-sm ml-1">Name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={30}
              className={`w-full bg-neutral-900 border ${nameError ? 'border-red-500' : 'border-gray-700'} rounded-lg p-3 text-white text-[16px] focus:outline-none focus:border-blue-500`}
            />
            {nameError && <span className="text-red-500 text-xs ml-1">{nameError}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-sm ml-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={20}
              className={`w-full bg-neutral-900 border ${usernameError ? 'border-red-500' : 'border-gray-700'} rounded-lg p-3 text-white text-[16px] focus:outline-none focus:border-blue-500`}
            />
            {usernameError && <span className="text-red-500 text-xs ml-1">{usernameError}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-sm ml-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full bg-neutral-900 border ${emailError ? 'border-red-500' : 'border-gray-700'} rounded-lg p-3 text-white text-[16px] focus:outline-none focus:border-blue-500`}
            />
            {emailError && <span className="text-red-500 text-xs ml-1">{emailError}</span>}
          </div>

          <div className="flex flex-col gap-1 pb-6">
            <div className="flex items-center justify-between ml-1 mr-1">
              <label className="text-gray-400 text-sm">Bio</label>
              <span className="text-gray-500 text-xs">{bio.length} / 100</span>
            </div>
            <textarea 
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, 100))}
              className="w-full bg-neutral-900 border border-gray-700 rounded-lg p-3 text-white text-[16px] focus:outline-none focus:border-blue-500 resize-none h-24"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-[#1c1c1e] shrink-0" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
          <button 
            onClick={handleSave}
            disabled={!!isInvalid}
            className="w-full bg-[#3b82f6] text-white rounded-xl h-[48px] font-semibold text-lg disabled:opacity-50 active:bg-blue-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}

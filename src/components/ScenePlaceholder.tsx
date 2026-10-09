export default function ScenePlaceholder() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 80 80" preserveAspectRatio="none">
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c5e9ff" />
          <stop offset="100%" stopColor="#f4fbff" />
        </linearGradient>
      </defs>
      
      {/* Sky */}
      <rect width="80" height="80" fill="url(#skyGrad)" />
      
      {/* Cloud */}
      <path d="M 25 22 C 25 18 31 18 32 21 C 35 19 39 23 37 26 C 39 29 34 32 30 30 C 27 32 21 30 22 26 C 19 25 21 21 25 22 Z" fill="#ffffff" opacity="0.9" />
      
      {/* Back hill */}
      <ellipse cx="60" cy="70" rx="45" ry="30" fill="#c6e08a" />
      
      {/* Front hill */}
      <ellipse cx="25" cy="75" rx="45" ry="30" fill="#8aa500" />
    </svg>
  );
}

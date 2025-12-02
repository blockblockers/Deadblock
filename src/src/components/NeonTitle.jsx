// Reusable neon gradient title component

const NeonTitle = ({ children, className = "" }) => (
  <h1 className={`font-bold bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] ${className}`}>
    {children}
  </h1>
);

export default NeonTitle;
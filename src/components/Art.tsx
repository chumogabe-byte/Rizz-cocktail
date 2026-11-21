/** Gradient "photo" placeholder with a glowing emoji. Replace with real photography via the `img` prop. */
export function Art({ emoji, gradient, size = 'md', img, className = '' }: {
  emoji: string; gradient: [string, string]; size?: 'sm' | 'md' | 'lg' | 'xl'; img?: string; className?: string;
}) {
  return (
    <div className={`art art-${size} ${className}`}
      style={{ background: img ? `center/cover url(${img})` : `radial-gradient(120% 90% at 30% 20%, ${gradient[0]} 0%, ${gradient[1]} 70%, #0b0816 100%)` }}>
      {!img && <span className="art-emoji">{emoji}</span>}
      <span className="art-shine" />
    </div>
  );
}

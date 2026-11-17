const ProgressRing = ({ percentage }) => {
  const safePercentage = Math.min(100, Math.max(0, percentage || 0));
  const degrees = (safePercentage / 100) * 360;
  
  return (
    <div 
      className="relative w-[116px] h-[116px] rounded-full flex items-center justify-center shrink-0"
      style={{
        background: `conic-gradient(var(--color-accent) ${degrees}deg, var(--color-line) ${degrees}deg)`
      }}
    >
      <div className="absolute w-[94px] h-[94px] bg-paper rounded-full flex flex-col items-center justify-center">
        <span className="font-display font-bold text-2xl tracking-tight text-ink">
          {safePercentage}%
        </span>
        <span className="text-[10px] font-bold tracking-[0.05em] text-muted uppercase mt-0.5">
          Complete
        </span>
      </div>
    </div>
  );
};

export default ProgressRing;

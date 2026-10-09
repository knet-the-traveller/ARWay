import { useRef, useState } from "react";

interface SplitHandleProps {
  ratio: number;
  min: number;
  max: number;
  onChange: (ratio: number) => void;
  onCommit: (ratio: number) => void;
  onReset: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function SplitHandle({
  ratio,
  min,
  max,
  onChange,
  onCommit,
  onReset,
  containerRef
}: SplitHandleProps) {
  const [dragging, setDragging] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const dragRatioRef = useRef(ratio);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current || !handleRef.current) return;
    
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onReset();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    e.preventDefault();
    handleRef.current.setPointerCapture(e.pointerId);
    setDragging(true);
    dragRatioRef.current = ratio;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let newRatio = (e.clientY - rect.top) / rect.height;
    if (newRatio < min) newRatio = min;
    if (newRatio > max) newRatio = max;
    
    if (Math.abs(newRatio - dragRatioRef.current) > 0.001) {
      dragRatioRef.current = newRatio;
      requestAnimationFrame(() => {
        onChange(dragRatioRef.current);
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging || !handleRef.current) return;
    handleRef.current.releasePointerCapture(e.pointerId);
    setDragging(false);
    onCommit(dragRatioRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let newRatio = ratio;
    if (e.key === "ArrowUp") {
      newRatio -= 0.03;
    } else if (e.key === "ArrowDown") {
      newRatio += 0.03;
    } else {
      return;
    }
    
    if (newRatio < min) newRatio = min;
    if (newRatio > max) newRatio = max;
    onChange(newRatio);
    onCommit(newRatio);
  };

  return (
    <div
      ref={handleRef}
      className="w-full relative z-[2000] flex justify-center items-center select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      style={{
        height: "20px",
        backgroundColor: "#18181b",
        borderTop: "1px solid #27272a",
        borderBottom: "1px solid #27272a",
        touchAction: "none"
      }}
      role="separator"
      aria-orientation="horizontal"
      aria-valuemin={Math.round(min * 100)}
      aria-valuemax={Math.round(max * 100)}
      aria-valuenow={Math.round(ratio * 100)}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      {/* Invisible hit area 44px tall (12px above and 12px below the 20px bar) */}
      <div 
        className="absolute inset-x-0 -top-[12px] -bottom-[12px] cursor-ns-resize"
        style={{ background: "transparent" }}
      />
      
      {/* Visible Pill */}
      <div
        className={`rounded-full transition-all duration-150 ${dragging ? 'bg-[#d4d4d8]' : 'bg-[#a1a1aa]'}`}
        style={{
          width: dragging ? "48px" : "44px",
          height: dragging ? "6px" : "5px",
          pointerEvents: "none"
        }}
      />
    </div>
  );
}

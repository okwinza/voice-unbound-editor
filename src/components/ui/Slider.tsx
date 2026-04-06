import { cn } from "@/lib/cn";

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  "aria-label"?: string;
  "data-testid"?: string;
  id?: string;
  className?: string;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  disabled,
  id,
  className,
  ...rest
}: SliderProps) {
  return (
    <input
      type="range"
      id={id}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onValueChange(parseFloat(e.target.value))}
      disabled={disabled}
      aria-label={rest["aria-label"]}
      data-testid={rest["data-testid"]}
      className={cn(
        "h-4 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    />
  );
}

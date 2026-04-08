import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AINativeBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export const AINativeBadge = ({ className, size = "md" }: AINativeBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary/15 to-pink-500/15 border border-primary/20 font-medium text-foreground",
        size === "sm" ? "px-2.5 py-1 text-xs gap-1" : "px-4 py-2 text-sm gap-2",
        className
      )}
    >
      <Sparkles className={cn("text-primary", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      AI-Native {size === "md" ? "desde 2025" : ""}
    </span>
  );
};

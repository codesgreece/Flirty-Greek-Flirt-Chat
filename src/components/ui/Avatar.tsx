import { cn } from "@/lib/cn";

export function Avatar({
  src,
  name,
  size = 56,
  online,
  verified,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  online?: boolean;
  verified?: boolean;
  className?: string;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "•";
  return (
    <span className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full border border-white/20 object-cover"
        />
      ) : (
        <span className="grid h-full w-full place-items-center rounded-full border border-white/20 bg-gradient-to-br from-flirty-pink/70 to-indigo-600 text-sm font-bold">
          {initial}
        </span>
      )}
      {verified ? (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-indigo-500 text-[10px] text-white">
          ✓
        </span>
      ) : null}
      {online ? (
        <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[#07040d] bg-emerald-400" />
      ) : null}
    </span>
  );
}

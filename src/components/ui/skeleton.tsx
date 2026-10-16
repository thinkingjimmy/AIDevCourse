/**
 * [INPUT]: Native div props and shared Tailwind surface tokens.
 * [OUTPUT]: Skeleton placeholder with reduced-motion-aware global defaults.
 * [POS]: Optional shadcn loading primitive for the sidebar.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }

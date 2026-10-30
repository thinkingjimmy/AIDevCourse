import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap no-underline transition-[background-color,color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        action: "transition-none border border-foreground bg-foreground text-white hover:bg-strong",
        "action-outline": "transition-none border border-border bg-background text-foreground hover:bg-surface",
        "action-raised": "transition-none border border-border bg-background text-muted-foreground shadow-[4px_4px_0_var(--line)] hover:bg-surface",
        keyboard: "transition-none border border-border bg-transparent font-mono font-normal text-muted-foreground",
        paper: "border border-foreground bg-transparent text-inherit hover:bg-accent active:translate-y-px",
        plain: "transition-none leading-[inherit] rounded-none bg-transparent font-normal text-inherit",
        preview: "transition-none bg-[#18181b] text-inherit hover:bg-[#27272a]",
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        action: "transition-none h-11 gap-1.5 rounded-[10px] px-[18px] py-0 text-ui leading-none",
        keyboard: "transition-none h-auto min-h-0 gap-2.5 rounded-md px-2 py-0.5 text-xs leading-snug",
        paper: "h-auto min-h-12 gap-2.5 rounded-[3px] px-[22px] py-0 text-ui leading-tight whitespace-normal",
        reset: "h-auto gap-0 rounded-none p-0 text-inherit leading-[inherit]",
        preview: "transition-none h-9 leading-[inherit] rounded-md px-3.5 py-0 text-sm",
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-touch": "relative size-8 touch-manipulation before:absolute before:-inset-1.5",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    compoundVariants: [{ variant: "action-raised", className: "rounded-none" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? type : type ?? "button"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

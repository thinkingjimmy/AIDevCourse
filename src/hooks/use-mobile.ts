/**
 * [INPUT]: The viewport width.
 * [OUTPUT]: True when the lesson sidebar should use its mobile sheet (≤960px).
 * [POS]: shadcn sidebar breakpoint. The lesson shell is the only caller.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { useSyncExternalStore } from "react"

const QUERY = "(max-width: 960px)"

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false)
}

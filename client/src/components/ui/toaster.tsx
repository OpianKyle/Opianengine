import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  // Our simplified implementation doesn't track toasts in an array
  // so we'll just render the ToastProvider and viewport
  return (
    <ToastProvider>
      <ToastViewport />
    </ToastProvider>
  )
}

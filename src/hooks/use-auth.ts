// src/hooks/use-auth.ts
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function useAuth(requireAuth = true) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router, requireAuth])

  return {
    user: session?.user,
    loading: status === "loading",
    authenticated: status === "authenticated",
  }
}

export function useRequireAuth() {
  return useAuth(true)
}
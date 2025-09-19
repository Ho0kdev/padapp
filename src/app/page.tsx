// src/app/page.tsx (página principal que redirija al dashboard)
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/auth/login")
  }
}
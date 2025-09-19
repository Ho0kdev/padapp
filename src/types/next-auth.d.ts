// src/types/next-auth.d.ts
import { UserRole, UserStatus } from "@prisma/client"
import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    role: UserRole
    status: UserStatus
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: UserRole
      status: UserStatus
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    status: UserStatus
  }
}
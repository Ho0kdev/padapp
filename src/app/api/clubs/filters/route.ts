import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, handleAuthError } from "@/lib/rbac"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    // Get unique cities and countries
    const clubs = await prisma.club.findMany({
      select: {
        city: true,
        country: true
      },
      distinct: ['city', 'country']
    })

    // Extract unique cities
    const cities = Array.from(new Set(clubs.map(c => c.city)))
      .filter(Boolean)
      .sort()
      .map(city => ({ value: city, label: city }))

    // Extract unique countries
    const countries = Array.from(new Set(clubs.map(c => c.country)))
      .filter(Boolean)
      .sort()
      .map(country => ({ value: country, label: country }))

    return NextResponse.json({
      cities,
      countries
    })

  } catch (error) {
    return handleAuthError(error)
  }
}

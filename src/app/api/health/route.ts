import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/health
 * Health check endpoint para Docker healthcheck y monitoreo
 *
 * Verifica:
 * - Que la aplicación esté respondiendo
 * - Que la conexión a la base de datos funcione
 */
export async function GET() {
  try {
    // Verificar conexión a la base de datos
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        database: "connected"
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Health check failed:", error)

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    )
  }
}

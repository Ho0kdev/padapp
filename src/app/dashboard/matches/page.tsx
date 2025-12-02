import { redirect } from "next/navigation"

export default function MatchesPage() {
  // Ruta deshabilitada - Los partidos se gestionan desde cada torneo
  redirect("/dashboard")
}

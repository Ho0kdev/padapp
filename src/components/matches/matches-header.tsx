"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, RefreshCcw } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"

export function MatchesHeader() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "all")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)

    if (search) {
      params.set("search", search)
    } else {
      params.delete("search")
    }

    params.set("page", "1")

    startTransition(() => {
      router.push(`/dashboard/matches?${params.toString()}`)
    })
  }

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus)
    const params = new URLSearchParams(searchParams)

    if (newStatus && newStatus !== "all") {
      params.set("status", newStatus)
    } else {
      params.delete("status")
    }

    params.set("page", "1")

    startTransition(() => {
      router.push(`/dashboard/matches?${params.toString()}`)
    })
  }

  const handleReset = () => {
    setSearch("")
    setStatus("all")
    startTransition(() => {
      router.push("/dashboard/matches")
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Partidos</h1>
        <p className="text-muted-foreground">
          Gestiona y visualiza todos los partidos del sistema
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Búsqueda */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por equipo, torneo, categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isPending}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {/* Filtro de estado */}
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="SCHEDULED">Programado</SelectItem>
            <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
            <SelectItem value="COMPLETED">Completado</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
            <SelectItem value="WALKOVER">Walkover</SelectItem>
          </SelectContent>
        </Select>

        {/* Botón reset */}
        {(search || status !== "all") && (
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isPending}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  )
}

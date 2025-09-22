"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { tournamentStatusOptions } from "@/lib/validations/tournament"

export function TournamentsHeader() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") || "")

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set("search", value)
    } else {
      params.delete("search")
    }
    params.set("page", "1") // Reset to first page
    router.push(`/dashboard/tournaments?${params.toString()}`)
  }

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams)
    if (status && status !== "all") {
      params.set("status", status)
    } else {
      params.delete("status")
    }
    params.set("page", "1") // Reset to first page
    router.push(`/dashboard/tournaments?${params.toString()}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(search)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Torneos</h1>
        <p className="text-muted-foreground">
          Gestiona y organiza torneos de pádel
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar torneos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-8 w-[250px]"
            />
          </div>

          <Select
            value={searchParams.get("status") || "all"}
            onValueChange={handleStatusFilter}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {tournamentStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button asChild>
          <Link href="/dashboard/tournaments/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Torneo
          </Link>
        </Button>
      </div>
    </div>
  )
}
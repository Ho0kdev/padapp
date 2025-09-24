"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DataTableHeader } from "@/components/ui/data-table-header"

interface Category {
  id: string
  name: string
}

interface Season {
  value: string
  label: string
}

export function RankingsHeader() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])

  useEffect(() => {
    fetchCategories()
    const currentCategoryId = searchParams.get("categoryId")
    fetchAvailableSeasons(currentCategoryId || undefined)
  }, [])

  useEffect(() => {
    const currentCategoryId = searchParams.get("categoryId")
    fetchAvailableSeasons(currentCategoryId || undefined)
  }, [searchParams.get("categoryId")])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories?isActive=true&limit=100")
      if (response.ok) {
        const data = await response.json()
        const fetchedCategories = data.categories || []
        setCategories(fetchedCategories)

        // Si no hay categoría seleccionada y hay categorías disponibles, seleccionar la primera
        const currentCategoryId = searchParams.get("categoryId")
        if (!currentCategoryId && fetchedCategories.length > 0) {
          const params = new URLSearchParams(searchParams)
          params.set("categoryId", fetchedCategories[0].id)
          if (!params.get("seasonYear")) {
            params.set("seasonYear", new Date().getFullYear().toString())
          }
          router.replace(`/dashboard/rankings?${params.toString()}`)
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchAvailableSeasons = async (categoryId?: string) => {
    try {
      const url = categoryId
        ? `/api/rankings/seasons?categoryId=${categoryId}`
        : "/api/rankings/seasons"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const seasonOptions = data.seasons.map((year: number) => ({
          value: year.toString(),
          label: year.toString()
        }))
        setSeasons(seasonOptions)
      } else {
        // Fallback to current year if API fails
        const currentYear = new Date().getFullYear()
        setSeasons([{ value: currentYear.toString(), label: currentYear.toString() }])
      }
    } catch (error) {
      console.error("Error fetching seasons:", error)
      // Fallback to current year
      const currentYear = new Date().getFullYear()
      setSeasons([{ value: currentYear.toString(), label: currentYear.toString() }])
    }
  }

  const categoryOptions = categories.map(cat => ({
    value: cat.id,
    label: cat.name
  }))

  return (
    <DataTableHeader
      title="Rankings por Categoría"
      description="Gestiona los rankings de jugadores por categoría y temporada"
      searchPlaceholder="Buscar jugadores..."
      showCreateButton={false}
      filterLabel="Categoría"
      filterOptions={categoryOptions}
      filterParamKey="categoryId"
      secondaryFilter={{
        label: "Temporada",
        options: seasons,
        paramKey: "seasonYear",
        defaultValue: new Date().getFullYear().toString(),
        width: "w-[120px]"
      }}
      basePath="/dashboard/rankings"
    />
  )
}
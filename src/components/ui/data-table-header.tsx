"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

interface FilterOption {
  value: string
  label: string
}

interface SecondaryFilter {
  label: string
  options: FilterOption[]
  paramKey: string
  defaultValue?: string
  width?: string
}

interface TertiaryFilter {
  label: string
  options: FilterOption[]
  paramKey: string
  defaultValue?: string
  width?: string
}

interface DataTableHeaderProps {
  title: string
  description: string
  searchPlaceholder?: string
  createButtonText?: string
  createButtonHref?: string
  showCreateButton?: boolean
  filterLabel?: string
  filterOptions?: FilterOption[]
  defaultFilterValue?: string
  searchParamKey?: string
  filterParamKey?: string
  secondaryFilter?: SecondaryFilter
  tertiaryFilter?: TertiaryFilter
  basePath: string
}

export function DataTableHeader({
  title,
  description,
  searchPlaceholder = "Buscar...",
  createButtonText,
  createButtonHref,
  showCreateButton = true,
  filterLabel,
  filterOptions = [],
  defaultFilterValue = "all",
  searchParamKey = "search",
  filterParamKey = "status",
  secondaryFilter,
  tertiaryFilter,
  basePath
}: DataTableHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get(searchParamKey) || "")

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(searchParamKey, value)
    } else {
      params.delete(searchParamKey)
    }
    params.set("page", "1") // Reset to first page
    router.push(`${basePath}?${params.toString()}`)
  }

  const handleFilter = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(filterParamKey, value)
    } else {
      params.delete(filterParamKey)
    }
    params.set("page", "1") // Reset to first page
    router.push(`${basePath}?${params.toString()}`)
  }

  const handleSecondaryFilter = (value: string) => {
    if (!secondaryFilter) return

    const params = new URLSearchParams(searchParams)
    if (value && value !== "all") {
      params.set(secondaryFilter.paramKey, value)
    } else {
      params.delete(secondaryFilter.paramKey)
    }
    params.set("page", "1") // Reset to first page
    router.push(`${basePath}?${params.toString()}`)
  }

  const handleTertiaryFilter = (value: string) => {
    if (!tertiaryFilter) return

    const params = new URLSearchParams(searchParams)
    if (value && value !== "all") {
      params.set(tertiaryFilter.paramKey, value)
    } else {
      params.delete(tertiaryFilter.paramKey)
    }
    params.set("page", "1") // Reset to first page
    router.push(`${basePath}?${params.toString()}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(search)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-8 w-[250px]"
            />
          </div>

          {filterOptions.length > 0 && (
            <Select
              value={searchParams.get(filterParamKey) || defaultFilterValue}
              onValueChange={handleFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={filterLabel || "Filtrar"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {secondaryFilter && (
            <Select
              value={searchParams.get(secondaryFilter.paramKey) || secondaryFilter.defaultValue || "all"}
              onValueChange={handleSecondaryFilter}
            >
              <SelectTrigger className={secondaryFilter.width || "w-[120px]"}>
                <SelectValue placeholder={secondaryFilter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {secondaryFilter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {tertiaryFilter && (
            <Select
              value={searchParams.get(tertiaryFilter.paramKey) || tertiaryFilter.defaultValue || "all"}
              onValueChange={handleTertiaryFilter}
            >
              <SelectTrigger className={tertiaryFilter.width || "w-[120px]"}>
                <SelectValue placeholder={tertiaryFilter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tertiaryFilter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {showCreateButton && createButtonText && createButtonHref && (
          <Button asChild>
            <Link href={createButtonHref}>
              <Plus className="mr-2 h-4 w-4" />
              {createButtonText}
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
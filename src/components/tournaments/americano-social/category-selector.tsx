"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CategorySelectorProps {
  tournament: any
  currentCategoryId: string
}

export function CategorySelector({
  tournament,
  currentCategoryId
}: CategorySelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleCategoryChange = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("categoryId", categoryId)
    router.push(`?${params.toString()}`)
  }

  if (tournament.categories.length <= 1) {
    return null
  }

  return (
    <Select value={currentCategoryId} onValueChange={handleCategoryChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Seleccionar categoría" />
      </SelectTrigger>
      <SelectContent>
        {tournament.categories.map((tc: any) => (
          <SelectItem key={tc.categoryId} value={tc.categoryId}>
            {tc.category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

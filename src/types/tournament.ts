import { Tournament, TournamentCategory, Category, Club, User, Team, Match } from "@prisma/client"

export interface TournamentWithDetails extends Tournament {
  organizer: {
    id: string
    name: string | null
    email: string
  }
  mainClub?: {
    id: string
    name: string
    address: string
    city: string
  } | null
  categories: (TournamentCategory & {
    category: Category
    teams: (Team & {
      player1: { firstName: string; lastName: string }
      player2: { firstName: string; lastName: string }
    })[]
  })[]
  clubs: {
    club: {
      id: string
      name: string
    }
  }[]
  teams: (Team & {
    player1: { firstName: string; lastName: string }
    player2: { firstName: string; lastName: string }
    category: { name: string }
  })[]
  matches: (Match & {
    team1?: {
      player1: { firstName: string; lastName: string }
      player2: { firstName: string; lastName: string }
    } | null
    team2?: {
      player1: { firstName: string; lastName: string }
      player2: { firstName: string; lastName: string }
    } | null
    court?: { name: string } | null
  })[]
  _count: {
    teams: number
    matches: number
  }
}

export interface TournamentListItem extends Tournament {
  organizer: {
    name: string | null
    email: string
  }
  mainClub?: {
    name: string
    city: string
  } | null
  categories: {
    category: {
      name: string
    }
  }[]
  _count: {
    teams: number
    matches: number
  }
}

export interface TournamentsPaginatedResponse {
  tournaments: TournamentListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CategoryOption {
  id: string
  name: string
  description: string | null
  type: string
  minAge: number | null
  maxAge: number | null
  genderRestriction: string | null
  minRankingPoints: number | null
  maxRankingPoints: number | null
}

export interface ClubOption {
  id: string
  name: string
  address: string
  city: string
  state: string | null
  country: string
  phone: string | null
  email: string | null
  _count: {
    courts: number
  }
}
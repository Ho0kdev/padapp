import { Tournament, TournamentCategory, Category, Club, User, Team, Match, Registration } from "@prisma/client"

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
      registration1: { player: { firstName: string; lastName: string } }
      registration2: { player: { firstName: string; lastName: string } }
    })[]
  })[]
  clubs: {
    club: {
      id: string
      name: string
    }
  }[]
  teams: (Team & {
    registration1: {
      registrationStatus: string
      player: { firstName: string; lastName: string }
    }
    registration2: {
      registrationStatus: string
      player: { firstName: string; lastName: string }
    }
    category: { name: string }
  })[]
  registrations?: {
    id: string
    registrationStatus: 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELLED' | 'WAITLIST'
    categoryId: string
    player: {
      id: string
      firstName: string
      lastName: string
      gender: string | null
      rankingPoints: number
      primaryCategory?: {
        id: string
        name: string
        level: number
      } | null
    }
    category: {
      id: string
      name: string
    }
  }[]
  matches: (Match & {
    team1?: {
      registration1: { player: { firstName: string; lastName: string } }
      registration2: { player: { firstName: string; lastName: string } }
    } | null
    team2?: {
      registration1: { player: { firstName: string; lastName: string } }
      registration2: { player: { firstName: string; lastName: string } }
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
  americanoPools: {
    players: any[]
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
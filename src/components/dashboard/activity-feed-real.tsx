// src/components/dashboard/activity-feed-real.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Activity {
  id: string
  user: {
    name: string
    initials: string
  }
  action: string
  target: string
  time: string
}

interface ActivityFeedRealProps {
  activities: Activity[]
}

export function ActivityFeedReal({ activities }: ActivityFeedRealProps) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
        <CardDescription>
          Últimas acciones en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
            No hay actividad reciente
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-2 sm:gap-3">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                <AvatarFallback className="text-xs">
                  {activity.user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-xs sm:text-sm leading-tight">
                  <span className="font-medium">{activity.user.name}</span>
                  {' '}{activity.action}{' '}
                  <span className="font-medium break-words">{activity.target}</span>
                </p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
"use client"

import { Task } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface GanttChartProps {
  tasks: Task[]
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max)
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks }) => {
  const segments = tasks.flatMap((task) => task.segments)
  const minTime =
    segments.length > 0
      ? Math.min(...segments.map((segment) => segment.start))
      : 0
  const maxTime =
    segments.length > 0
      ? Math.max(...segments.map((segment) => segment.end))
      : 1
  const totalDuration = Math.max(maxTime - minTime, 1)

  const ticksCount = 6
  const ticks = Array.from({ length: ticksCount + 1 }, (_, index) => {
    const ratio = index / ticksCount
    return {
      left: ratio * 100,
      value: minTime + ratio * totalDuration,
    }
  })

  const vmOrder = Array.from(new Set(segments.map((segment) => segment.vm)))
  return (
    <Card className="bg-background/96">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Task exectuion timeline</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {vmOrder.map((vm) => (
              <Badge
                key={vm}
                variant="outline"
                className="border-chart-1/60 bg-chart-1/35"
              >
                {vm}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto px-0">
        <div className="min-w-225">
          <div className="grid grid-cols-[220px_1fr] border-b bg-muted/45">
            <div className="px-3 py-2 text-sm font-medium">Task id</div>
            <div className="relative h-10">
              {ticks.map((tick, index) => (
                <div
                  key={index}
                  className="absolute top-0 h-full border-l border-border/80"
                  style={{ left: `${tick.left}%` }}
                >
                  <span className="absolute top-2 -translate-x-1/2 text-xs text-muted-foreground">
                    {tick.value.toFixed(1)} sec
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {tasks.map((task) => (
          <div
            key={task.id}
            className="grid grid-cols-[220px_1fr] border-b last:border-b-0"
          >
            <div className="px-3 py-3 text-sm font-medium">{task.id}</div>
            <div className="relative h-12 py-2">
              {task.segments.map((segment, index) => {
                const startRatio = (segment.start - minTime) / totalDuration
                const endRatio = (segment.end - minTime) / totalDuration
                const left = clamp(startRatio * 100, 0, 100)
                const width = clamp((endRatio - startRatio) * 100, 1.6, 100)

                return (
                  <div
                    key={`${task.id}-${index}`}
                    className="absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-md border border-chart-1/60 bg-chart-1/35 px-2 text-xs font-medium text-foreground"
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${task.id}: ${segment.vm} (${segment.start}-${segment.end} sec)`}
                  >
                    <span className="truncate">{segment.vm}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default GanttChart

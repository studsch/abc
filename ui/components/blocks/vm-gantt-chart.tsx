"use client"

import { Task, TaskSegments } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface VmGanttChartProps {
  tasks: Task[]
}

type VmSegment = TaskSegments & {
  taskId: string
}

type VmSegmentWithLane = VmSegment & {
  lane: number
}

type VmRow = {
  vm: string
  segments: VmSegmentWithLane[]
  laneCount: number
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max)
}

const segmentsToLanes = (segments: VmSegment[]): VmSegmentWithLane[] => {
  const laneEndTimes: number[] = []

  return [...segments]
    .sort(
      (a, b) =>
        a.start - b.start || a.end - b.end || a.taskId.localeCompare(b.taskId)
    )
    .map((segments) => {
      const lane = laneEndTimes.findIndex(
        (endTime) => endTime <= segments.start
      )
      const nextLane = lane == -1 ? laneEndTimes.length : lane
      laneEndTimes[nextLane] = segments.end

      return {
        ...segments,
        lane: nextLane,
      }
    })
}

const VmGanttChart: React.FC<VmGanttChartProps> = ({ tasks }) => {
  const segments: VmSegment[] = tasks.flatMap((task) =>
    task.segments.map((segment) => ({
      ...segment,
      taskId: task.id,
    }))
  )

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

  const taskOrder = tasks.map((task) => task.id)
  const vmOrder = Array.from(new Set(segments.map((segment) => segment.vm)))
  const segmentsByVm: VmRow[] = vmOrder.map((vm) => {
    const vmSegments = segmentsToLanes(
      segments.filter((segment) => segment.vm === vm)
    )
    const laneCount = Math.max(
      1,
      ...vmSegments.map((segment) => segment.lane + 1)
    )

    return {
      vm,
      segments: vmSegments,
      laneCount,
    }
  })
  return (
    <Card className="bg-background/96">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>VM execution timeline</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-chart-1/60 bg-chart-1/35"
            >
              {taskOrder.length} tasks
            </Badge>
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

        {segmentsByVm.map(({ vm, segments: vmSegments, laneCount }) => {
          const laneHeight = 36
          const rowHeight = laneCount * laneHeight + 16

          return (
            <div
              key={vm}
              className="grid grid-cols-[220px_1fr] border-b last:border-b-0"
            >
              <div className="px-3 py-3 text-sm font-medium">{vm}</div>
              <div className="relative py-2" style={{ height: rowHeight }}>
                {vmSegments.map((segment, index) => {
                  const startRatio = (segment.start - minTime) / totalDuration
                  const endRatio = (segment.end - minTime) / totalDuration
                  const left = clamp(startRatio * 100, 0, 100)
                  const width = clamp((endRatio - startRatio) * 100, 1.6, 100)
                  console.log(segment.lane, laneHeight)

                  return (
                    <div
                      key={`${segment.taskId}-${index}`}
                      className="absolute flex h-7 items-center overflow-hidden rounded-md border border-chart-1/60 bg-chart-1/35 px-2 text-xs font-medium text-foreground"
                      style={{
                        left: `${left}%`,
                        top: 8 + segment.lane * laneHeight,
                        width: `${width}%`,
                      }}
                      title={`${vm}: ${segment.taskId} (${segment.start}-${segment.end} sec)`}
                    >
                      <span className="truncate">{segment.taskId}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default VmGanttChart

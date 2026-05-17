"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Metrics } from "@/lib/types"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Pie, PieChart } from "recharts"

interface MetricsProps {
  metrics: Metrics
}

const chartConfig = {
  completed: {
    label: "Completed",
    color: "var(--chart-2)",
  },
  failed: {
    label: "Failed",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

const MetricsSection: React.FC<MetricsProps> = ({ metrics }) => {
  const completionChartData = [
    {
      key: "completed",
      name: "Completed",
      value: metrics.completed_tasks,
      fill: "var(--color-completed)",
    },
    {
      key: "failed",
      name: "Failed",
      value: metrics.total_tasks - metrics.completed_tasks,
      fill: "var(--color-failed)",
    },
  ]
  const completionPercent =
    metrics.total_tasks > 0
      ? (metrics.completed_tasks / metrics.total_tasks) * 100
      : 0
  const metricsInfo = [
    { label: "Makespan", value: `${metrics.makespan.toFixed(2)} sec` },
    {
      label: "Throughput",
      value: `${metrics.throughput.toFixed(2)} sec`,
    },
    {
      label: "Average execution time",
      value: `${metrics.average_execution_time.toFixed(2)} sec`,
    },
    {
      label: "Average waiting time",
      value: `${metrics.average_waiting_time.toFixed(2)} sec`,
    },
    {
      label: "Total tasks",
      value: `${metrics.total_tasks}`,
    },
    {
      label: "Completed tasks",
      value: `${metrics.completed_tasks}`,
    },
    {
      label: "Rejected tasks",
      value: `${metrics.rejected_tasks} (${metrics.rejected_tasks_percent.toFixed(2)}%)`,
    },
  ]
  const rejectedTaskIds =
    metrics.rejected_task_ids.length > 0
      ? metrics.rejected_task_ids.join(", ")
      : "-"

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <Card className="bg-background/96">
        <CardHeader className="border-b">
          <CardTitle>Task Completion</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="relative mx-auto w-full max-w-65">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-65"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />

                <Pie
                  data={completionChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  isAnimationActive={false}
                />
              </PieChart>
            </ChartContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-2xl font-semibold tracking-tight">
                {metrics.completed_tasks}/{metrics.total_tasks}
              </p>
              <p className="text-xs text-muted-foreground">
                {completionPercent.toFixed(1)}% completed
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-chart-2" />
              Completed
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-chart-5" />
              Failed
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background/96">
        <CardHeader className="border-b">
          <CardTitle>Simulation metrics</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            {metricsInfo.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border bg-muted/20 px-3 py-2"
              >
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-0.5 text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </dl>

          <div className="mt-3 rounded-lg border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Rejected task IDs</p>
            <p className="mt-0.5 text-sm font-medium">{rejectedTaskIds}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MetricsSection

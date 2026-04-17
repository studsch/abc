"use client"

import React from "react"
import { VmResources } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface VmUtilizationProps {
  vmUtilization: Record<string, VmResources>
}

interface MetricBarProps {
  value: number
  color: string
}

const MetricBar: React.FC<MetricBarProps> = ({ value, color }) => {
  const width = Math.max(0, Math.min(100, value))

  return (
    <div className="flex min-w-52.5 items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-16 text-right font-mono text-xs text-muted-foreground">
        {`${value.toFixed(2)} %`}
      </span>
    </div>
  )
}

const chartConfig = {
  pes: {
    label: "PEs",
    color: "var(--chart-1)",
  },
  ram: {
    label: "RAM",
    color: "var(--chart-2)",
  },
  storage: {
    label: "Storage",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const VmPieChart: React.FC<VmResources> = ({ PE, RAM, Storage }) => {
  const chartData = [
    {
      metric: "pes",
      label: "PEs",
      value: Math.max(0, Math.min(100, PE)),
      fill: "var(--color-pes)",
    },
    {
      metric: "ram",
      label: "RAM",
      value: Math.max(0, Math.min(100, RAM)),
      fill: "var(--color-ram)",
    },
    {
      metric: "storage",
      label: "Storage",
      value: Math.max(0, Math.min(100, Storage)),
      fill: "var(--color-storage)",
    },
  ]

  const renderLabel = (props: any) => {
    return (
      <text
        x={props.x}
        y={props.y}
        fill="currentColor"
        textAnchor={props.textAnchor}
        dominantBaseline={props.dominantBaseline}
      >
        {props.name}
      </text>
    )
  }

  return (
    <ChartContainer config={chartConfig}>
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="label"
          innerRadius="40%"
          label={renderLabel}
          isAnimationActive={false}
          labelLine={{
            stroke: "currentColor",
            strokeOpacity: 0.55,
            strokeWidth: 1.25,
          }}
        />
      </PieChart>
    </ChartContainer>
  )
}

const VmRadarChart: React.FC<VmResources> = ({ PE, RAM, Storage }) => {
  const chartData = [
    {
      metric: "pes",
      label: "PEs",
      value: Math.max(0, Math.min(100, PE)),
    },
    {
      metric: "ram",
      label: "RAM",
      value: Math.max(0, Math.min(100, RAM)),
    },
    {
      metric: "storage",
      label: "Storage",
      value: Math.max(0, Math.min(100, Storage)),
    },
  ]

  return (
    <ChartContainer config={chartConfig}>
      <RadarChart data={chartData}>
        <PolarGrid />
        <PolarAngleAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "currentColor" }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Radar
          dataKey="value"
          stroke="var(--chart-4)"
          fill="var(--chart-4)"
          fillOpacity={0.28}
          isAnimationActive={false}
        />
      </RadarChart>
    </ChartContainer>
  )
}

const save_results = async () => {
  const response = await fetch("http://localhost:8000/api/save_results", {
    method: "POST",
  })

  if (!response.ok) {
    const error = await response.json()
    toast.error(error["detail"], { position: "bottom-right" })
  } else {
    const payload = await response.json()
    toast.info(payload["location"], { position: "bottom-right" })
  }
}

const VmUtilization: React.FC<VmUtilizationProps> = ({ vmUtilization }) => {
  let maxPEs = 0
  let maxRAM = 0
  let maxStorage = 0
  for (const k in vmUtilization) {
    maxPEs = Math.max(maxPEs, vmUtilization[k]["PE"])
    maxRAM = Math.max(maxRAM, vmUtilization[k]["RAM"])
    maxStorage = Math.max(maxStorage, vmUtilization[k]["Storage"])

    if (maxPEs >= maxRAM && maxPEs >= maxStorage) {
      vmUtilization[k]["dominant"] = `PEs ${maxPEs.toFixed(2)} %`
    } else if (maxRAM >= maxPEs && maxRAM >= maxStorage) {
      vmUtilization[k]["dominant"] = `RAM ${maxRAM.toFixed(2)} %`
    } else {
      vmUtilization[k]["dominant"] = `Storage ${maxRAM.toFixed(2)} %`
    }
  }

  return (
    <>
      <Card className="bg-background/96">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle>VM peak utilization</CardTitle>
            </div>
            <Button size="sm" variant="outline" onClick={save_results}>
              download all results
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2 md:grid-cols-4">
            <div className="rounded-lg border bg-muted/25 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">VM count</p>
              <p className="font-medium">{Object.keys(vmUtilization).length}</p>
            </div>
            <div className="rounded-lg border bg-muted/25 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Max PEs</p>
              <p className="font-medium">{`${maxPEs.toFixed(2)} %`}</p>
            </div>
            <div className="rounded-lg border bg-muted/25 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Max RAM</p>
              <p className="font-medium">{`${maxRAM.toFixed(2)} %`}</p>
            </div>
            <div className="rounded-lg border bg-muted/25 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Max storage</p>
              <p className="font-medium">{`${maxStorage.toFixed(2)} %`}</p>
            </div>
          </div>

          <div className="rounded-xl border">
            <Table>
              <TableHeader className="bg-muted/45">
                <TableRow>
                  <TableHead className="w-35">VM id</TableHead>
                  <TableHead>PEs</TableHead>
                  <TableHead>RAM</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Dominant peak</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {Object.entries(vmUtilization).map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell className="font-medium">{k}</TableCell>
                    <TableCell>
                      <MetricBar value={v.PE} color="bg-chart-1" />
                    </TableCell>
                    <TableCell>
                      <MetricBar value={v.RAM} color="bg-chart-2" />
                    </TableCell>
                    <TableCell>
                      <MetricBar value={v.Storage} color="bg-chart-3" />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{v["dominant"]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-4">
            {Object.entries(vmUtilization).map(([k, v]) => (
              <div
                key={`charts-${k}`}
                className="rounded-xl border bg-muted/20 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-base font-semibold">{k}</p>
                  <Badge variant="outline">{v["dominant"]}</Badge>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border bg-background/80 p-3">
                    <VmPieChart PE={v.PE} RAM={v.RAM} Storage={v.Storage} />
                  </div>
                  <div className="rounded-lg border bg-background/80 p-3">
                    <VmRadarChart PE={v.PE} RAM={v.RAM} Storage={v.Storage} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default VmUtilization

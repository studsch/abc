"use client"

import { Metrics } from "@/lib/types"
import { useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FolderOpen, Upload } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"

interface MetricsRun {
  id: string
  name: string
  source: string
  metrics: Metrics
}

const isMetrics = (value: unknown): boolean => {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.makespan === "number" &&
    typeof candidate.average_execution_time === "number" &&
    typeof candidate.average_waiting_time === "number" &&
    typeof candidate.throughput === "number"
  )
}

const readMetricsFromFile = async (file: File): Promise<Metrics> => {
  const text = await file.text()

  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(`File ${file.name} is not valid JSON`)
  }

  if (!isMetrics(payload)) {
    throw new Error(
      `File ${file.name} does not contain the expected Metrics structure`
    )
  }

  return payload as Metrics
}

const baseName = (filePath: string) => {
  const normalized = filePath.replaceAll("\\", "/")
  const lastSegment = normalized.split("/").pop() ?? normalized
  return lastSegment.replace(/\.[^.]+$/, "")
}

const createRun = (
  file: File,
  metrics: Metrics,
  preferredName: string,
  prefix: string
): MetricsRun => {
  const relativePath = file.webkitRelativePath || file.name
  const finalName = preferredName.trim()
    ? preferredName.trim()
    : prefix.trim()
      ? `${prefix.trim()}_${baseName(relativePath)}`
      : baseName(relativePath)

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: finalName,
    source: relativePath,
    metrics,
  }
}

type MetricKey =
  | "makespan"
  | "average_execution_time"
  | "average_waiting_time"
  | "throughput"

const metricKeys: MetricKey[] = [
  "makespan",
  "average_execution_time",
  "average_waiting_time",
  "throughput",
]

interface MetricsChartsProps {
  metric: MetricKey
  runs: MetricsRun[]
}

const MetricBarCard: React.FC<MetricsChartsProps> = ({ metric, runs }) => {
  const metricLabels: Record<MetricKey, string> = {
    makespan: "Makespan",
    average_execution_time: "Average execution time",
    average_waiting_time: "Average waiting time",
    throughput: "Throughput",
  }
  const metricUnits: Record<MetricKey, string> = {
    makespan: "sec",
    average_execution_time: "sec",
    average_waiting_time: "sec",
    throughput: "tasks/sec",
  }
  const chartData = runs.map((run) => ({
    name: run.name,
    value: run.metrics[metric],
  }))

  const chartConfig = {
    value: {
      label: "Value",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig
  const barPalette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ]

  return (
    <Card className="bg-background/96">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">{metricLabels[metric]}</CardTitle>
        <CardDescription>{metricUnits[metric]}</CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="h-70 w-full">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 10, bottom: 40, left: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={54}
            />
            <YAxis tickLine={false} axisLine={false} width={52} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => Number(value).toFixed(2)}
                  indicator="dot"
                />
              }
            />
            <Bar dataKey="value" fill={barPalette[1]} radius={6}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`${entry.name}-${index}}`}
                  fill={barPalette[index % barPalette.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

const MetricsCharts: React.FC = () => {
  const [runs, setRuns] = useState<MetricsRun[]>([])

  const singleFileInputRef = useRef<HTMLInputElement>(null)
  const [singleRunName, setSingleRunName] = useState("")
  const importSingleFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    try {
      const metrics = await readMetricsFromFile(file)
      const run = createRun(file, metrics, singleRunName, "")
      setRuns((previous) => [...previous, run])
      toast.info(`Added new set of metrics: ${run.name}`, {
        position: "bottom-right",
      })
      if (singleRunName.trim()) {
        setSingleRunName("")
      }
    } catch (error) {
      toast.error("Can't import file", {
        description: `${error}`,
        position: "bottom-right",
      })
    }
  }

  const directoryInputRef = useRef<HTMLInputElement>(null)
  const [directoryPrefix, setDirectoryPrefix] = useState("")
  const importDirectoryFiles = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.name.toLowerCase().endsWith(".json")
    )
    event.target.value = ""

    if (files.length === 0) {
      toast.error("In directory no JSON file", {
        position: "bottom-right",
      })
      return
    }

    const nextRuns: MetricsRun[] = []

    for (const file of files) {
      try {
        const metrics = await readMetricsFromFile(file)
        nextRuns.push(createRun(file, metrics, "", directoryPrefix))
      } catch (error) {
        toast.error(`Error in file: ${file.name}`, {
          description: `${error}`,
          position: "bottom-right",
        })
      }
    }

    if (nextRuns.length > 0) {
      setRuns((previous) => [...previous, ...nextRuns])
      toast.info(`Imported ${nextRuns.length} files with set of metrics`, {
        position: "bottom-right",
      })
    }
  }

  const updateRunName = (id: string, nextName: string) => {
    setRuns((prev) =>
      prev.map((run) => (run.id === id ? { ...run, name: nextName } : run))
    )
  }
  const removeRun = (id: string) => {
    setRuns((prev) => prev.filter((run) => run.id !== id))
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-muted/40 p-2 md:p-3">
      <div
        className="pointer-events-none absolute inset-0 bg-foreground/4"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-375 flex-col overflow-hidden rounded-2xl border bg-background/95 shadow-sm">
        <header className="flex h-16 items-center justify-between border-b px-4 md:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
            <Badge variant="secondary">{runs.length}</Badge>
          </div>
          <Link
            href="/"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Simulation
          </Link>
        </header>

        <section className="border-b p-4 md:p-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="bg-background/96">
              <CardHeader className="border-b">
                <CardTitle className="text-base">One file</CardTitle>
                <CardDescription>
                  Specify the JSON file with metrics and the name of this set of
                  metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="single-run-name">
                      Name of this set of metrics
                    </FieldLabel>
                    <Input
                      id="single-run-name"
                      value={singleRunName}
                      placeholder="Example: FCFS"
                      onChange={(e) => setSingleRunName(e.target.value)}
                    />
                  </Field>
                </FieldGroup>

                <input
                  ref={singleFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={importSingleFile}
                />
                <div className="mt-3">
                  <Button
                    variant="outline"
                    onClick={() => singleFileInputRef.current?.click()}
                  >
                    <Upload data-icon="inline-start" />
                    upload file
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/96">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Directory</CardTitle>
                <CardDescription>
                  Select the folder with JSON metrics. Specify a prefix for this
                  data.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="direcotory-prefix">
                      Prefix for names
                    </FieldLabel>
                    <Input
                      id="direcotory-prefix"
                      value={directoryPrefix}
                      placeholder="Example: FCFS"
                      onChange={(e) => setDirectoryPrefix(e.target.value)}
                    />
                  </Field>
                </FieldGroup>

                <input
                  ref={directoryInputRef}
                  type="file"
                  accept=".json,application/json"
                  multiple
                  className="hidden"
                  onChange={importDirectoryFiles}
                  {...({ webkitdirectory: "", directory: "" } as Record<
                    string,
                    string
                  >)}
                />
                <div className="mt-3">
                  <Button
                    variant="outline"
                    onClick={() => directoryInputRef.current?.click()}
                  >
                    <FolderOpen data-icon="inline-start" />
                    choose folder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-b p-4 md:p-5">
          <h2 className="mb-3 text-base font-semibold">Loaded metrics sets</h2>

          {runs.length === 0 ? (
            <div className="rounded-xl border bg-background/96 p-4 text-sm text-muted-foreground">
              There are no data. Upload file or directory with metrics.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-background/96">
              <Table>
                <TableHeader className="bg-muted/45">
                  <TableRow>
                    <TableHead className="w-70">Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="w-30 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <Input
                          value={run.name}
                          onChange={(e) =>
                            updateRunName(run.id, e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {run.source}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            variant="destructive"
                            onClick={() => removeRun(run.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section className="grid gap-4 p-4 md:p-5">
          {runs.length === 0 ? (
            <div className="rounded-xl border bg-background/96 p-4 text-sm text-muted-foreground">
              There are no data. Upload file or directory with metrics.
            </div>
          ) : (
            metricKeys.map((metric) => (
              <MetricBarCard key={metric} metric={metric} runs={runs} />
            ))
          )}
        </section>
      </div>
    </main>
  )
}

export default MetricsCharts

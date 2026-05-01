"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { TaskInfo } from "@/lib/types"
import { MoreVertical } from "lucide-react"
import React, { useState, SubmitEventHandler, ChangeEvent, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { parseCsv } from "@/lib/utils"
import { toast } from "sonner"

interface TaskTableProps {
  data: TaskInfo[]
  setData: React.Dispatch<React.SetStateAction<TaskInfo[]>>
  id: number
  setId: React.Dispatch<React.SetStateAction<number>>
}

const TASK_HEADERS: Array<keyof TaskInfo> = [
  "id",
  "length",
  "input_size",
  "output_size",
  "cpu",
]

const newTask = (id: number): TaskInfo => {
  id += 1
  return {
    id: `TASK-${id}`,
    length: 0,
    input_size: 0,
    output_size: 0,
    cpu: 0,
  }
}

const TaskTable: React.FC<TaskTableProps> = ({ data, setData, id, setId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<TaskInfo>(newTask(id))

  const removeTask = (task: TaskInfo) => {
    setData((prev) => prev.filter((item) => item.id !== task.id))
  }
  const updateTask = (task: TaskInfo) => {
    setData((prev) =>
      prev.map((item) => (item.id === task.id ? { ...task } : item))
    )
  }
  const addTask = (task: TaskInfo) => {
    id += 1
    setId(id)
    task.id = `TASK-${id}`
    setData((prev) => [...prev, task])
  }

  const updateField =
    (field: keyof typeof formData) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setFormData((prev) => ({
        ...prev,
        [field]: typeof prev[field] === "number" ? Number(value) : value,
      }))
    }

  const openEditDialog = (task: TaskInfo) => {
    setFormData(task)
    setIsEditing(true)
    setIsDialogOpen(true)
  }
  const openAddDialog = () => {
    setFormData(newTask(id))
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  const saveTask: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()

    if (isEditing) {
      updateTask(formData)
      setIsEditing(false)
    } else {
      addTask(formData)
    }

    setIsDialogOpen(false)
  }

  const uploadCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""

    if (!file) return

    const text = await file.text()
    const rows = parseCsv(text)

    if (rows.length < 2) {
      toast.error("Empty file or only headers", { position: "bottom-right" })
      return
    }

    const header = rows[0].map((item) => item.trim())
    const indexMap = TASK_HEADERS.reduce<Record<string, number>>((acc, key) => {
      acc[String(key)] = header.indexOf(String(key))
      return acc
    }, {})
    const missing = TASK_HEADERS.map((key) => String(key)).filter(
      (key) => indexMap[key] === -1
    )

    if (missing.length > 0) {
      toast.error(`There are no columns: ${missing.join(", ")}`, {
        position: "bottom-right",
      })
      return
    }

    const parsed: TaskInfo[] = []
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i]
      const entity: TaskInfo = {
        id: row[indexMap.id],
        length: Number(row[indexMap.length]),
        input_size: Number(row[indexMap.input_size]),
        output_size: Number(row[indexMap.output_size]),
        cpu: Number(row[indexMap.cpu]),
      }
      // TODO: validate?
      parsed.push(entity)
    }

    const unique = new Map<string, TaskInfo>()
    for (const entity of parsed) {
      unique.set(entity.id, entity)
    }

    setData(Array.from(unique.values()))
    setId(1000)
  }
  const downloadCsv = () => {
    const header = TASK_HEADERS.join(",")
    const rows = data.map((entity) =>
      TASK_HEADERS.map((key) => entity[key]).join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = "tasks.csv"
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <section className="flex flex-col gap-2">
        <div className="px-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold">Tasks</h1>
              <Badge variant="secondary">{data.length}</Badge>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={uploadCsv}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                upload CSV
              </Button>
              <Button size="sm" variant="outline" onClick={downloadCsv}>
                download CSV
              </Button>
              <Button size="sm" onClick={openAddDialog}>
                Add Task
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-background/96">
          <Table>
            <TableHeader className="bg-muted/55">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead className="text-right">Length</TableHead>
                <TableHead className="text-right">Input file size</TableHead>
                <TableHead className="text-right">Output file size</TableHead>
                <TableHead className="text-right">CPU</TableHead>
                <TableHead className="w-14 text-right">
                  <span className="sr-only">Menu</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell className="text-right">{item.length}</TableCell>
                  <TableCell className="text-right">
                    {item.input_size}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.output_size}
                  </TableCell>
                  <TableCell className="text-right">{item.cpu}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Menu for ${item.id}`}
                            />
                          }
                        >
                          <MoreVertical />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(item)}
                          >
                            <p>Edit</p>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => removeTask(item)}
                          >
                            <p>Remove</p>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Task" : "Add new Task"}
            </DialogTitle>
          </DialogHeader>

          <form id="taskForm" onSubmit={saveTask}>
            <FieldGroup>
              <Field>
                <Label htmlFor="id-1">ID</Label>
                <Input
                  id="id-1"
                  name="id"
                  value={formData.id}
                  disabled={true}
                />
              </Field>
              <Field>
                <Label htmlFor="length-1">Length</Label>
                <Input
                  id="length-1"
                  name="length"
                  type="number"
                  min={0}
                  value={formData.length}
                  onChange={updateField("length")}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="inputSize-1">Input file size</Label>
                <Input
                  id="inputSize-1"
                  name="inputSize"
                  type="number"
                  value={formData.input_size}
                  min={0}
                  onChange={updateField("input_size")}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="outputSize-1">Output file size</Label>
                <Input
                  id="outputSize-1"
                  name="outputSize"
                  type="number"
                  value={formData.output_size}
                  min={0}
                  onChange={updateField("output_size")}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="CPU-1">CPU</Label>
                <Input
                  id="CPU-1"
                  name="CPU"
                  type="number"
                  value={formData.cpu}
                  min={0}
                  onChange={updateField("cpu")}
                  required
                />
              </Field>
            </FieldGroup>
          </form>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline">Cancel</Button>}
            ></DialogClose>
            <Button type="submit" form="taskForm">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TaskTable

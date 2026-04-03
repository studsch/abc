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
import { VMInfo } from "@/lib/types"
import { MoreVertical } from "lucide-react"
import React, { useState, SubmitEventHandler, ChangeEvent, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { parseCsv } from "@/lib/utils"
import { toast } from "sonner"

interface VMTableProps {
  data: VMInfo[]
  setData: React.Dispatch<React.SetStateAction<VMInfo[]>>
}

const VM_HEADERS: Array<keyof VMInfo> = [
  "id",
  "ram",
  "bandwidth",
  "storage",
  "cpu",
  "mips",
]

const newVM = (): VMInfo => {
  const uuid = crypto.randomUUID()
  return {
    id: uuid,
    ram: 0,
    bandwidth: 0,
    storage: 0,
    cpu: 0,
    mips: 0,
  }
}

const VMTable: React.FC<VMTableProps> = ({ data, setData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<VMInfo>(newVM())

  const removeVM = (vm: VMInfo) => {
    setData((prev) => prev.filter((item) => item.id !== vm.id))
  }
  const updateVM = (vm: VMInfo) => {
    setData((prev) =>
      prev.map((item) => (item.id === vm.id ? { ...vm } : item))
    )
  }
  const addVM = (vm: VMInfo) => {
    setData((prev) => [...prev, vm])
  }

  const updateField =
    (field: keyof typeof formData) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setFormData((prev) => ({
        ...prev,
        [field]: typeof prev[field] === "number" ? Number(value) : value,
      }))
    }

  const openEditDialog = (vm: VMInfo) => {
    setFormData(vm)
    setIsEditing(true)
    setIsDialogOpen(true)
  }
  const openAddDialog = () => {
    setFormData(newVM())
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  const saveVM: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()

    if (isEditing) {
      updateVM(formData)
      setIsEditing(false)
    } else {
      addVM(formData)
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
    const indexMap = VM_HEADERS.reduce<Record<string, number>>((acc, key) => {
      acc[String(key)] = header.indexOf(String(key))
      return acc
    }, {})
    const missing = VM_HEADERS.map((key) => String(key)).filter(
      (key) => indexMap[key] === -1
    )

    if (missing.length > 0) {
      toast.error(`There are no columns: ${missing.join(", ")}`, {
        position: "bottom-right",
      })
      return
    }

    const parsed: VMInfo[] = []
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i]
      const entity: VMInfo = {
        id: row[indexMap.id],
        ram: Number(row[indexMap.ram]),
        bandwidth: Number(row[indexMap.bandwidth]),
        storage: Number(row[indexMap.storage]),
        cpu: Number(row[indexMap.cpu]),
        mips: Number(row[indexMap.mips]),
      }
      // TODO: validate?
      parsed.push(entity)
    }

    const unique = new Map<string, VMInfo>()
    for (const entity of parsed) {
      unique.set(entity.id, entity)
    }

    setData(Array.from(unique.values()))
  }
  const downloadCsv = () => {
    const header = VM_HEADERS.join(",")
    const rows = data.map((entity) =>
      VM_HEADERS.map((key) => entity[key]).join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = "vm.csv"
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
              <h1 className="text-base font-semibold">Virtual Machines</h1>
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
                Add VM
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-background/96">
          <Table>
            <TableHeader className="bg-muted/55">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead className="text-right">RAM</TableHead>
                <TableHead className="text-right">Bandwidth</TableHead>
                <TableHead className="text-right">Storage</TableHead>
                <TableHead className="text-right">CPU</TableHead>
                <TableHead className="text-right">MIPS</TableHead>
                <TableHead className="w-14 text-right">
                  <span className="sr-only">Menu</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell className="text-right">{item.ram}</TableCell>
                  <TableCell className="text-right">{item.bandwidth}</TableCell>
                  <TableCell className="text-right">{item.storage}</TableCell>
                  <TableCell className="text-right">{item.cpu}</TableCell>
                  <TableCell className="text-right">{item.mips}</TableCell>
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
                            onClick={() => removeVM(item)}
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
              {isEditing ? "Edit Virtual Machine" : "Add new Virtual Machine"}
            </DialogTitle>
          </DialogHeader>

          <form id="vmForm" onSubmit={saveVM}>
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
                <Label htmlFor="ram-1">RAM</Label>
                <Input
                  id="ram-1"
                  name="ram"
                  type="number"
                  min={0}
                  value={formData.ram}
                  onChange={updateField("ram")}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="bandwidth-1">Bandwidth</Label>
                <Input
                  id="bandwidth-1"
                  name="bandwidth"
                  type="number"
                  value={formData.bandwidth}
                  min={0}
                  onChange={updateField("bandwidth")}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="storage-1">Storage</Label>
                <Input
                  id="storage-1"
                  name="storage"
                  type="number"
                  value={formData.storage}
                  min={0}
                  onChange={updateField("storage")}
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
              <Field>
                <Label htmlFor="MIPS-1">MIPS</Label>
                <Input
                  id="MIPS-1"
                  name="MIPS"
                  type="number"
                  value={formData.mips}
                  min={0}
                  onChange={updateField("mips")}
                  required
                />
              </Field>
            </FieldGroup>
          </form>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline">Cancel</Button>}
            ></DialogClose>
            <Button type="submit" form="vmForm">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default VMTable

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
import { DatacenterInfo, HostInfo } from "@/lib/types"
import { MoreVertical } from "lucide-react"
import React, {
  useState,
  SubmitEventHandler,
  ChangeEvent,
  useRef,
  useEffect,
} from "react"
import { Badge } from "@/components/ui/badge"
import { parseCsv } from "@/lib/utils"
import { toast } from "sonner"

interface HostTableProps {
  data: HostInfo[]
  setData: React.Dispatch<React.SetStateAction<HostInfo[]>>
  datacenter: DatacenterInfo
  setDatacenter: React.Dispatch<React.SetStateAction<DatacenterInfo>>
  id: number
  setId: React.Dispatch<React.SetStateAction<number>>
}

const HOST_HEADERS: Array<keyof HostInfo> = [
  "id",
  "datacenterId",
  "ram",
  "bandwidth",
  "storage",
  "cpu",
  "mips",
]

const newHost = (id: number, datacenterId: string): HostInfo => {
  id += 1
  return {
    id: `HOST-${id}`,
    ram: 0,
    bandwidth: 0,
    storage: 0,
    cpu: 0,
    mips: 0,
    datacenterId: datacenterId,
  }
}

const HostTable: React.FC<HostTableProps> = ({
  data,
  setData,
  datacenter,
  setDatacenter,
  id,
  setId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<HostInfo>(newHost(id, datacenter.id))

  const updateDatacenter = (dc: DatacenterInfo) => {
    setDatacenter(dc)
  }
  const updateDatacenterTotalCost = () => {
    datacenter.costTotal = datacenter.cost

    for (let i = 0; i < data.length; i += 1) {
      const host = data[i]
      const costRam = host.ram * datacenter.costRAM
      const costBandwidth = host.bandwidth * datacenter.costBandwidth
      const costStorage = host.storage * datacenter.costStorage

      datacenter.costTotal += costRam + costBandwidth + costStorage
    }
    datacenter.costTotal = Number(datacenter.costTotal.toFixed(3))

    updateDatacenter(datacenter)
  }
  useEffect(() => {
    updateDatacenterTotalCost()
  }, [data])

  const removeHost = (host: HostInfo) => {
    setData((prev) => prev.filter((item) => item.id !== host.id))
  }
  const updateHost = (host: HostInfo) => {
    setData((prev) =>
      prev.map((item) => (item.id === host.id ? { ...host } : item))
    )
  }
  const addHost = (host: HostInfo) => {
    id += 1
    setId(id)
    host.id = `HOST-${id}`
    setData((prev) => [...prev, host])
  }

  const updateField =
    (field: keyof typeof formData) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setFormData((prev) => ({
        ...prev,
        [field]: typeof prev[field] === "number" ? Number(value) : value,
      }))
    }

  const openEditDialog = (host: HostInfo) => {
    setFormData(host)
    setIsEditing(true)
    setIsDialogOpen(true)
  }
  const openAddDialog = () => {
    setFormData(newHost(id, datacenter.id))
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  const saveHost: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()

    if (isEditing) {
      updateHost(formData)
      setIsEditing(false)
    } else {
      addHost(formData)
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
    const indexMap = HOST_HEADERS.reduce<Record<string, number>>((acc, key) => {
      acc[String(key)] = header.indexOf(String(key))
      return acc
    }, {})
    const missing = HOST_HEADERS.map((key) => String(key)).filter(
      (key) => indexMap[key] === -1
    )

    if (missing.length > 0) {
      toast.error(`There are no columns: ${missing.join(", ")}`, {
        position: "bottom-right",
      })
      return
    }

    const parsed: HostInfo[] = []
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i]
      const entity: HostInfo = {
        id: row[indexMap.id],
        datacenterId: row[indexMap.datacenterId],
        ram: Number(row[indexMap.ram]),
        bandwidth: Number(row[indexMap.bandwidth]),
        storage: Number(row[indexMap.storage]),
        cpu: Number(row[indexMap.cpu]),
        mips: Number(row[indexMap.mips]),
      }
      // TODO: validate?
      parsed.push(entity)
    }

    const unique = new Map<string, HostInfo>()
    for (const entity of parsed) {
      unique.set(entity.id, entity)
    }

    setData(Array.from(unique.values()))
    setId(1000)
  }
  const downloadCsv = () => {
    const header = HOST_HEADERS.join(",")
    const rows = data.map((entity) =>
      HOST_HEADERS.map((key) => entity[key]).join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = "hosts.csv"
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
              <h1 className="text-base font-semibold">Hosts</h1>
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
                Add Host
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-background/96">
          <Table>
            <TableHeader className="bg-muted/55">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Datacenter ID</TableHead>
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
                  <TableCell>{item.datacenterId}</TableCell>
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
                            onClick={() => removeHost(item)}
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
              {isEditing ? "Edit Host" : "Add new Host"}
            </DialogTitle>
          </DialogHeader>

          <form id="hostForm" onSubmit={saveHost}>
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
                <Label htmlFor="datacenterId-1">Datacenter ID</Label>
                <Input
                  id="datacenterId-1"
                  name="datacenterId"
                  value={formData.datacenterId}
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
            <Button type="submit" form="hostForm">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default HostTable

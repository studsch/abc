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

interface DatacenterTableProps {
  data: DatacenterInfo
  setData: React.Dispatch<React.SetStateAction<DatacenterInfo>>
  hostArray: HostInfo[]
}

const DATACENTER_HEADERS: Array<keyof DatacenterInfo> = [
  "id",
  "os",
  "arch",
  "cost",
  "costRAM",
  "costBandwidth",
  "costStorage",
]

const DatacenterTable: React.FC<DatacenterTableProps> = ({
  data,
  setData,
  hostArray,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<DatacenterInfo>(data)

  const updateDatacenter = (dc: DatacenterInfo) => {
    setData(dc)
  }
  useEffect(() => {
    updateDatacenterTotalCost()
  }, [data])
  const updateDatacenterTotalCost = () => {
    data.costTotal = data.cost

    for (let i = 0; i < hostArray.length; i += 1) {
      const host = hostArray[i]
      const costRam = host.ram * data.costRAM
      const costBandwidth = host.bandwidth * data.costBandwidth
      const costStorage = host.storage * data.costStorage

      data.costTotal += costRam + costBandwidth + costStorage
    }
    data.costTotal = Number(data.costTotal.toFixed(3))

    updateDatacenter(data)
  }

  const updateField =
    (field: keyof typeof formData) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setFormData((prev) => ({
        ...prev,
        [field]: typeof prev[field] === "number" ? Number(value) : value,
      }))
    }

  const openEditDialog = () => {
    setFormData(data)
    setIsDialogOpen(true)
  }

  const saveDatacenter: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    updateDatacenter(formData)
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
    const indexMap = DATACENTER_HEADERS.reduce<Record<string, number>>(
      (acc, key) => {
        acc[String(key)] = header.indexOf(String(key))
        return acc
      },
      {}
    )
    const missing = DATACENTER_HEADERS.map((key) => String(key)).filter(
      (key) => indexMap[key] === -1
    )

    if (missing.length > 0) {
      toast.error(`There are no columns: ${missing.join(", ")}`, {
        position: "bottom-right",
      })
      return
    }

    const parsed: DatacenterInfo[] = []
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i]
      const entity: DatacenterInfo = {
        id: row[indexMap.id],
        os: row[indexMap.os],
        arch: row[indexMap.arch],
        cost: Number(row[indexMap.cost]),
        costRAM: Number(row[indexMap.costRAM]),
        costBandwidth: Number(row[indexMap.costBandwidth]),
        costStorage: Number(row[indexMap.costStorage]),
        costTotal: 0,
      }
      // TODO: validate?
      parsed.push(entity)
    }

    setData(parsed[0])
  }
  const downloadCsv = () => {
    const header = DATACENTER_HEADERS.join(",")
    const dataArray = [data]
    const rows = dataArray.map((entity) =>
      DATACENTER_HEADERS.map((key) => entity[key]).join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = "datacenter.csv"
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
              <h1 className="text-base font-semibold">Datacenter</h1>
              <Badge variant="secondary">1</Badge>
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
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-background/96">
          <Table>
            <TableHeader className="bg-muted/55">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead className="text-right">OS</TableHead>
                <TableHead className="text-right">Architecture</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Cost per RAM</TableHead>
                <TableHead className="text-right">Cost per Bandwidth</TableHead>
                <TableHead className="text-right">Cost per Storage</TableHead>
                <TableHead className="text-right">Total cost</TableHead>
                <TableHead className="w-14 text-right">
                  <span className="sr-only">Menu</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow key={data.id}>
                <TableCell>{data.id}</TableCell>
                <TableCell className="text-right">{data.os}</TableCell>
                <TableCell className="text-right">{data.arch}</TableCell>
                <TableCell className="text-right">{data.cost}</TableCell>
                <TableCell className="text-right">{data.costRAM}</TableCell>
                <TableCell className="text-right">
                  {data.costBandwidth}
                </TableCell>
                <TableCell className="text-right">{data.costStorage}</TableCell>
                <TableCell className="text-right">{data.costTotal}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Menu for ${data.id}`}
                          />
                        }
                      >
                        <MoreVertical />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog()}>
                          <p>Edit</p>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Datacenter</DialogTitle>
          </DialogHeader>

          <form id="datacenterForm" onSubmit={saveDatacenter}>
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
                <Label htmlFor="os-1">OS</Label>
                <Input
                  id="os-1"
                  name="os"
                  value={formData.os}
                  onChange={updateField("os")}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="arch-1">Architecture</Label>
                <Input
                  id="arch-1"
                  name="arch"
                  value={formData.arch}
                  onChange={updateField("arch")}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="cost-1">Cost</Label>
                <Input
                  id="cost-1"
                  name="cost"
                  type="number"
                  min={0}
                  step={0.001}
                  value={formData.cost}
                  onChange={updateField("cost")}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="costRAM-1">Cost per RAM</Label>
                <Input
                  id="costRAM-1"
                  name="costRAM"
                  type="number"
                  min={0}
                  step={0.001}
                  value={formData.costRAM}
                  onChange={updateField("costRAM")}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="costBandwidth-1">Cost per Bandwidth</Label>
                <Input
                  id="cost-1"
                  name="cost"
                  type="number"
                  min={0}
                  step={0.001}
                  value={formData.costBandwidth}
                  onChange={updateField("costBandwidth")}
                  required
                />
              </Field>
              <Field>
                <Label htmlFor="costStorage-1">Cost per Storage</Label>
                <Input
                  id="costStorage-1"
                  name="costStorage"
                  type="number"
                  min={0}
                  step={0.001}
                  value={formData.costStorage}
                  onChange={updateField("costStorage")}
                  required
                />
              </Field>
            </FieldGroup>
          </form>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline">Cancel</Button>}
            ></DialogClose>
            <Button type="submit" form="datacenterForm">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default DatacenterTable

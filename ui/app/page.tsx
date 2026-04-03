"use client"

import DatacenterTable from "@/components/blocks/datacenter"
import HostTable from "@/components/blocks/host"
import RunScript from "@/components/blocks/run-script"
import TaskTable from "@/components/blocks/task"
import VMTable from "@/components/blocks/vm"
import { DatacenterInfo, HostInfo, TaskInfo, VMInfo } from "@/lib/types"
import { useEffect, useState } from "react"

export default function Page() {
  const [totalCost, setTotalCost] = useState<Number>(0)
  const [datacenterInfo, setDatacenterInfo] = useState<DatacenterInfo>({
    id: "datacenter-001",
    os: "linux",
    arch: "x86",
    cost: 100.0,
    costRAM: 0.01,
    costBandwidth: 0.0,
    costStorage: 0.002,
    costTotal: 0.0,
  })
  const [hostArray, setHostArray] = useState<HostInfo[]>([])
  const [vmArray, setVMArray] = useState<VMInfo[]>([])
  const [taskArray, setTaskArray] = useState<TaskInfo[]>([])

  const [vmPolicyOptions, setVMPolicyOptions] = useState<string[]>([])
  const [taskPolicyOptions, setTaskPolicyOptions] = useState<string[]>([])
  const [selectedVMPolicy, setSelectedVMPolicy] = useState<string>("")
  const [selectedTaskPolicy, setSelectedTaskPolicy] = useState<string>("")

  useEffect(() => {
    setTotalCost(datacenterInfo.costTotal)
  }, [datacenterInfo, hostArray])

  return (
    <main className="relative min-h-svh overflow-hidden bg-muted/40 p-2 md:p-3">
      <div
        className="pointer-events-none absolute inset-0 bg-foreground/4"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-375 flex-col overflow-hidden rounded-2xl border bg-background/95 shadow-sm">
        <header className="flex h-16 items-center justify-between border-b px-4 md:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Cost: {totalCost.toString()}
            </h1>
          </div>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 font-medium text-foreground transition-colors hover:text-muted-foreground"
          >
            GitHub
          </a>
        </header>

        <section className="flex flex-col gap-4 p-4 md:p-5">
          <DatacenterTable
            data={datacenterInfo}
            setData={setDatacenterInfo}
            hostArray={hostArray}
          />
          <HostTable
            data={hostArray}
            setData={setHostArray}
            datacenter={datacenterInfo}
            setDatacenter={setDatacenterInfo}
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <VMTable data={vmArray} setData={setVMArray} />
            <TaskTable data={taskArray} setData={setTaskArray} />
          </div>
        </section>

        <RunScript
          vmPolicyOptions={vmPolicyOptions}
          setVMPolicyOptions={setVMPolicyOptions}
          taskPolicyOptions={taskPolicyOptions}
          setTaskPolicyOptions={setTaskPolicyOptions}
          selectedVMPolicy={selectedVMPolicy}
          setSelectedVMPolicy={setSelectedVMPolicy}
          selectedTaskPolicy={selectedTaskPolicy}
          setSelectedTaskPolicy={setSelectedTaskPolicy}
        />
      </div>
    </main>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import React, { useRef, useState } from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import {
  DatacenterInfo,
  HostInfo,
  TaskInfo,
  VMInfo,
  PolicyReponse,
  SimulationResponse,
} from "@/lib/types"
import GanttChart from "@/components/blocks/gantt-chart"
import VmUtilization from "@/components/blocks/vm-utilization"

interface RunScriptProps {
  vmPolicyOptions: string[]
  setVMPolicyOptions: React.Dispatch<React.SetStateAction<string[]>>
  taskPolicyOptions: string[]
  setTaskPolicyOptions: React.Dispatch<React.SetStateAction<string[]>>
  selectedVMPolicy: string
  setSelectedVMPolicy: React.Dispatch<React.SetStateAction<string>>
  selectedTaskPolicy: string
  setSelectedTaskPolicy: React.Dispatch<React.SetStateAction<string>>
  datacenter: DatacenterInfo
  hostArray: HostInfo[]
  vmArray: VMInfo[]
  taskArray: TaskInfo[]
}

const fetchPoliciesByFile = async (
  file: File
): Promise<PolicyReponse | void> => {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch("http://localhost:8000/api/get_policies", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    toast.error(error["detail"], { position: "bottom-right" })
    return
  }

  const payload: PolicyReponse = await response.json()
  return payload
}

const fetchRunSimulation = async (
  file: File,
  vmAllocationPolicy: string,
  taskSchedulerPolicy: string,
  datacenter: DatacenterInfo,
  hostArray: HostInfo[],
  vmArray: VMInfo[],
  taskArray: TaskInfo[]
): Promise<SimulationResponse> => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append(
    "entities",
    JSON.stringify({
      vmAllocationPolicy: vmAllocationPolicy,
      taskSchedulerPolicy: taskSchedulerPolicy,
      datacenter: datacenter,
      hosts: hostArray,
      vms: vmArray,
      tasks: taskArray,
    })
  )

  const response = await fetch("http://localhost:8000/api/run_simulation", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`${response.status} - ${error["detail"]}`)
  }

  const payload = await response.json()
  return payload
}

const RunScript: React.FC<RunScriptProps> = ({
  vmPolicyOptions,
  setVMPolicyOptions,
  taskPolicyOptions,
  setTaskPolicyOptions,
  selectedVMPolicy,
  setSelectedVMPolicy,
  selectedTaskPolicy,
  setSelectedTaskPolicy,
  datacenter,
  hostArray,
  vmArray,
  taskArray,
}) => {
  const [res, setRes] = useState<SimulationResponse | null>(null)
  const [pythonFile, setPythonFile] = useState<File | null>(null)
  const pythonFileInputRef = useRef<HTMLInputElement>(null)

  const handlePythonFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    try {
      const response = await fetchPoliciesByFile(file)
      if (response) {
        setVMPolicyOptions(response.vmAllocationPolicy)
        setTaskPolicyOptions(response.taskSchedulerPolicy)
        setSelectedVMPolicy(response.vmAllocationPolicy[0] ?? "")
        setSelectedTaskPolicy(response.taskSchedulerPolicy[0] ?? "")
        setPythonFile(file)
      }
    } catch (error) {
      setVMPolicyOptions([])
      setTaskPolicyOptions([])
      setSelectedVMPolicy("")
      setSelectedTaskPolicy("")
    }
  }

  const handleRunSimulation = async () => {
    if (
      !pythonFile ||
      !selectedVMPolicy ||
      !selectedTaskPolicy ||
      !datacenter ||
      hostArray.length === 0 ||
      vmArray.length === 0 ||
      taskArray.length === 0
    ) {
      return
    }

    try {
      const result = await fetchRunSimulation(
        pythonFile,
        selectedVMPolicy,
        selectedTaskPolicy,
        datacenter,
        hostArray,
        vmArray,
        taskArray
      )
      setRes(result)
    } catch (error) {
      toast.error("Can't run simulation", {
        description: `${error}`,
        position: "bottom-right",
      })
    }
  }

  return (
    <>
      <section className="border-t p-4 md:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">Simulation</h2>
            <p className="text-sm text-muted-foreground">
              Upload python file for select policies
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={pythonFileInputRef}
              type="file"
              accept=".py"
              className="hidden"
              onChange={handlePythonFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => pythonFileInputRef.current?.click()}
            >
              <Upload data-icon="inline-start" />
              Upload python file
            </Button>

            <Select
              value={selectedVMPolicy}
              onValueChange={(value) => setSelectedVMPolicy(value ?? "")}
              disabled={vmPolicyOptions.length === 0}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="VMAllocationPolicy" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {vmPolicyOptions.map((policy) => (
                    <SelectItem key={policy} value={policy}>
                      {policy}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={selectedTaskPolicy}
              onValueChange={(value) => setSelectedTaskPolicy(value ?? "")}
              disabled={taskPolicyOptions.length === 0}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="TaskSchedulerPolicy" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {taskPolicyOptions.map((policy) => (
                    <SelectItem key={policy} value={policy}>
                      {policy}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button
              onClick={handleRunSimulation}
              disabled={
                !selectedVMPolicy ||
                !selectedTaskPolicy ||
                hostArray.length === 0 ||
                vmArray.length === 0 ||
                taskArray.length === 0
              }
            >
              Run Simulation
            </Button>
          </div>
        </div>
      </section>

      {res && (
        <section className="border-t p-4 md:p-5">
          <GanttChart tasks={res.taskHistory.tasks} />
        </section>
      )}

      {res && (
        <section className="border-t p-4 md:p-5">
          <VmUtilization vmUtilization={res.vmUtilization} />
        </section>
      )}
    </>
  )
}

export default RunScript

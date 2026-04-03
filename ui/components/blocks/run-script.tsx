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
import React, { useRef } from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"

interface RunScriptProps {
  vmPolicyOptions: string[]
  setVMPolicyOptions: React.Dispatch<React.SetStateAction<string[]>>
  taskPolicyOptions: string[]
  setTaskPolicyOptions: React.Dispatch<React.SetStateAction<string[]>>
  selectedVMPolicy: string
  setSelectedVMPolicy: React.Dispatch<React.SetStateAction<string>>
  selectedTaskPolicy: string
  setSelectedTaskPolicy: React.Dispatch<React.SetStateAction<string>>
}

type PolicyReponse = {
  vmAllocationPolicy: string[]
  taskSchedulerPolicy: string[]
}
const fetchPoliciesByFile = async (file: File): Promise<PolicyReponse> => {
  const formData = new FormData()
  formData.append("file", file)

  // TODO: change endpoint
  const response = await fetch("/api...", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    // TODO: toast error
    const tmp = {
      vmAllocationPolicy: ["vmAllocation-1", "vmAllocation-2"],
      taskSchedulerPolicy: ["taskScheduler-1", "taskScheduler-2"],
    }
    return tmp
  }

  const payload: PolicyReponse = await response.json()
  return payload
}

const runSimulationRequest = async (
  vmAllocationPolicy: string,
  taskSchedulerPolicy: string
): Promise<string> => {
  const formData = new FormData()
  formData.append("vmAllocationPolicy", vmAllocationPolicy)
  formData.append("taskSchedulerPolicy", taskSchedulerPolicy)
  // TODO: add more

  // TODO: change endpoint
  const response = await fetch("/api", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`)
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
}) => {
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
      setVMPolicyOptions(response.vmAllocationPolicy)
      setTaskPolicyOptions(response.taskSchedulerPolicy)
      setSelectedVMPolicy(response.vmAllocationPolicy[0] ?? "")
      setSelectedTaskPolicy(response.taskSchedulerPolicy[0] ?? "")
    } catch (error) {
      setVMPolicyOptions([])
      setTaskPolicyOptions([])
      setSelectedVMPolicy("")
      setSelectedTaskPolicy("")
    }
  }

  const handleRunSimulation = async () => {
    try {
      const result = await runSimulationRequest(
        selectedVMPolicy,
        selectedTaskPolicy
      )
      // save somehow
    } catch (error) {
      toast.error("Can't run simulation", {
        description: `${error}`,
        position: "bottom-right",
      })
    }
  }

  return (
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

          {/* TODO: add more for disabled */}
          <Button
            onClick={handleRunSimulation}
            disabled={!selectedVMPolicy || !selectedTaskPolicy}
          >
            Run Simulation
          </Button>
        </div>
      </div>
    </section>
  )
}

export default RunScript

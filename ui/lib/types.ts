export interface DatacenterInfo {
  id: string
  os: string
  arch: string
  cost: number
  costRAM: number
  costBandwidth: number
  costStorage: number
  costTotal: number
}

export interface HostInfo {
  id: string
  ram: number
  bandwidth: number
  storage: number
  cpu: number
  mips: number
  // vmCount: number
  datacenterId: string
}

export interface VMInfo {
  id: string
  ram: number
  bandwidth: number
  storage: number
  cpu: number
  mips: number
  // hostId: string
}

export interface TaskInfo {
  id: string
  length: number
  input_size: number
  output_size: number
  cpu: number
}

export interface VmResources {
  PE: number
  RAM: number
  Storage: number
}

export interface TaskSegments {
  start: number
  end: number
  vm: string
}

export interface Task {
  id: string
  segments: TaskSegments[]
}

export interface PolicyReponse {
  vmAllocationPolicy: string[]
  taskSchedulerPolicy: string[]
}

export interface SimulationResponse {
  taskHistory: {
    tasks: Task[]
  }
  vmUtilization: Record<string, VmResources>
  metrics: Metrics
}

export interface Metrics {
  makespan: number
  average_waiting_time: number
  throughput: number
  rejected_tasks_percent: number
  total_tasks: number
  completed_tasks: number
  rejected_tasks: number
  rejected_task_ids: string[]
  average_execution_time: number
}

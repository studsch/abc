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

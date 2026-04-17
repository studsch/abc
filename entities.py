import csv
import json

from datetime import datetime
from pathlib import Path

from abc import ABC, abstractmethod
from typing import Any, override
from collections.abc import Generator

from simpy import Environment
from simpy.core import SimTime
from simpy.events import AllOf, Process, Timeout


COUNTERS = {
    "VM": 0,
    "HOST": 0,
    "DATACENTER": 0,
    "TASK": 0,
}

# Structure:
# {
#     task_id: [
#         (task_start, task_end, vm),
#     ]
# }
#
# Example:
# {
#    'TASK-1': [(0, 10, 'VM-1')],
#    'TASK-2': [(0, 15, 'VM-2')],
#    'TASK-3': [(10, 18, 'VM-1')]
# }
TASKS_HISTORY: dict[str, list[tuple[SimTime, SimTime, str]]] = {}

LAST_RUN_INFO: dict[str, Any] = {}


class VM:
    """"""

    def __init__(
        self,
        ram: int,
        bandwidth: int,
        storage: int,
        pes_number: int,
        pe_mips: int,
        id: str | None = None,
    ) -> None:
        self.ram: int = ram  # mb
        self.bandwidth: int = bandwidth
        self.storage: int = storage  # mb
        self.pes_number: int = pes_number
        self.pe_mips: int = pe_mips
        self.host_id: str | None = None

        if id is None:
            COUNTERS["VM"] += 1
            self.id: str = f"VM-{COUNTERS['VM']}"
        else:
            self.id = id


class Host:
    """"""

    def __init__(
        self,
        ram: int,
        bandwidth: int,
        storage: int,
        pes_number: int,
        pe_mips: int,
        id: str | None = None,
    ) -> None:
        self.ram: int = ram
        self.bandwidth: int = bandwidth
        self.storage: int = storage
        self.pes_number: int = pes_number
        self.pe_mips: int = pe_mips
        self.vm_list: list[VM] = []
        self.datacenter_id: str | None = None

        if id is None:
            COUNTERS["HOST"] += 1
            self.id: str = f"HOST-{COUNTERS['HOST']}"
        else:
            self.id = id

    # ram, bandwidth, storage, number of CPUs
    def available_resources(self) -> tuple[int, int, int, int]:
        used_ram = 0
        used_bandwidth = 0
        used_storage = 0
        used_pes = 0

        for vm in self.vm_list:
            used_ram += vm.ram
            used_bandwidth += vm.bandwidth
            used_storage += vm.storage
            used_pes += vm.pes_number

        available_ram = self.ram - used_ram
        available_bandwidth = self.bandwidth - used_bandwidth
        available_storage = self.storage - used_storage
        available_pes_number = self.pes_number - used_pes

        return (
            available_ram,
            available_bandwidth,
            available_storage,
            available_pes_number,
        )

    def can_allocate_vm(self, vm: VM) -> bool:
        (
            available_ram,
            available_bandwidth,
            available_storage,
            available_pes_number,
        ) = self.available_resources()
        if (
            (vm.ram > available_ram)
            or (vm.bandwidth > available_bandwidth)
            or (vm.storage > available_storage)
            or (vm.pes_number > available_pes_number)
            or (vm.pe_mips > self.pe_mips)
        ):
            return False
        return True

    def add_vm(self, vm: VM) -> None:
        if self.can_allocate_vm(vm):
            vm.host_id = self.id
            self.vm_list.append(vm)

    def get_vm_id_list(self) -> list[str]:
        return [vm.id for vm in self.vm_list]


class Datacenter:
    """"""

    def __init__(
        self,
        os: str,
        arch: str,
        cost: float,
        cost_per_ram: float,
        cost_per_bandwidth: float,
        cost_per_storage: float,
        id: str | None = None,
    ) -> None:
        self.os: str = os
        self.arch: str = arch
        self.cost: float = cost
        self.cost_per_ram: float = cost_per_ram
        self.cost_per_bandwidth: float = cost_per_bandwidth
        self.cost_per_storage: float = cost_per_storage
        self.host_list: list[Host] = []

        if id is None:
            COUNTERS["DATACENTER"] += 1
            self.id: str = f"DATACENTER-{COUNTERS['DATACENTER']}"
        else:
            self.id = id

    def add_host(self, host: Host) -> None:
        host.datacenter_id = self.id
        self.host_list.append(host)

    def get_cost(self) -> tuple[float, float, float, float, float]:
        used_ram = 0
        used_bandwidth = 0
        used_storage = 0
        for host in self.host_list:
            used_ram += host.ram
            used_bandwidth += host.bandwidth
            used_storage += host.storage

        cost_ram = self.cost_per_ram * used_ram
        cost_bandwidth = self.cost_per_bandwidth * used_bandwidth
        cost_storage = self.cost_per_storage * used_storage
        cost_total = self.cost + cost_ram + cost_bandwidth + cost_storage

        # datacenter cost | ram cost | bandwidth cost | storage cost | total cost
        return (self.cost, cost_ram, cost_bandwidth, cost_storage, cost_total)


class VMAllocation(ABC):
    """"""

    @abstractmethod
    def allocate_vms_in_datacenters(
        self, vm_list: list[VM], datacenter_list: list[Datacenter]
    ) -> None:
        pass

    @abstractmethod
    def assign_vm_to_host(self, vm: VM, host_list: list[Host]) -> None:
        """"""
        pass


class Task:
    """"""

    def __init__(
        self,
        length: int,
        input_size: int,
        output_size: int,
        pes_number: int,
        id: str | None = None,
    ) -> None:
        self.length: int = length
        self.input_size: int = input_size
        self.output_size: int = output_size
        self.pes_number: int = pes_number
        self.finish_time: int | None = None
        self.vm: VM | None = None

        if id is None:
            COUNTERS["TASK"] += 1
            self.id: str = f"TASK-{COUNTERS['TASK']}"
        else:
            self.id = id

    def set_vm(self, vm: VM) -> None:
        self.vm = vm

    def get_vm(self) -> VM:
        if self.vm is None:
            raise ValueError("VM for the task is not set")
        return self.vm


class TaskScheduler(ABC):
    """"""

    def __init__(self, env: Environment, vm_list: list[VM]) -> None:
        self.env: Environment = env
        self.free_vm_list: list[VM] = [x for x in vm_list]
        self.running_vm_list: list[VM] = []
        self.vm_utilization: dict[str, tuple[float, float, float]] = {
            vm.id: (0, 0, 0) for vm in vm_list
        }  # maximum resources used on vm

    def vm_can_run_task(self, vm: VM, task: Task) -> bool:
        return (
            vm.pes_number >= task.pes_number
            and vm.ram >= task.input_size
            and vm.storage >= (task.output_size + task.input_size)
        )

    def run_task(self, task: Task) -> Generator[Process | Timeout, Any, Any]:
        time_start = self.env.now
        yield self.env.timeout(task.length)
        time_end = self.env.now
        task_vm = task.get_vm()

        if task.id in TASKS_HISTORY:
            TASKS_HISTORY[task.id].append((time_start, time_end, task_vm.id))
        else:
            TASKS_HISTORY[task.id] = [(time_start, time_end, task_vm.id)]

        self.running_vm_list.remove(task_vm)
        self.free_vm_list.append(task_vm)

    def used_vm_resources(self, vm: VM, task: Task) -> tuple[float, float, float]:
        pes_number = task.pes_number / vm.pes_number
        ram = task.input_size / vm.ram
        storage = (task.input_size + task.output_size) / vm.storage
        return (pes_number, ram, storage)

    def schedule_task(self, task: Task) -> Generator[Process | Timeout, Any, Any]:
        while True:
            vm = next(
                (vm for vm in self.free_vm_list if self.vm_can_run_task(vm, task)), None
            )
            if vm:
                self.free_vm_list.remove(vm)
                task.set_vm(vm)
                self.running_vm_list.append(vm)
                self.vm_utilization[vm.id] = max(
                    self.vm_utilization[vm.id], self.used_vm_resources(vm, task)
                )
                yield self.env.process(self.run_task(task))
                break
            else:
                yield self.env.timeout(1)

    def get_utilization(self) -> dict[str, dict[str, float]]:
        out: dict[str, dict[str, float]] = {}
        for vm in self.vm_utilization:
            out[vm] = {
                "PE": round(self.vm_utilization[vm][0] * 100, 2),
                "RAM": round(self.vm_utilization[vm][1] * 100, 2),
                "Storage": round(self.vm_utilization[vm][2] * 100, 2),
            }
        return out

    def print_utilization(self) -> None:
        u = self.get_utilization()
        for vm in u:
            print(f"""Maximum utilization in {vm}:
\tPEs:     {u[vm]["PE"]:.2f} %
\tRAM:     {u[vm]["RAM"]:.2f} %
\tStorage: {u[vm]["Storage"]:.2f} %""")

    @abstractmethod
    def schedule_all(self, tasks: list[Task]) -> Generator[AllOf, Any, None]:
        pass


class FCFSTaskScheduler(TaskScheduler):
    @override
    def schedule_all(self, tasks: list[Task]) -> Generator[AllOf, Any, None]:
        events = [self.env.process(self.schedule_task(t)) for t in tasks]
        # wait all events
        yield self.env.all_of(events)


class ByHostVMAllocation(VMAllocation):
    @override
    def allocate_vms_in_datacenters(
        self, vm_list: list[VM], datacenter_list: list[Datacenter]
    ) -> None:
        pass

    @override
    def assign_vm_to_host(self, vm: VM, host_list: list[Host]) -> None:
        pass


class DefaultVMAllocation(VMAllocation):
    @override
    def allocate_vms_in_datacenters(
        self, vm_list: list[VM], datacenter_list: list[Datacenter]
    ) -> None:
        for dc in datacenter_list:
            for vm in vm_list:
                self.assign_vm_to_host(vm, dc.host_list)

    @override
    def assign_vm_to_host(self, vm: VM, host_list: list[Host]) -> None:
        available_hosts = [h for h in host_list if h.can_allocate_vm(vm)]
        if not available_hosts:
            raise Exception("can't allocate VM to Host")
        host = max(host_list, key=lambda h: h.available_resources())
        host.add_vm(vm)


class Simulation:
    def __init__(
        self,
        datacenter: Datacenter,
        host_list: list[Host],
        vm_list: list[VM],
        task_list: list[Task],
        task_scheduler: type[TaskScheduler] | None = None,
        vm_allocation_by_host: bool = False,
        vm_allocation_policy: type[VMAllocation] | None = None,
    ) -> None:
        self.datacenter: Datacenter = datacenter
        self.host_list: list[Host] = host_list
        self.vm_list: list[VM] = vm_list
        self.task_list: list[Task] = task_list

        if vm_allocation_policy is None:
            if vm_allocation_by_host:
                self.vm_allocation_policy: VMAllocation = ByHostVMAllocation()
            else:
                self.vm_allocation_policy = DefaultVMAllocation()
        else:
            self.vm_allocation_policy = vm_allocation_policy()

        self.env: Environment = Environment()
        if task_scheduler is None:
            self.task_scheduler: TaskScheduler = FCFSTaskScheduler(self.env, vm_list)
        else:
            self.task_scheduler = task_scheduler(self.env, vm_list)

        for host in host_list:
            self.datacenter.add_host(host)

        self.vm_allocation_policy.allocate_vms_in_datacenters(vm_list, [datacenter])

        cost_dc, cost_ram, cost_bandwidth, cost_storage, cost_total = (
            self.datacenter.get_cost()
        )
        print(f"""Datacenter cost:
\tcost               - {cost_dc}
\tcost per RAM       - {cost_ram}
\tcost per bandwidth - {cost_bandwidth}
\tcost per storage   - {cost_storage}
\tTotal cost         - {cost_total}\n""")

    def run(self) -> None:
        LAST_RUN_INFO["datacenter"] = self.datacenter
        LAST_RUN_INFO["hosts"] = self.host_list
        LAST_RUN_INFO["vms"] = self.vm_list
        LAST_RUN_INFO["tasks"] = self.task_list
        self._print_simulation_info()
        print()
        _ = self.env.process(self.task_scheduler.schedule_all(self.task_list))
        _ = self.env.run()
        LAST_RUN_INFO["vm_utilization"] = self.get_vm_utilization()
        LAST_RUN_INFO["task_history"] = TASKS_HISTORY
        self.task_scheduler.print_utilization()

    def get_vm_utilization(self) -> dict[str, dict[str, float]]:
        return self.task_scheduler.get_utilization()

    def _print_simulation_info(self) -> None:
        print(f"{self.datacenter.id} ({self.datacenter.os}, {self.datacenter.arch}):")
        for h in self.host_list:
            print(
                f"    {h.id} (datacenter id: {h.datacenter_id}, RAM: {h.ram}, BANDWIDTH: {h.bandwidth}, STORAGE: {h.storage}, CPU: {h.pes_number}, MIPS: {h.pe_mips})"
            )
            for vm in h.vm_list:
                print(
                    f"        {vm.id} (RAM: {vm.ram}, BANDWIDTH: {vm.bandwidth}, STORAGE: {vm.storage}, CPU: {vm.pes_number}, MIPS: {vm.pe_mips})"
                )
        print("\nList of tasks")
        for t in self.task_list:
            print(
                f"{t.id} (LENGTH: {t.length}, INPUT SIZE: {t.input_size}, OUTPUT SIZE: {t.output_size}, CPU: {t.pes_number})"
            )


def save_entities(prefix: str) -> None:
    d: Datacenter = LAST_RUN_INFO["datacenter"]
    datacenter = [
        ["id", "os", "arch", "cost", "costRAM", "costBandwidth", "costStorage"],
        [
            d.id,
            d.os,
            d.arch,
            d.cost,
            d.cost_per_ram,
            d.cost_per_bandwidth,
            d.cost_per_storage,
        ],
    ]
    with open(f"{prefix}datacenter.csv", "w") as f:
        w = csv.writer(f)
        w.writerows(datacenter)

    host_list: list[Host] = LAST_RUN_INFO["hosts"]
    hosts = [["id", "datacenterId", "ram", "bandwidth", "storage", "cpu", "mips"]]
    for h in host_list:
        row = []
        row.append(h.id)
        row.append(h.datacenter_id)
        row.append(h.ram)
        row.append(h.bandwidth)
        row.append(h.storage)
        row.append(h.pes_number)
        row.append(h.pe_mips)
        hosts.append(row)
    with open(f"{prefix}host.csv", "w") as f:
        w = csv.writer(f)
        w.writerows(hosts)

    vm_list: list[VM] = LAST_RUN_INFO["vms"]
    vms = [["id", "ram", "bandwidth", "storage", "cpu", "mips"]]
    for vm in vm_list:
        row = []
        row.append(vm.id)
        row.append(vm.ram)
        row.append(vm.bandwidth)
        row.append(vm.storage)
        row.append(vm.pes_number)
        row.append(vm.pe_mips)
        vms.append(row)
    with open(f"{prefix}vm.csv", "w") as f:
        w = csv.writer(f)
        w.writerows(vms)

    task_list: list[Task] = LAST_RUN_INFO["tasks"]
    tasks = [["id", "length", "input_size", "output_size", "cpu"]]
    for task in task_list:
        row = []
        row.append(task.id)
        row.append(task.length)
        row.append(task.input_size)
        row.append(task.output_size)
        row.append(task.pes_number)
        tasks.append(row)
    with open(f"{prefix}task.csv", "w") as f:
        w = csv.writer(f)
        w.writerows(tasks)


def save_all_results() -> str:
    timestamp = datetime.now().strftime("%d%m%y%H%M%S")
    location = f"results/{timestamp}/"
    folder = Path(location)
    folder.mkdir(parents=True, exist_ok=True)

    save_entities(location)

    task_history_json = task_history_to_json()
    task_history_csv = task_history_to_csv()
    with open(f"{location}task_history.json", "w") as f:
        json.dump(task_history_json, f, indent=2)
    with open(f"{location}task_history.csv", "w") as f:
        w = csv.writer(f)
        w.writerows(task_history_csv)

    with open(f"{location}vm_utilization.json", "w") as f:
        json.dump(LAST_RUN_INFO["vm_utilization"], f, indent=2)
    return location


def task_history_to_json() -> dict[str, list[Any]]:
    data: dict[str, list[Any]] = {"tasks": []}
    for k, v in TASKS_HISTORY.items():
        segments: list[Any] = []
        for seg in v:
            segments.append(
                {
                    "start": seg[0],
                    "end": seg[1],
                    "vm": seg[2],
                }
            )
        data["tasks"].append(
            {
                "id": k,
                "segments": segments,
            }
        )
    return data


def task_history_to_csv() -> list[list[str]]:
    data = [["ID", "START", "END", "VM"]]
    for k, v in TASKS_HISTORY.items():
        for seg in v:
            row = []
            row.append(k)
            row.append(seg[0])
            row.append(seg[1])
            row.append(seg[2])
            data.append(row)
    return data

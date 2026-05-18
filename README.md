# Software for simulation of distributed computing systems

A simple product for testing scheduling algorithms in distributed computing
systems. This project can help you to test and compare:

- task scheduling algorithms
- VM allocation policies
- infrastructure cost/performance tradeoffs

## Structure of project

- [`entities.py`](./entities.py) - core simulation entities, base abstractions,
  default scheduler/allocation metrics, result export
- [`schedulers.py`](./schedulers.py) - implementations of policies (FCFS, SJF,
  Min-Min, Max-Min, Grey Wolf Optimizer)
- [`example.py`](./example.py) - minimal executable python simulation example
  (w/o UI)
- [`api.py`](./api.py) - FastAPI backend for UI integration and simulation
  execution
- [`ui/`](./ui/) - graphical user interface for interactive scenario editing,
  simulations, runs, visualization, and metrics comparison

## Simulation models

**Entities:**

- `Datacenter` - represents a data center. It describes the resource costs for a
  specific data center and includes a list of physical machines that should be
  located there. This class does not serve any purpose related to task
  processing.
- `Host` - a physical machine inside a data center that hosts virtual machines.
- `VM` - a representation of virtual machines running within a host. It is the
  final stage of virtualization, where tasks are executed.
- `Task` - describes the computational task that is planned for the simulation.
  In the CloudSim environment, the term "Cloudlet" is used for similar purposes.
- `Simulation` - the entity serves to simplify interaction with the simulation;
  it is responsible for running the simulation and displaying the results.

- _`VMAllocation`_ - an abstract class that allows the user to specify their own
  algorithms for placing virtual machines between servers.
- _`TaskScheduler`_ - an abstract class that is responsible for the scheduling
  policy for tasks to run on virtual machines.

**Units:**

- VM/Host `ram`: MB
- VM/Host `storage`: MB
- VM/Host `bandwidth`: MB/s
- VM/Host `pes_number`: number of processing elements (CPU)
- VM/Host `pe_mips`: millions instructions per second (MIPS) per processing
  elements
- Task `length`: million instructions (MI)
- Task `input_size`, `output_size`: MB
- Task `pes_number`: requested processing elements (CPU)

## Simulation Flow

1. Create all entities (Datacenter, Host, VM, Task)
2. Attach hosts to datacenter
3. Allocate VMs to hosts via VM allocation policy
4. Schedule tasks via selected scheduler policy
5. Run SimPy environment
6. Collect `task timeline`, `VM utilization`, `metrics`
7. Optionally persist all outputs to `results/<timestamp>/`

## Produced metrics

- `makespan` - the total execution time of all tasks, from the start of the
  simulation to the completion of the last one
- `average_execution_time` - average task completion time
- `average_waiting_time` - average waiting time before starting a task
- `throughput` - how many tasks are completed per unit of time
- `total_tasks` - total number of tasks
- `completed_tasks` - the number of tasks that were completed during the
  simulation
- `rejected_tasks` - number of tasks that were not completed
- `rejected_tasks_ids` - IDs of tasks that were not completed
- `rejected_tasks_percent` - the percentage of tasks that failed to run due to
  available resources or time constraints, if the custom algorithm has one

Also produced:

- VM peak utilization per VM (`PE`, `RAM`, `Storage`, in percent)
- Task execution segments with `start`/`end`/`VM`

## Quick start

### Install backend dependencies

All dependencies in [`pyproject.toml`](./pyproject.toml)

### Install frontend dependencies

All dependencies in [`ui/package.json`](./ui/package.json)

### Run backend

```bash
fastapi run api.py
```

Backend becomes available at `http://localhost:8000`

### Run graphical interface

```bash
cd ui
npm run dev
```

Frontend runs at `http://localhost:3000`

## UI workflow

1. Configure Datacenter, Hosts, VMs, Tasks in tables
2. Optionally import CSV files for each entity table
3. Upload a python file with policy classes
4. Select VM allocation and task scheduler policies from dropdowns (see
   [how to extend with custom policies](#extending-with-custom-policies))
5. Run simulation
6. Inspect:
   - Metrics summary
   - Gantt chart task timeline
   - VM utilization charts
7. Optionally download all results

The metrics page (`/metrics`) lets you compare multiple saved `metrics.json`
files by uploading files/folders and visualizing bar charts.

## CSV import/export headers

**Datacenter**

`id,os,arch,cost,costRAM,costBandwidth,costStorage`

**Hosts**

`id,datacenterId,ram,bandwidth,storage,cpu,mips`

**VMs**

`id,ram,bandwidth,storage,cpu,mips`

**Tasks**

`id,length,input_size,output_size,cpu`

## Extending with custom policies

To test the distribution algorithms, you must either load the python file into
the appropriate section of the interface or use a simulation script (as in this
[example](./example.py)). The `.py` file must contain classes that inherit from:

- _`TaskScheduler`_
- _`VMAllocation`_

Minimal skeleton:

```py
from collections.abc import Generator
from typing import override, Any

from simpy.events import AllOf
from entities import VM, Datacenter, Host, Task, TaskScheduler, VMAllocation


class MyScheudler(TaskScheduler):
    @override
    def schedule_all(self, tasks: list[Task]) -> Generator[AllOf, Any, None]:
        events = [self.env.process(self.schedule_task(task)) for task in tasks]
        yield self.env.all_of(events)


class MyVMAllocation(VMAllocation):
    @override
    def allocate_vms_in_datacenters(
        self, vm_list: list[VM], datacenter_list: list[Datacenter]
    ) -> None:
        host_list = [h for dc in datacenter_list for h in dc.host_list]
        for vm in vm_list:
            self.assign_vm_to_host(vm, host_list)

    @override
    def assign_vm_to_host(self, vm: VM, host_list: list[Host]) -> None:
        for host in host_list:
            if host.can_allocate_vm(vm):
                host.add_vm(vm)
                return
        raise Exception("can't allocate VM to Host")
```

It is worth noting that it is important to define at least one of the classes
that inherits either _`TaskScheduler`_ or _`VMAllocation`_.

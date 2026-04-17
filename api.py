import ast
import importlib.util
import os
import tempfile
from typing import Annotated, cast
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError

from entities import (
    VM,
    Datacenter,
    DefaultVMAllocation,
    FCFSTaskScheduler,
    Host,
    Simulation,
    Task,
    TaskScheduler,
    VMAllocation,
    save_all_results,
    task_history_to_json,
)


class MDatacenter(BaseModel):
    id: str
    os: str
    arch: str
    cost: float
    costRAM: float
    costBandwidth: float
    costStorage: float
    costTotal: float


class MHost(BaseModel):
    id: str
    datacenterId: str
    ram: int
    bandwidth: int
    storage: int
    cpu: int
    mips: int


class MVM(BaseModel):
    id: str
    ram: int
    bandwidth: int
    storage: int
    cpu: int
    mips: int


class MTask(BaseModel):
    id: str
    length: int
    input_size: int
    output_size: int
    cpu: int


class SimulationRequest(BaseModel):
    vmAllocationPolicy: str
    taskSchedulerPolicy: str
    datacenter: MDatacenter
    hosts: list[MHost]
    vms: list[MVM]
    tasks: list[MTask]


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/get_policies")
async def get_policies(file: Annotated[UploadFile, File(...)]):
    if file.filename and not file.filename.endswith(".py"):
        raise HTTPException(status_code=400, detail="Only .py files are allowed")

    content = await file.read()
    source_code = content.decode("utf-8")
    tree = ast.parse(source_code)

    vm_allocators: list[str] = ["default"]
    task_schedulers: list[str] = ["default (FCFS)"]
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            for base in node.bases:
                if isinstance(base, ast.Name) and base.id == "TaskScheduler":
                    task_schedulers.append(node.name)
                if isinstance(base, ast.Name) and base.id == "VMAllocation":
                    vm_allocators.append(node.name)

    return {
        "vmAllocationPolicy": vm_allocators,
        "taskSchedulerPolicy": task_schedulers,
    }


def parse_entities(entities: str) -> SimulationRequest:
    try:
        return SimulationRequest.model_validate_json(entities)
    except ValidationError as e:
        print(e.errors())
        raise HTTPException(422, detail="parsing error")


@app.post("/api/run_simulation")
async def run_simulation(
    file: Annotated[UploadFile, File(...)],
    entities: Annotated[str, Form(...)],
):
    if file.filename and not file.filename.endswith(".py"):
        raise HTTPException(status_code=400, detail="Only .py files are allowed")
    data = parse_entities(entities)

    file_content = await file.read()
    tmp_path = ""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".py") as tmp_file:
        _ = tmp_file.write(file_content)
        tmp_path = tmp_file.name

    module_name = "uploaded_module"
    spec = importlib.util.spec_from_file_location(module_name, tmp_path)
    if not spec:
        raise HTTPException(status_code=500, detail="something went wrong with spec")
    module = importlib.util.module_from_spec(spec=spec)
    if not module:
        raise HTTPException(status_code=500, detail="something went wrong with module")
    if not spec.loader:
        raise HTTPException(
            status_code=500, detail="something went wrong with spec.loader"
        )
    spec.loader.exec_module(module)

    vmAllocationPolicy: type[VMAllocation] = DefaultVMAllocation
    if data.vmAllocationPolicy != "default":
        vmAllocationPolicy = cast(
            type[VMAllocation], getattr(module, data.vmAllocationPolicy)
        )
    taskSchedulerPolicy: type[TaskScheduler] = FCFSTaskScheduler
    if data.taskSchedulerPolicy != "default (FCFS)":
        taskSchedulerPolicy = cast(
            type[TaskScheduler], getattr(module, data.taskSchedulerPolicy)
        )
    datacenter = Datacenter(
        data.datacenter.os,
        data.datacenter.arch,
        data.datacenter.cost,
        data.datacenter.costRAM,
        data.datacenter.costBandwidth,
        data.datacenter.costStorage,
        data.datacenter.id,
    )
    host_list: list[Host] = []
    vm_list: list[VM] = []
    task_list: list[Task] = []
    for h in data.hosts:
        host = Host(h.ram, h.bandwidth, h.storage, h.cpu, h.mips, h.id)
        host_list.append(host)
    for v in data.vms:
        vm = VM(v.ram, v.bandwidth, v.storage, v.cpu, v.mips, v.id)
        vm_list.append(vm)
    for t in data.tasks:
        task = Task(t.length, t.input_size, t.output_size, t.cpu, t.id)
        task_list.append(task)

    sim = Simulation(
        datacenter,
        host_list,
        vm_list,
        task_list,
        taskSchedulerPolicy,
        False,
        vmAllocationPolicy,
    )
    sim.run()

    vm_utilization = sim.get_vm_utilization()
    task_history = task_history_to_json()

    os.remove(tmp_path)

    return {"vmUtilization": vm_utilization, "taskHistory": task_history}


@app.post("/api/save_results")
async def save_results():
    result_location = save_all_results()
    return {"location": f"All results saved in '{result_location}'"}

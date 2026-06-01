import math
from typing import Any, override
from simpy.events import AllOf
from collections.abc import Generator
from entities import Task, TaskScheduler, VM
from simpy import Environment

import random


class FCFSTaskScheduler(TaskScheduler):
    @override
    def schedule_all(self, tasks: list[Task]) -> Generator[AllOf, Any, None]:
        events = [self.env.process(self.schedule_task(t)) for t in tasks]
        yield self.env.all_of(events)


class SJFTaskScheduler(TaskScheduler):
    @override
    def schedule_all(self, tasks: list[Task]) -> Generator[AllOf, Any, None]:
        ordered = sorted(
            tasks, key=lambda t: (t.length, t.input_size + t.output_size, t.pes_number)
        )
        events = [self.env.process(self.schedule_task(t)) for t in ordered]
        yield self.env.all_of(events)


# class MinMaxTaskScheduler(TaskScheduler):
#     def _task_worst_time(self, task: Task) -> float:
#         durations: list[float] = []
#         for vm in self.vm_list:
#             if self.vm_can_run_task(vm, task):
#                 duration = float(
#                     self.transfer_time(task.input_size, vm)
#                     + self.compute_time(vm, task)
#                     + self.transfer_time(task.output_size, vm)
#                 )
#                 durations.append(duration)
#
#         if not durations:
#             return math.inf
#         return max(durations)
#
#     @override
#     def schedule_all(self, tasks: list[Task]) -> Generator[AllOf, Any, None]:
#         pending = list(tasks)
#         ordered: list[Task] = []
#
#         while pending:
#             candidate = min(pending, key=self._task_worst_time)
#             ordered.append(candidate)
#             pending.remove(candidate)
#
#         events = [self.env.process(self.schedule_task(t)) for t in ordered]
#         yield self.env.all_of(events)


class MinMinTaskScheduler(TaskScheduler):
    def _task_best_time(self, task: Task) -> float:
        durations: list[float] = []
        for vm in self.vm_list:
            if self.vm_can_run_task(vm, task):
                duration = float(
                    self.transfer_time(task.input_size, vm)
                    + self.compute_time(vm, task)
                    + self.transfer_time(task.output_size, vm)
                )
                durations.append(duration)

        if not durations:
            return math.inf
        return min(durations)

    @override
    def schedule_all(self, tasks: list[Task]) -> Generator[AllOf, Any, None]:
        pending = list(tasks)
        ordered: list[Task] = []

        while pending:
            candidate = min(pending, key=self._task_best_time)
            ordered.append(candidate)
            pending.remove(candidate)

        events = [self.env.process(self.schedule_task(task)) for task in ordered]
        yield self.env.all_of(events)


class MaxMinTaskScheduler(TaskScheduler):
    def _task_best_time(self, task: Task) -> float:
        durations: list[float] = []
        for vm in self.vm_list:
            if self.vm_can_run_task(vm, task):
                duration = float(
                    self.transfer_time(task.input_size, vm)
                    + self.compute_time(vm, task)
                    + self.transfer_time(task.output_size, vm)
                )
                durations.append(duration)

        if not durations:
            return math.inf
        return min(durations)

    @override
    def schedule_all(self, tasks: list[Task]) -> Generator[AllOf, Any, None]:
        pending = list(tasks)
        ordered: list[Task] = []

        while pending:
            candidate = max(pending, key=self._task_best_time)
            ordered.append(candidate)
            pending.remove(candidate)

        events = [self.env.process(self.schedule_task(t)) for t in ordered]
        yield self.env.all_of(events)


class GreyWolfTaskScheduler(TaskScheduler):
    def __init__(
        self,
        env: Environment,
        vm_list: list[VM],
        iterations: int = 40,
        wolves: int = 16,
        seed: int | None = 42,
    ) -> None:
        super().__init__(env, vm_list)
        self.iterations: int = iterations
        self.wolves: int = wolves
        self.rand = random.Random(seed)

    def _estimated_duration(self, task: Task, vm: VM) -> float:
        return float(
            self.transfer_time(task.input_size, vm)
            + self.compute_time(vm, task)
            + self.transfer_time(task.output_size, vm)
        )

    def _decode_vm_index(self, value: float, task: Task) -> int | None:
        vm_count = len(self.vm_list)
        if vm_count == 0:
            return None

        idx = round(value)
        idx = max(0, min(vm_count - 1, idx))
        candidate = self.vm_list[idx]
        if self.vm_can_run_task(candidate, task):
            return idx

        compatible = [
            i for i, vm in enumerate(self.vm_list) if self.vm_can_run_task(vm, task)
        ]
        if not compatible:
            return None

        return min(compatible, key=lambda i: abs(i - value))

    def _decode_solution(self, tasks: list[Task], position: list[float]) -> list[Task]:
        mapping: dict[str, list[tuple[float, Task]]] = {
            vm.id: [] for vm in self.vm_list
        }
        unscheduled: list[Task] = []

        for i, task in enumerate(tasks):
            decoded = self._decode_vm_index(position[i], task)
            if decoded is None:
                unscheduled.append(task)
                continue

            vm = self.vm_list[decoded]
            local_priority = abs(position[i] - decoded)
            mapping[vm.id].append((local_priority, task))

        for vm_id in mapping:
            mapping[vm_id].sort(key=lambda x: x[0])

        ordered: list[Task] = []
        while True:
            added = False
            for vm in self.vm_list:
                queue = mapping[vm.id]
                if queue:
                    ordered.append(queue.pop(0)[1])
                    added = True
            if not added:
                break

        ordered.extend(unscheduled)
        return ordered

    def _predict_makespan(self, tasks: list[Task], position: list[float]) -> float:
        vm_ready_time: dict[str, float] = {vm.id: 0.0 for vm in self.vm_list}
        order = self._decode_solution(tasks, position)

        for task in order:
            compatible_vms = [
                vm for vm in self.vm_list if self.vm_can_run_task(vm, task)
            ]
            if not compatible_vms:
                return math.inf

            best_vm: VM | None = None
            best_finish = math.inf
            for vm in compatible_vms:
                finish = vm_ready_time[vm.id] + self._estimated_duration(task, vm)
                if finish < best_finish:
                    best_finish = finish
                    best_vm = vm

            if best_vm is None:
                return math.inf

            vm_ready_time[best_vm.id] = best_finish

        return max(vm_ready_time.values(), default=0.0)

    @override
    def schedule_all(self, tasks: list[Task]) -> Generator[AllOf, Any, None]:
        ordered = list(tasks)
        task_count = len(tasks)
        vm_count = len(self.vm_list)

        if task_count > 1 and vm_count > 0:
            wolves_n = max(4, min(self.wolves, task_count * 4))
            lower = 0.0
            upper = float(vm_count - 1)

            population = [
                [self.rand.uniform(lower, upper) for _ in range(task_count)]
                for _ in range(wolves_n)
            ]
            scores = [self._predict_makespan(ordered, wolf) for wolf in population]

            alpha_idx = min(range(wolves_n), key=lambda i: scores[i])
            alpha = population[alpha_idx][:]
            alpha_score = scores[alpha_idx]

            sorted_idx = sorted(range(wolves_n), key=lambda i: scores[i])
            beta = population[sorted_idx[1]][:] if wolves_n > 1 else alpha[:]
            delta = population[sorted_idx[2]][:] if wolves_n > 2 else beta[:]

            for t in range(self.iterations):
                a = 2.0 * (1.0 - (t / max(1, self.iterations)))

                for i in range(wolves_n):
                    current = population[i]
                    new_position: list[float] = []

                    for d in range(task_count):
                        r1 = self.rand.random()
                        r2 = self.rand.random()
                        a1 = 2.0 * a * r1 - a
                        c1 = 2.0 * r2
                        d_alpha = abs(c1 * alpha[d] - current[d])
                        x1 = alpha[d] - a1 * d_alpha

                        r1 = self.rand.random()
                        r2 = self.rand.random()
                        a2 = 2.0 * a * r1 - a
                        c2 = 2.0 * r2
                        d_beta = abs(c2 * beta[d] - current[d])
                        x2 = beta[d] - a2 * d_beta

                        r1 = self.rand.random()
                        r2 = self.rand.random()
                        a3 = 2.0 * a * r1 - a
                        c3 = 2.0 * r2
                        d_delta = abs(c3 * delta[d] - current[d])
                        x3 = delta[d] - a3 * d_delta

                        new_value = (x1 + x2 + x3) / 3.0
                        new_value = max(lower, min(upper, new_value))
                        new_position.append(new_value)

                    population[i] = new_position
                    scores[i] = self._predict_makespan(ordered, new_position)

                sorted_idx = sorted(range(wolves_n), key=lambda i: scores[i])
                alpha = population[sorted_idx[0]][:]
                beta = population[sorted_idx[1]][:] if wolves_n > 1 else alpha[:]
                delta = population[sorted_idx[2]][:] if wolves_n > 2 else beta[:]
                alpha_score = scores[sorted_idx[0]]

            if not math.isinf(alpha_score):
                ordered = self._decode_solution(ordered, alpha)

        events = [self.env.process(self.schedule_task(task)) for task in ordered]
        yield self.env.all_of(events)


# AI-generated.
# Only `entities.py` and a few implementation examples were fed in.
# Attention: this code has not been modified in any way since generation and its correct operation is not guaranteed.
class RoundRobinTaskScheduler(TaskScheduler):
    def __init__(self, env, vm_list: list[VM]) -> None:
        super().__init__(env, vm_list)
        self.next_vm_index = 0

    def _select_vm(self, task: Task) -> VM | None:
        if not self.vm_list:
            return None

        for offset in range(len(self.vm_list)):
            idx = (self.next_vm_index + offset) % len(self.vm_list)
            vm = self.vm_list[idx]
            if self.vm_can_run_task(vm, task):
                self.next_vm_index = (idx + 1) % len(self.vm_list)
                return vm

        return None

    def _schedule_task_on_vm(self, task: Task, vm: VM) -> Generator[Any, Any, None]:
        self.task_arrival_time.setdefault(task.id, self.env.now)

        while vm not in self.free_vm_list:
            yield self.env.timeout(1)

        self.free_vm_list.remove(vm)
        task.set_vm(vm)
        self.task_start_time[task.id] = self.env.now
        self.running_vm_list.append(vm)

        vm_usage = self.used_vm_resources(vm, task)
        current_usage = self.vm_utilization[vm.id]
        self.vm_utilization[vm.id] = (
            max(current_usage[0], vm_usage[0]),
            max(current_usage[1], vm_usage[1]),
            max(current_usage[2], vm_usage[2]),
        )

        yield self.env.process(self.run_task(task))

    @override
    def schedule_all(self, tasks: list[Task]) -> Generator[AllOf, Any, None]:
        self.total_tasks = len(tasks)
        events = []

        for task in tasks:
            vm = self._select_vm(task)
            if vm is None:
                self.task_arrival_time.setdefault(task.id, self.env.now)
                self.rejected_tasks[task.id] = "No VM can satisfy task requirements"
            else:
                events.append(self.env.process(self._schedule_task_on_vm(task, vm)))

        if events:
            yield self.env.all_of(events)
        else:
            yield self.env.timeout(0)

import math
from typing import Any, override
from simpy.events import AllOf
from collections.abc import Generator
from entities import Task, TaskScheduler


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


class MinMaxTaskScheduler(TaskScheduler):
    def _task_worst_time(self, task: Task) -> float:
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
        return max(durations)

    @override
    def schedule_all(self, tasks: list[Task]) -> Generator[AllOf, Any, None]:
        pending = list(tasks)
        ordered: list[Task] = []

        while pending:
            candidate = min(pending, key=self._task_worst_time)
            ordered.append(candidate)
            pending.remove(candidate)

        events = [self.env.process(self.schedule_task(t)) for t in ordered]
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

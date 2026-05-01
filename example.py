from entities import VM, Datacenter, Host, Simulation, Task, save_all_results
from schedulers import MaxMinTaskScheduler, MinMaxTaskScheduler, SJFTaskScheduler

datacenter = Datacenter("linux", "x86", 250.0, 0.08, 0.003, 0.0001)
host_list = [
    Host(16_384, 25_000, 2_000_000, 16, 2_500),
    Host(12_288, 20_000, 1_500_000, 12, 2_200),
    Host(8_192, 15_000, 1_000_000, 8, 2_000),
]
vm_list = [
    VM(2_048, 4_000, 100_000, 2, 500),
    VM(2_048, 4_000, 100_000, 2, 500),
    VM(4_096, 6_000, 200_000, 4, 750),
    VM(4_096, 6_000, 200_000, 4, 750),
    VM(8_192, 8_000, 400_000, 6, 900),
    VM(1_024, 2_000, 50_000, 1, 300),
    VM(1_024, 2_000, 50_000, 1, 300),
]
task_list = [
    Task(length=1_200, input_size=80, output_size=40, pes_number=1),
    Task(length=1_800, input_size=120, output_size=60, pes_number=2),
    Task(length=2_500, input_size=160, output_size=90, pes_number=2),
    Task(length=4_200, input_size=220, output_size=120, pes_number=3),
    Task(length=900, input_size=40, output_size=20, pes_number=1),
    Task(length=3_600, input_size=200, output_size=100, pes_number=3),
    Task(length=5_000, input_size=260, output_size=140, pes_number=4),
    Task(length=700, input_size=35, output_size=15, pes_number=1),
    Task(length=2_100, input_size=130, output_size=70, pes_number=2),
    Task(length=2_900, input_size=170, output_size=95, pes_number=2),
    Task(length=4_800, input_size=240, output_size=130, pes_number=4),
    Task(length=1_500, input_size=90, output_size=50, pes_number=1),
    Task(length=3_200, input_size=180, output_size=100, pes_number=3),
    Task(length=5_400, input_size=280, output_size=160, pes_number=4),
    Task(length=1_000, input_size=60, output_size=30, pes_number=1),
    Task(length=2_300, input_size=140, output_size=80, pes_number=2),
    Task(length=3_900, input_size=210, output_size=120, pes_number=3),
    Task(length=4_500, input_size=230, output_size=125, pes_number=4),
    Task(length=800, input_size=45, output_size=20, pes_number=1),
    Task(length=6_000, input_size=320, output_size=180, pes_number=5),
    Task(length=2_700, input_size=155, output_size=85, pes_number=2),
    Task(length=3_300, input_size=190, output_size=105, pes_number=3),
    Task(length=1_100, input_size=70, output_size=35, pes_number=1),
    Task(length=4_100, input_size=215, output_size=115, pes_number=3),
    Task(length=5_600, input_size=300, output_size=170, pes_number=5),
    Task(length=1_650, input_size=95, output_size=55, pes_number=1),
    Task(length=2_050, input_size=125, output_size=68, pes_number=2),
    Task(length=3_750, input_size=205, output_size=110, pes_number=3),
]
# vm_list = [
#     VM(1_024, 2_000, 10_000, 1, 250),
#     VM(1_024, 2_000, 10_000, 2, 500),
# ]
# host_list = [Host(2048, 10_000, 1_000_000, 4, 1_000)]
# datacenter = Datacenter("linux", "x86", 100.0, 0.10, 0.002, 0.0)
# task_list = [
#     Task(length=100, input_size=50, output_size=50, pes_number=1),
#     Task(length=150, input_size=100, output_size=100, pes_number=2),
#     Task(length=100, input_size=30, output_size=30, pes_number=1),
#     Task(length=100, input_size=30, output_size=30, pes_number=1),
# ]
simulation = Simulation(datacenter, host_list, vm_list, task_list, SJFTaskScheduler)
simulation.run()
_ = save_all_results()

## 21.03 - 04.04

**Разработка пользовательского интерфейса**

- для сущностей [`datacenter`](./ui/components/blocks/datacenter.tsx),
  [`host`](./ui/components/blocks/host.tsx),
  [`virtual machine`](./ui/components/blocks/vm.tsx) и
  [`task`](./ui/components/blocks/task.tsx) реализована следующая
  функциональность:
  - отображение в виде таблицы всех экземпляров сущности
  - добавление экземпляра
  - редактирование экземпляра
  - удаление экземпляра
  - возможность импорта таблицы
  - возможность экспорта таблицы
- загрузка python файла с политиками планирования и распределения
  ([file](./ui/components/blocks/run-script.tsx))
- выбор политик планирования и распределения
  ([file](./ui/components/blocks/run-script.tsx))
- запуск симуляции ([file](./ui/components/blocks/run-script.tsx))
- отображение ошибок в виде уведомлений

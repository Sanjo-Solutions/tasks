import { withAuthenticator } from "@aws-amplify/ui-react"
import { Amplify, DataStore } from "aws-amplify"
import { Task } from "../models"
import React, { createContext, useCallback, useContext, useState } from "react"
import awsExports from "../aws-exports"
import { DndProvider, DropTargetMonitor, useDrag, useDrop } from "react-dnd"
import { OpType } from "@aws-amplify/datastore"
import { last, pick, sortedIndexBy } from "lodash-es"
import { TouchBackend } from "react-dnd-touch-backend"
import { clsx } from "clsx"

function safeSubtraction(a: number, b: number): number {
  if (a >= MIN_INT + b) {
    return a - b
  } else {
    return MIN_INT
  }
}

function safeAddition(a: number, b: number): number {
  if (a <= MAX_INT - b) {
    return a + b
  } else {
    return MAX_INT
  }
}

const ItemTypes = {
  TASK: "task",
}

Amplify.configure(awsExports)

const TasksContext = createContext<{
  tasks: Map<string, Task>
  subtasks: Map<string | null, Task[]>
  generateOrderForNewTask: (parentTaskID: string | null) => number
}>({
  tasks: new Map<string, Task>(),
  subtasks: new Map<string | null, Task[]>(),
  generateOrderForNewTask() {
    return 0
  },
})

const EditModeContext = createContext<boolean>(true)

const GAP = 2148
const MIN_INT = -(2 ** 31)
const MAX_INT = 2 ** 31 - 1

class App2 extends React.Component<
  { signOut: any },
  { tasks: Map<string, Task>; subtasks: Map<string | null, Task[]> }
> {
  maxOrder: number | null = null
  subscription: any = null

  constructor(props) {
    super(props)
    this.state = {
      tasks: new Map<string, Task>(), // task id to task
      subtasks: new Map<string | null, Task[]>(), // task id to subtasks
    }

    this.generateOrderForNewTask = this.generateOrderForNewTask.bind(this)
  }

  generateOrderForNewTask(parentTaskID: string | null): number {
    const tasks = this.state.subtasks.get(parentTaskID ?? null)
    if (tasks && tasks.length >= 1) {
      const biggestOrder = last(tasks)!.order
      if (typeof biggestOrder === "number") {
        return safeAddition(biggestOrder, GAP)
      } else {
        return 0
      }
    } else {
      return 0
    }
  }

  async componentDidMount() {
    const addSubtask = (task) => {
      const parentTaskID = task.parentTaskID ?? null
      let subtasks = this.state.subtasks.get(parentTaskID)
      if (!subtasks) {
        subtasks = [task]
        this.state.subtasks.set(parentTaskID, subtasks)
      } else {
        const insertIndex = sortedIndexBy(subtasks, task, (task) => task.order)
        subtasks.splice(insertIndex, 0, task)
      }
    }

    const removeSubtask = (task) => {
      const subtasks = this.state.subtasks.get(task.parentTaskID ?? null)
      if (subtasks) {
        const index = subtasks.findIndex((task2) => task2.id === task.id)
        if (index !== -1) {
          subtasks.splice(index, 1)
        }
      }
    }

    const updateMaxOrder = (order) => {
      if (typeof order === "number") {
        this.maxOrder =
          this.maxOrder === null ? order : Math.max(this.maxOrder, order)
      }
    }

    this.subscription = DataStore.observe(Task).subscribe((message) => {
      const task = message.element
      switch (message.opType) {
        case OpType.INSERT:
          this.state.tasks.set(task.id, task)
          addSubtask(task)
          updateMaxOrder(task.order)
          break
        case OpType.UPDATE:
          const oldTask = this.state.tasks.get(task.id)
          if (oldTask) {
            removeSubtask(oldTask)
          }
          this.state.tasks.set(task.id, task)
          addSubtask(task)
          updateMaxOrder(task.order)
          break
        case OpType.DELETE:
          this.state.tasks.delete(task.id)
          removeSubtask(task)
          break
      }
      this.forceUpdate()
    })

    const tasks = await DataStore.query(Task)

    for (const task of tasks) {
      this.state.tasks.set(task.id, task)
    }

    for (const task of tasks) {
      addSubtask(task)
    }

    for (const task of tasks) {
      updateMaxOrder(task.order)
    }

    this.forceUpdate()
  }

  componentWillUnmount(): void {
    this.subscription.unsubscribe()
  }

  render() {
    return (
      <TasksContext.Provider
        value={{
          ...this.state,
          generateOrderForNewTask: this.generateOrderForNewTask,
        }}
      >
        <App {...this.props} />
      </TasksContext.Provider>
    )
  }
}

function App({ signOut }) {
  const [isEditModeEnabled, setIsEditModeEnabled] = useState(
    localStorage.getItem("isEditModeEnabled") !== "false",
  )
  const { subtasks, generateOrderForNewTask } = useContext(TasksContext)

  const handleAddTask = async (event) => {
    event.preventDefault()
    const description = event.target.elements.description.value
    if (description.trim()) {
      const task = await DataStore.save(
        new Task({ description, order: generateOrderForNewTask(null) }),
      )
      event.target.reset()
    }
  }

  const onChangeEditMode = useCallback((event) => {
    setIsEditModeEnabled(event.target.checked)
    localStorage.setItem("isEditModeEnabled", event.target.checked)
  }, [])

  const convertTasksToJSON = useCallback(
    function convertTasksToJSON(tasks: Task[]): any[] {
      const convertedTasks: any[] = []
      for (const task of tasks) {
        convertedTasks.push({
          ...pick(task, "id", "description", "completed", "order"),
          subtasks: convertTasksToJSON(subtasks.get(task.id) ?? []),
        })
      }
      return convertedTasks
    },
    [subtasks],
  )

  const onExport = useCallback(
    function onExport() {
      const tasks = subtasks.get(null) ?? []
      const exportData = convertTasksToJSON(tasks)

      const a = document.createElement("a")
      a.setAttribute(
        "href",
        `data:application/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(exportData, null, 2) + "\n",
        )}`,
      )
      a.setAttribute("download", "tasks.json")
      a.style.display = "none"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    },
    [subtasks, convertTasksToJSON],
  )

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <EditModeContext.Provider value={isEditModeEnabled}>
        <div className="container ps-0 pe-3">
          <div className="mt-3 text-end">
            <input
              type="checkbox"
              className="btn-check"
              id="editMode"
              autoComplete="off"
              onChange={onChangeEditMode}
              checked={isEditModeEnabled}
            />
            <label className="btn" htmlFor="editMode">
              Edit mode
            </label>

            <button
              type="button"
              className="btn btn-outline-secondary ms-2"
              onClick={onExport}
            >
              Export
            </button>

            <button
              type="button"
              className="btn btn-secondary ms-2"
              onClick={signOut}
            >
              Log out
            </button>
          </div>

          {isEditModeEnabled && (
            <form
              onSubmit={handleAddTask}
              className="ms-3"
              style={{
                marginTop: "0.4375rem",
                paddingTop: "0.5625rem",
                paddingBottom: "0.5625rem",
              }}
            >
              <div className="input-group">
                <input
                  type="text"
                  name="description"
                  placeholder="Description of a task"
                  className="form-control"
                  autoFocus
                />
                <button type="submit" className="btn btn-primary">
                  Add
                </button>
              </div>
            </form>
          )}
          <TaskList tasks={subtasks.get(null) ?? []} />
        </div>
      </EditModeContext.Provider>
    </DndProvider>
  )
}

function TaskList({ tasks }) {
  const { tasks: idToTask, subtasks } = useContext(TasksContext)

  const hasSubtasks = useCallback(
    function (task) {
      const taskSubtasks = subtasks.get(task.id)
      return Boolean(taskSubtasks && taskSubtasks.length >= 1)
    },
    [subtasks],
  )

  const insertAt = useCallback(
    async function (parentTask, task, index) {
      const parentSubtasks = subtasks.get(parentTask ? parentTask.id : null)
      if (parentSubtasks && parentSubtasks.length >= 1) {
        const updatedSubtasks = Array.from(parentSubtasks)
        const indexBefore = updatedSubtasks.findIndex(
          (task2) => task2.id === task.id,
        )
        updatedSubtasks.splice(index, 0, task)
        if (indexBefore !== -1) {
          if (indexBefore < index) {
            updatedSubtasks.splice(indexBefore, 1)
          } else {
            updatedSubtasks.splice(indexBefore + 1, 1)
          }
        }
        const updatedOrders = new Array(updatedSubtasks.length)
        const firstSubtask = updatedSubtasks[0]
        if (typeof firstSubtask.order !== "number") {
          if (
            updatedSubtasks.length >= 2 &&
            typeof updatedSubtasks[1]?.order === "number"
          ) {
            updatedOrders[0] = safeSubtraction(updatedSubtasks[1].order, GAP)
          } else {
            const orders = updatedSubtasks
              .map((task) => task.order)
              .filter((order) => typeof order === "number") as number[]
            const smallestOrder =
              orders.length >= 1
                ? orders.reduce((previous, value) => Math.min(previous, value))
                : null
            updatedOrders[0] = smallestOrder
              ? safeSubtraction(smallestOrder, GAP)
              : 0
          }
        } else {
          updatedOrders[0] = firstSubtask.order
        }
        for (let index2 = 1; index2 < parentSubtasks.length; index2++) {
          const order = updatedSubtasks[index2].order
          const orderBefore = updatedOrders[index2 - 1]
          if (typeof order !== "number" || order <= orderBefore) {
            const orderAfter = updatedSubtasks[index2 + 1]?.order
            const oneHigherOrMax = safeAddition(orderBefore, 1)
            const updatedOrder =
              typeof orderAfter === "number"
                ? Math.max(
                    Math.round((orderBefore + orderAfter) / 2),
                    oneHigherOrMax,
                  )
                : oneHigherOrMax
            updatedOrders[index2] = updatedOrder
          } else {
            updatedOrders[index2] = order
          }
        }

        const promises: Promise<any>[] = []

        for (let index2 = updatedSubtasks.length - 1; index2 >= 0; index2--) {
          if (updatedSubtasks[index2].order !== updatedOrders[index2]) {
            promises.push(
              DataStore.save(
                Task.copyOf(updatedSubtasks[index2], (updated) => {
                  if (updatedSubtasks[index2].id === task.id) {
                    updated.parentTaskID = parentTask ? parentTask.id : null
                  }
                  updated.order = updatedOrders[index2]
                }),
              ),
            )
          }
        }

        await Promise.all(promises)
      } else {
        await DataStore.save(
          Task.copyOf(task, (updated) => {
            updated.parentTaskID = parentTask.id
            updated.order = 0
          }),
        )
      }
    },
    [subtasks],
  )

  const insertAfter = useCallback(
    async function (parentTask, task, taskBefore) {
      const parentSubtasks = subtasks.get(parentTask ? parentTask.id : null)!
      const index = parentSubtasks.indexOf(taskBefore) + 1
      await insertAt(parentTask, task, index)
    },
    [insertAt, subtasks],
  )

  const onDrop = useCallback(
    async function onDrop(task: Task, task2) {
      if (hasSubtasks(task)) {
        await insertAt(task, task2, 0)
      } else {
        await insertAfter(
          task.parentTaskID ? idToTask.get(task.parentTaskID) : null,
          task2,
          task,
        )
      }
    },
    [hasSubtasks, insertAfter, insertAt, idToTask],
  )

  return (
    <div>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onDrop={onDrop} />
      ))}
    </div>
  )
}

function TaskItem({ task, onDrop }) {
  const { subtasks, generateOrderForNewTask } = useContext(TasksContext)

  const onToggleCompleted = useCallback(
    async (event) => {
      await DataStore.save(
        Task.copyOf(task, (updated) => {
          updated.completed = event.target.checked
        }),
      )
    },
    [task],
  )

  const onCheckBoxAreaClicked = useCallback(
    async (event) => {
      await DataStore.save(
        Task.copyOf(task, (updated) => {
          updated.completed = !task.completed
        }),
      )
    },
    [task],
  )

  const onCheckBoxClicked = useCallback((event) => {
    event.stopPropagation()
  }, [])

  const onDelete = useCallback(async () => {
    await DataStore.delete(task)
  }, [task])

  const onAddSubtask = useCallback(
    async (event) => {
      event.preventDefault()
      const formData = new FormData(event.target)
      await DataStore.save(
        new Task({
          description: formData.get("description") as string,
          parentTask: task,
          order: generateOrderForNewTask(task.id),
        }),
      )
      event.target.querySelector('input[name="description"]').value = ""
    },
    [task, generateOrderForNewTask],
  )

  const isEditModeEnabled = useContext(EditModeContext)

  const [{ difference, isDragging }, dragRef] = useDrag(
    () => ({
      type: ItemTypes.TASK,
      item: task,
      collect: (monitor) => {
        return {
          difference: monitor.getDifferenceFromInitialOffset(),
          isDragging: monitor.isDragging(),
        }
      },
    }),
    [task],
  )

  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: ItemTypes.TASK,
      canDrop(task2: Task) {
        return task2.id !== task.id
      },
      drop: onDrop.bind(null, task),
      collect: (monitor: DropTargetMonitor) => {
        return {
          isOver: monitor.isOver(),
        }
      },
    }),
    [task],
  )

  const refCallback = useCallback(
    (node) => {
      dragRef(node)
      dropRef(node)
    },
    [dragRef, dropRef],
  )

  return (
    <div className="task">
      <div
        className={clsx("row", "w-100", "bg-white", isOver && "insert-below")}
        ref={refCallback}
        style={
          isDragging
            ? {
                position: "relative",
                zIndex: 9999,
                transform: `translate(${difference!.x}px, ${difference!.y}px)`,
                pointerEvents: "none",
              }
            : {}
        }
      >
        <div className="col-auto d-flex align-items-center">
          <div className="p-3 flex-grow-1" onClick={onCheckBoxAreaClicked}>
            <input
              type="checkbox"
              checked={Boolean(task.completed)}
              onChange={onToggleCompleted}
              onClick={onCheckBoxClicked}
              className="d-block mt-0"
              style={{ width: "1.5rem", height: "1.5rem" }}
            />
          </div>
          <label className="form-check-label">{task.description}</label>
        </div>
        {isEditModeEnabled && (
          <div className="col-auto ms-auto">
            <div
              onClick={onDelete}
              style={{
                paddingTop: "0.375rem",
                paddingBottom: "0.375rem",
                paddingLeft: "0.75rem",
                paddingRight: "0.75rem",
                cursor: "pointer",
                fontSize: "1.5rem",
              }}
            >
              <i className="bi bi-trash3"></i>
            </div>
          </div>
        )}
      </div>

      <div style={{ paddingLeft: "2.5rem" }}>
        <TaskList tasks={subtasks.get(task.id) ?? []} />

        {isEditModeEnabled && (
          <form
            onSubmit={onAddSubtask}
            style={{ paddingTop: "0.5625rem", paddingBottom: "0.5625rem" }}
            className="ms-3"
          >
            <div className="input-group">
              <input
                name="description"
                type="text"
                placeholder="Description of a subtask"
                className="form-control"
              />
              <button type="submit" className="btn btn-primary">
                Add
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default withAuthenticator(App2)

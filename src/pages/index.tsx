import { withAuthenticator } from '@aws-amplify/ui-react'
import { DataStore, Amplify, SortDirection } from 'aws-amplify'
import { LazyTask, Task } from '../models'
import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react'
import awsExports from '../aws-exports'
import React from 'react'
import { DropTargetMonitor, useDrag, useDrop } from 'react-dnd'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { classNames } from '../classNames'
import { OpType } from '@aws-amplify/datastore'
import { sortedIndexBy } from 'lodash-es'

const ItemTypes = {
  TASK: 'task',
}

Amplify.configure(awsExports)

const TasksContext = createContext<{
  tasks: Map<string, Task>
  subtasks: Map<string | null, Task[]>
}>({
  tasks: new Map<string, Task>(),
  subtasks: new Map<string | null, Task[]>(),
})

const EditModeContext = createContext<boolean>(true)

class App2 extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      tasks: new Map<string, Task>(), // task id to task
      subtasks: new Map<string | null, Task[]>(), // task id to subtasks
    }
  }

  async componentDidMount() {
    const addSubtask = task => {
      const parentTaskID = task.parentTaskID ?? null
      let subtasks = this.state.subtasks.get(parentTaskID)
      if (!subtasks) {
        subtasks = [task]
        this.state.subtasks.set(parentTaskID, subtasks)
      } else {
        const insertIndex = sortedIndexBy(subtasks, task, task => task.order)
        subtasks.splice(insertIndex, 0, task)
      }
    }

    const removeSubtask = task => {
      const subtasks = this.state.subtasks.get(task.parentTaskID ?? null)
      if (subtasks) {
        const index = subtasks.findIndex(task2 => task2.id === task.id)
        if (index !== -1) {
          subtasks.splice(index, 1)
        }
      }
    }

    this.subscription = DataStore.observe(Task).subscribe(message => {
      const task = message.element
      switch (message.opType) {
        case OpType.INSERT:
          this.state.tasks.set(task.id, task)
          addSubtask(task)
          break
        case OpType.UPDATE:
          const oldTask = this.state.tasks.get(task.id)
          if (oldTask) {
            removeSubtask(oldTask)
          }
          this.state.tasks.set(task.id, task)
          addSubtask(task)
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

    this.forceUpdate()
  }

  componentWillUnmount(): void {
    this.subscription.unsubscribe()
  }

  render() {
    return (
      <TasksContext.Provider value={this.state}>
        <App {...this.props} />
      </TasksContext.Provider>
    )
  }
}

function App({ signOut }) {
  const [isEditModeEnabled, setIsEditModeEnabled] = useState(
    localStorage.getItem('isEditModeEnabled') !== 'false'
  )
  const { subtasks } = useContext(TasksContext)

  const handleAddTask = async event => {
    event.preventDefault()
    const description = event.target.elements.description.value
    if (description.trim()) {
      const task = await DataStore.save(new Task({ description }))
      event.target.reset()
    }
  }

  const onChangeEditMode = useCallback(event => {
    setIsEditModeEnabled(event.target.checked)
    localStorage.setItem('isEditModeEnabled', event.target.checked)
  }, [])

  return (
    <DndProvider backend={HTML5Backend}>
      <EditModeContext.Provider value={isEditModeEnabled}>
        <div className='container ps-0 pe-3'>
          <div className='mt-3 text-end'>
            <input
              type='checkbox'
              className='btn-check'
              id='editMode'
              autoComplete='off'
              onChange={onChangeEditMode}
              checked={isEditModeEnabled}
            />
            <label className='btn' htmlFor='editMode'>
              Edit mode
            </label>

            <button className='btn btn-secondary ms-2' onClick={signOut}>
              Log out
            </button>
          </div>

          {isEditModeEnabled && (
            <form
              onSubmit={handleAddTask}
              className='ms-3'
              style={{
                marginTop: '0.4375rem',
                paddingTop: '0.5625rem',
                paddingBottom: '0.5625rem',
              }}
            >
              <div className='input-group'>
                <input
                  type='text'
                  name='description'
                  placeholder='Description of a task'
                  className='form-control'
                  autoFocus
                />
                <button type='submit' className='btn btn-primary'>
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
  const onDrop = useCallback(async function onDrop(task, task2) {
    if (typeof task.order === 'number') {
      const taskOrder = task.order
      DataStore.save(
        Task.copyOf(task2, updated => {
          updated.parentTaskID = task.parentTaskID
          updated.order = taskOrder + 1
        })
      )
    } else {
      await Promise.all([
        DataStore.save(
          Task.copyOf(task, updated => {
            updated.order = 0
          })
        ),
        DataStore.save(
          Task.copyOf(task2, updated => {
            updated.parentTaskID = task.parentTaskID
            updated.order = 1
          })
        ),
      ])
    }
  }, [])

  return (
    <div>
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} onDrop={onDrop} />
      ))}
    </div>
  )
}

function TaskItem({ task, onDrop }) {
  const { subtasks } = useContext(TasksContext)

  const onToggleCompleted = useCallback(
    async event => {
      await DataStore.save(
        Task.copyOf(task, updated => {
          updated.completed = event.target.checked
        })
      )
    },
    [task]
  )

  const onCheckBoxAreaClicked = useCallback(
    async event => {
      await DataStore.save(
        Task.copyOf(task, updated => {
          updated.completed = !task.completed
        })
      )
    },
    [task]
  )

  const onCheckBoxClicked = useCallback(event => {
    event.stopPropagation()
  }, [])

  const onDelete = useCallback(async () => {
    await DataStore.delete(task)
  }, [task])

  const onAddSubtask = useCallback(
    async event => {
      event.preventDefault()
      const formData = new FormData(event.target)
      await DataStore.save(
        new Task({
          description: formData.get('description') as string,
          parentTask: task,
        })
      )
      event.target.querySelector('input[name="description"]').value = ''
    },
    [task]
  )

  const isEditModeEnabled = useContext(EditModeContext)

  const [{ opacity }, dragRef] = useDrag(
    () => ({
      type: ItemTypes.TASK,
      item: task,
      collect: monitor => ({
        opacity: monitor.isDragging() ? 0.5 : 1,
      }),
    }),
    [task]
  )

  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: ItemTypes.TASK,
      drop: onDrop.bind(null, task),
      collect: (monitor: DropTargetMonitor) => {
        return {
          isOver: monitor.isOver(),
        }
      },
    }),
    [task]
  )

  const refCallback = useCallback(
    node => {
      dragRef(node)
      dropRef(node)
    },
    [dragRef, dropRef]
  )

  return (
    <div className='task'>
      <div
        className={classNames('row', isOver && 'insert-below')}
        ref={refCallback}
        style={{ opacity }}
      >
        <div className='col-auto d-flex align-items-center'>
          <div className='p-3 flex-grow-1' onClick={onCheckBoxAreaClicked}>
            <input
              type='checkbox'
              checked={task.completed}
              onChange={onToggleCompleted}
              onClick={onCheckBoxClicked}
              className='d-block mt-0'
              style={{ width: '1.5rem', height: '1.5rem' }}
            />
          </div>
          <label className='form-check-label'>{task.description}</label>
        </div>
        {isEditModeEnabled && (
          <div className='col-auto ms-auto'>
            <div
              onClick={onDelete}
              style={{
                paddingTop: '0.375rem',
                paddingBottom: '0.375rem',
                paddingLeft: '0.75rem',
                paddingRight: '0.75rem',
                cursor: 'pointer',
                fontSize: '1.5rem',
              }}
            >
              <i className='bi bi-trash3'></i>
            </div>
          </div>
        )}
      </div>

      <div style={{ paddingLeft: '2.5rem' }}>
        <TaskList tasks={subtasks.get(task.id) ?? []} />

        {isEditModeEnabled && (
          <form
            onSubmit={onAddSubtask}
            style={{ paddingTop: '0.5625rem', paddingBottom: '0.5625rem' }}
            className='ms-3'
          >
            <div className='input-group'>
              <input
                name='description'
                type='text'
                placeholder='Description of a subtask'
                className='form-control'
              />
              <button type='submit' className='btn btn-primary'>
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

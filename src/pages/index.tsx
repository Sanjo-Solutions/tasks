import { withAuthenticator } from '@aws-amplify/ui-react'
import { DataStore, Amplify } from 'aws-amplify'
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

Amplify.configure(awsExports)

const EditModeContext = createContext<boolean>(true)

function App({ signOut }) {
  const [isEditModeEnabled, setIsEditModeEnabled] = useState(
    localStorage.getItem('isEditModeEnabled') !== 'false'
  )
  const [tasks, setTasks] = useState<LazyTask[]>([])

  useEffect(() => {
    const subscription = DataStore.observeQuery(Task, task =>
      task.parentTaskID.eq(null)
    ).subscribe(snapshot => {
      setTasks(snapshot.items)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAddTask = async event => {
    event.preventDefault()
    const description = event.target.elements.description.value
    if (description.trim()) {
      const task = await DataStore.save(new Task({ description }))
      console.log('task', task)
      setTasks([...tasks, task])
      event.target.reset()
    }
  }

  const onChangeEditMode = useCallback(event => {
    setIsEditModeEnabled(event.target.checked)
    localStorage.setItem('isEditModeEnabled', event.target.checked)
  }, [])

  return (
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
        <div>
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      </div>
    </EditModeContext.Provider>
  )
}

function TaskItem({ task }) {
  const [subtasks, setSubtasks] = useState<LazyTask[]>([])

  useEffect(() => {
    const subscription = DataStore.observeQuery(Task, task2 =>
      task2.parentTaskID.eq(task.id)
    ).subscribe(snapshot => {
      setSubtasks(snapshot.items)
    })

    return () => subscription.unsubscribe()
  }, [task])

  const onToggleCompleted = useCallback(
    async event => {
      console.log('B')
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
      console.log('A')
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

  return (
    <div className='task'>
      <div className='row'>
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
        {subtasks.map(subtask => (
          <TaskItem key={subtask.id} task={subtask} />
        ))}

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

export default withAuthenticator(App)

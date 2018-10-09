/* eslint-env jest */
import SubX from '../src/index'

describe('stale deep equal', () => {
  test('default', () => {
    const p = SubX.create({
      todos: [
        { completed: false },
        { completed: false },
        { completed: false }
      ],
      visibility: 'all',
      get visibleTodos () {
        if (this.visibility === 'all') {
          return this.todos
        } else if (this.visibility === 'active') {
          return this.todos.filter(todo => !todo.completed)
        } else if (this.visibility === 'completed') {
          return this.todos.filter(todo => todo.completed)
        }
      },
      get render () {
        return this.visibleTodos
      }
    })
    let events = []
    p.stale$.subscribe(event => events.push(event))
    expect(p.render.length).toBe(3)

    p.visibility = 'active'
    expect(events).toEqual([{
      type: 'STALE',
      path: [ 'visibleTodos' ],
      root: { type: 'SET',
        path: [ 'visibility' ],
        val: 'active',
        oldVal: 'all'
      }
    }])

    events = []
    p.visibility = 'active' // same value
    expect(events).toEqual([])

    p.visibility = 'completed'
    expect(events).toEqual([
      { 'path': ['visibleTodos'],
        'root': { 'oldVal': 'active', 'path': ['visibility'], 'type': 'SET', 'val': 'completed' },
        'type': 'STALE'
      },
      { 'path': ['render'],
        'root': { 'path': ['visibleTodos'],
          'root': { 'oldVal': 'active', 'path': ['visibility'], 'type': 'SET', 'val': 'completed' },
          'type': 'STALE' },
        'type': 'STALE' }
    ])
    expect(p.render.length).toBe(0)

    events = []
    p.todos[1].completed = true
    expect(p.render.length).toBe(1)
    expect(events).toEqual([
      { type: 'STALE',
        path: [ 'visibleTodos' ],
        root: { type: 'SET', path: ['todos', '1', 'completed'], val: true, oldVal: false } },
      { type: 'STALE',
        path: [ 'render' ],
        root: { type: 'STALE',
          path: [ 'visibleTodos' ],
          root: { type: 'SET', path: ['todos', '1', 'completed'], val: true, oldVal: false } }
      }
    ])
  })
})

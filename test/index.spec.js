/* eslint-env jest */
import * as R from 'ramda'

import SubX from '../src/index'

describe('index', () => {
  test('props', () => {
    const Model = new SubX({
      a: 'hello',
      b: 'world'
    })
    const model = new Model()
    expect(model.a).toBe('hello')
    expect(model.b).toBe('world')

    let count = 0
    const events = []
    model.$.subscribe(val => {
      count += 1
      events.push(val)
    })
    model.a = '111'
    model.b = '222'
    expect(count).toBe(2)
    expect(R.map(R.dissoc('id'), events)).toEqual([
      { type: 'SET', path: ['a'] },
      { type: 'SET', path: ['b'] }
    ])
  })

  test('streams', () => {
    const Model = new SubX({
      a: 'hello'
    })
    const model = new Model()
    const events = []
    model.$.subscribe(val => {
      events.push(val)
    })
    model.a = 'world'
    expect(R.map(R.dissoc('id'), events)).toEqual([{ type: 'SET', path: ['a'] }])
  })

  test('different ways to trigger event', () => {
    const Model = new SubX({
      a: '111'
    })
    const model = new Model()
    const events = []
    model.$.subscribe(val => {
      events.push(val)
    })
    model.a = '222'
    model.a = '333'
    expect(R.map(R.dissoc('id'), events)).toEqual([
      { type: 'SET', path: ['a'] },
      { type: 'SET', path: ['a'] }
    ])
  })
})

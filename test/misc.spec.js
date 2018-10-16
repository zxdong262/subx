/* eslint-env jest */
import SubX from '../src'

describe('Misc', () => {
  test('autoRun & runAndMonitor', () => {
    expect(SubX.autoRun).toBeDefined()
    expect(SubX.runAndMonitor).toBeDefined()
    const p = SubX.create()
    expect(p.autoRun).toBeUndefined()
    expect(p.runAndMonitor).toBeUndefined()
  })
})

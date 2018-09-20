import { Subject } from 'rxjs'
import { filter } from 'rxjs/operators'
import * as R from 'ramda'

const RESERVED_PROPERTIES = [
  '$', 'set$', 'delete$', 'get$', 'has$', 'ownKeys$',
  '$$', 'set$$', 'delete$$', 'get$$', 'has$$', 'ownKeys$$'
]

const handler = {
  set: (target, prop, val, receiver) => {
    if (R.contains(prop, RESERVED_PROPERTIES)) {
      prop = `_${prop}` // prefix reserved keywords with underscore
    }
    const oldVal = target[prop]
    let subscription
    if (typeof val === 'object' && val !== null) {
      let proxy
      if (val.__isSubX__) {
        proxy = val
      } else {
        proxy = SubX.create(val) // for recursive
      }
      subscription = proxy.$$.subscribe(event => receiver.$$.next(R.assoc('path', [prop, ...event.path], event)))
      target[prop] = proxy
    } else {
      target[prop] = val
    }
    target.$.next({ type: 'SET', path: [prop], val, oldVal })
    if (subscription) {
      const temp = target.$.pipe(filter(event => event.path[0] === prop)).subscribe(event => {
        subscription.unsubscribe()
        temp.unsubscribe()
      })
    }
    return true
  },
  get: (target, prop, receiver) => {
    switch (prop) {
      case '__isSubX__':
        return true
      case 'toJSON':
        return () => R.reduce((t, k) => R.dissoc(k, t), target, RESERVED_PROPERTIES)
      case 'toString':
        return () => `SubX ${JSON.stringify(receiver, null, 2)}`
      case 'inspect':
        return () => receiver.toString()
      default:
        return target[prop]
    }
  },
  deleteProperty: (target, prop) => {
    if (R.contains(prop, RESERVED_PROPERTIES)) {
      return false // disallow deletion of reserved keywords
    }
    const val = target[prop]
    delete target[prop]
    target.$.next({ type: 'DELETE', path: [prop], val })
    return true
  },
  ownKeys: target => {
    return R.without(RESERVED_PROPERTIES, Object.getOwnPropertyNames(target))
  },
  setPrototypeOf: (target, prototype) => {
    return false // disallow setPrototypeOf
  }
}

class SubX {
  constructor (modelObj = {}) {
    class Model {
      constructor (obj = {}) {
        const emptyValue = R.empty(obj)
        emptyValue.$ = new Subject()
        emptyValue.$$ = new Subject()
        const proxy = new Proxy(emptyValue, handler)
        R.pipe(
          R.concat,
          R.forEach(([prop, val]) => { proxy[prop] = val })
        )(R.toPairs(modelObj), R.toPairs(obj))
        proxy.$.subscribe(event => proxy.$$.next(event))
        return proxy
      }
    }
    return Model
  }
}

const DefaultModel = new SubX({})
SubX.create = (obj = {}) => new DefaultModel(obj)

export default SubX

import { empty, merge } from 'rxjs'
import * as R from 'ramda'
import { filter, merge as _merge, publish } from 'rxjs/operators'
import isEqual from 'react-fast-compare'

const monitorGets = (subx, gets) => {
  const relevantGets = R.reduce((events, event) =>
    (events.length > 0 && R.startsWith(events[0].path, event.path))
      ? R.update(0, event, events) : R.prepend(event, events)
  )([], gets)
  const uniqGets = R.uniqBy(event => event.path, relevantGets)
  let stream = empty()
  R.forEach(get => {
    stream = merge(stream, subx.delete$.pipe(filter(event =>
      (get.path.length > event.path.length && R.startsWith(event.path, get.path)) ||
      (event.val !== undefined && isEqual(event.path, get.path))
    )))
    const val = R.path(get.path, subx)
    stream = merge(stream, subx.stale$.pipe(filter(event =>
      isEqual(event.path, get.path) && !isEqual(val, R.path(get.path, subx))) // todo: do smart equal
    ))
    stream = merge(stream, subx.set$.pipe(
      filter(event => R.startsWith(event.path, get.path)),
      filter(event => {
        const parentVal = R.path(R.init(get.path), subx)
        if (typeof parentVal === 'object' && parentVal !== null) {
          return val !== parentVal[R.last(get.path)]
        } else {
          return true
        }
      })
    ))
  }, uniqGets)
  return stream
}

const monitorHass = (subx, hass) => {
  const uniqHass = R.uniqBy(has => has.path, hass)
  let stream = empty()
  R.forEach(has => {
    const val = R.last(has.path) in R.path(R.init(has.path), subx)
    stream = merge(stream, subx.delete$.pipe(filter(event =>
      (event.path.length < has.path.length && R.startsWith(event.path, has.path)) ||
      (val === true && isEqual(event.path, has.path))
    )))
    stream = merge(stream, subx.set$.pipe(
      filter(event => R.startsWith(event.path, has.path)),
      filter(event => {
        const parentVal = R.path(R.init(has.path), subx)
        if (typeof parentVal === 'object' && parentVal !== null) {
          return R.last(has.path) in parentVal !== val
        } else {
          return true
        }
      })
    ))
  }, uniqHass)
  return stream
}

const monitorkeyss = (subx, keyss) => {
  const uniqKeyss = R.uniqBy(keys => keys.path, keyss)
  let stream = empty()
  R.forEach(keys => {
    stream = merge(stream, subx.delete$.pipe(filter(event => R.startsWith(event.path, keys.path))))
    const val = Object.keys(R.path(keys.path, subx))
    stream = merge(stream, subx.delete$.pipe(
      filter(event => keys.path.length + 1 === event.path.length && R.startsWith(keys.path, event.path)),
      _merge(subx.set$.pipe(
        filter(event => R.startsWith(event.path, keys.path) || (keys.path.length + 1 === event.path.length && R.startsWith(keys.path, event.path))))),
      filter(event => {
        const parentVal = R.path(keys.path, subx)
        if (typeof parentVal === 'object' && parentVal !== null) {
          return !isEqual(Object.keys(parentVal), val)
        } else {
          return true
        }
      })
    ))
  }, uniqKeyss)
  return stream
}

export const monitor = (subx, { gets, hass, keyss }) => merge(monitorGets(subx, gets), monitorHass(subx, hass), monitorkeyss(subx, keyss))

export const runAndMonitor = (subx, f) => {
  const obj = subx.__isSubX__ ? { subx } : subx
  const kvs = R.pipe(R.toPairs, R.filter(([k, v]) => v.__isSubX__))(obj)
  const cache = {}
  const subscriptions = []
  R.forEach(([k, v]) => {
    cache[k] = { gets: [], hass: [], keyss: [] }
    let count = 0
    subscriptions.push(v.get$.subscribe(event => count === 0 && cache[k].gets.push(event)))
    subscriptions.push(v.has$.subscribe(event => count === 0 && cache[k].hass.push(event)))
    subscriptions.push(v.keys$.subscribe(event => count === 0 && cache[k].keyss.push(event)))
    subscriptions.push(v.compute_begin$.subscribe(event => { count += 1 }))
    subscriptions.push(v.compute_finish$.subscribe(event => { count -= 1 }))
  })(kvs)
  const result = f()
  R.forEach(subscription => subscription.unsubscribe(), subscriptions)
  let stream = empty()
  R.map(([k, v]) => {
    stream = merge(stream, monitor(v, { gets: cache[k].gets, hass: cache[k].hass, keyss: cache[k].keyss }))
  }, kvs)
  stream = stream.pipe(publish()).refCount()
  return { result, stream }
}

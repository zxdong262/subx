import Benchmark from 'benchmark'
import hyperid from 'hyperid'

const uuid = hyperid()

const suite = new Benchmark.Suite()
let id = 0
const fakeUuid = () => ++id
suite
  .add('fake uuid', () => {
    for (let i = 0; i < 100000; i++) {
      fakeUuid()
    }
  })
  .add('hyperid', () => {
    for (let i = 0; i < 100000; i++) {
      uuid()
    }
  })
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run()

/*
fake uuid x 4,119 ops/sec ±0.34% (95 runs sampled)
hyperid x 101 ops/sec ±3.18% (66 runs sampled)
Fastest is fake uuid
*/

const InputPacer = require('./')

const e = []
const pacer = new InputPacer({
  oninput (inp, message) {
    if (message.done) {
      const elapsed = e[e.length - 1] - e[0]
      const error = 1000 * (e.length - 1) - elapsed
      console.log('total error', error, 'microseconds')
    }

    e.push(InputPacer.time())
  }
})

const inp = pacer.addInput()

for (let i = 0; i < 5000; i++) {
  inp.queue(1000, {
    hello: 'hello'
  })
}

inp.queue(0, {
  done: true
})

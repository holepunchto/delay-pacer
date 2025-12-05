# delay-pacer

Auto drift adjusting pacer that supports multiple inputs

```
npm install delay-pacer
```

```js
const DelayPacer = require('delay-pacer')

const pacer = new DelayPacer({
  oninput(inp, message) {
    // message triggered
  }
})

const inp = pacer.addInput()

// queue a message in 1000 microseconds
inp.queue(1000, {
  hello: 'world'
})

// queue another message in 1000 microseconds after first one
inp.queue(1000, {
  hello: 'world'
})
```

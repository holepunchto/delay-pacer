const FIFO = require('fast-fifo')

class Input {
  constructor(pacer, context) {
    this.pacer = pacer
    this.fifo = new FIFO()
    this.context = context
    this.started = false
    this.timestamp = 0
    this.index = 0
    this.destroyed = false
  }

  get queued () {
    return this.fifo.length
  }

  queue(delay, message) {
    const empty = this.fifo.isEmpty()

    this.fifo.push({ delay, message })

    if (!this.started) {
      this.started = true
      this.timestamp = microtime() + delay
    }
    if (empty) {
      // otherwise it was set below in shift
      this.timestamp += delay
    }

    if (empty) {
      this.pacer._restart()
    }
  }

  shift() {
    const next = this.fifo.shift()
    if (!next) return null
    if (!this.fifo.isEmpty()) {
      this.timestamp += this.fifo.peek().delay
    }
    return next
  }

  nextExpiry() {
    if (this.fifo.isEmpty()) return -1
    return this.timestamp
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true

    const inp = this.pacer.inputs.pop()
    if (inp !== this) {
      inp.index = this.index
      this.pacer.inputs[inp.index] = inp
    }
  }
}

module.exports = class DelayPacer {
  constructor({ oninput }) {
    this.inputs = []
    this.clock = 0
    this.timeout = null
    this.oninput = oninput
  }

  static time() {
    return microtime()
  }

  _shift(now) {
    for (let i = this.inputs.length - 1; i >= 0; i--) {
      const inp = this.inputs[i]
      const expiry = inp.nextExpiry()

      if (expiry > -1 && expiry <= now) {
        this.oninput(inp, inp.shift().message, expiry, now)
      }
    }
  }

  async _restart() {
    this.clock++
    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    while (await this._bump()) {
      // do nothing
    }
  }

  async _bump() {
    const clock = this.clock
    const next = this.nextExpiry()
    if (next === -1) return false

    let now = microtime()

    if (next < now) {
      this._shift(now)
      return true
    }

    const delta = next - now
    const ms = delta / 1000 - 17

    if (ms > 0) {
      await new Promise((resolve) => {
        this.timeout = setTimeout(resolve, ms)
      })
    }

    if (clock !== this.clock) return false
    now = microtime()

    if (next < now) {
      this._shift(now)
      return true
    }

    while (true) {
      await 1
      if (clock !== this.clock) return false
      now = microtime()
      if (next < now) {
        this._shift(now)
        return true
      }
    }

    return false
  }

  nextExpiry() {
    let min = -1
    for (const inp of this.inputs) {
      const expires = inp.nextExpiry()
      if (expires === -1) continue
      if (min === -1 || expires < min) min = expires
    }
    return min
  }

  addInput(context = null) {
    const inp = new Input(this, context)
    this.inputs.push(inp)
    inp.index = this.inputs.length - 1
    return inp
  }
}

function microtime() {
  return performance.now() * 1000
}

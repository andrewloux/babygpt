export type Vector = number[]
export type Matrix = number[][]

export class BabyLearner {
  V: number
  D: number
  E: Matrix // [V, D]
  W: Matrix // [D, V]
  b: Vector // [V]

  cache: {
    inputIdx: number | null
    targetIdx: number | null
    e: Vector | null
    logits: Vector | null
    probs: Vector | null
  } = {
    inputIdx: null,
    targetIdx: null,
    e: null,
    logits: null,
    probs: null,
  }

  constructor(V: number = 5, D: number = 3) {
    this.V = V
    this.D = D
    this.E = this.randn(V, D)
    this.W = this.randn(D, V)
    this.b = new Array(V).fill(0)
  }

  private randn(rows: number, cols: number): Matrix {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() - 0.5) * 0.2)
    )
  }

  forward(inputIdx: number) {
    const e = this.E[inputIdx] // [D]

    const logits = new Array(this.V).fill(0)
    for (let j = 0; j < this.V; j++) {
      let sum = 0
      for (let k = 0; k < this.D; k++) {
        sum += e[k] * this.W[k][j]
      }
      logits[j] = sum + this.b[j]
    }

    const maxLogit = Math.max(...logits)
    const exps = logits.map((l) => Math.exp(l - maxLogit))
    const sumExps = exps.reduce((a, b) => a + b, 0)
    const probs = exps.map((x) => x / sumExps)

    this.cache.inputIdx = inputIdx
    this.cache.e = [...e]
    this.cache.logits = [...logits]
    this.cache.probs = [...probs]

    return { logits, probs }
  }

  loss(targetIdx: number) {
    if (!this.cache.probs) throw new Error('Run forward first')
    this.cache.targetIdx = targetIdx
    return -Math.log(this.cache.probs[targetIdx])
  }

  backward() {
    const { probs, targetIdx, e, inputIdx } = this.cache
    if (!probs || targetIdx === null || !e || inputIdx === null) {
      throw new Error('Cache missing. Run forward & loss first.')
    }

    const dlogits = [...probs]
    dlogits[targetIdx] -= 1

    const db = [...dlogits]

    const dW: Matrix = Array.from({ length: this.D }, () => new Array(this.V).fill(0))
    for (let k = 0; k < this.D; k++) {
      for (let j = 0; j < this.V; j++) {
        dW[k][j] = e[k] * dlogits[j]
      }
    }

    const de = new Array(this.D).fill(0)
    for (let k = 0; k < this.D; k++) {
      for (let j = 0; j < this.V; j++) {
        de[k] += dlogits[j] * this.W[k][j]
      }
    }

    const dE: Matrix = Array.from({ length: this.V }, () => new Array(this.D).fill(0))
    dE[inputIdx] = de

    return { dE, dW, db, dlogits, de }
  }

  step(lr: number, grads: { dE: Matrix; dW: Matrix; db: Vector }) {
    for (let i = 0; i < this.V; i++) {
      for (let j = 0; j < this.D; j++) {
        this.E[i][j] -= lr * grads.dE[i][j]
      }
    }
    for (let i = 0; i < this.D; i++) {
      for (let j = 0; j < this.V; j++) {
        this.W[i][j] -= lr * grads.dW[i][j]
      }
    }
    for (let i = 0; i < this.V; i++) {
      this.b[i] -= lr * grads.db[i]
    }
  }

  trainStep(inputIdx: number, targetIdx: number, lr: number): number {
    this.forward(inputIdx)
    const loss = this.loss(targetIdx)
    const grads = this.backward()
    this.step(lr, grads)
    return loss
  }

  checkGradient(inputIdx: number, targetIdx: number, epsilon = 1e-5) {
    this.forward(inputIdx)
    this.loss(targetIdx)
    const grads = this.backward()

    const base = this.W[0][0]

    this.W[0][0] = base + epsilon
    this.forward(inputIdx)
    const lPlus = this.loss(targetIdx)

    this.W[0][0] = base - epsilon
    this.forward(inputIdx)
    const lMinus = this.loss(targetIdx)

    this.W[0][0] = base

    const numeric = (lPlus - lMinus) / (2 * epsilon)
    const diff = Math.abs(numeric - grads.dW[0][0])

    return {
      param: 'W[0][0]',
      analytic: grads.dW[0][0],
      numeric,
      diff,
      passed: diff < 1e-4,
    }
  }
}


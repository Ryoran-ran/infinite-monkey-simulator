// Mulberry32: deterministic uint32 PRNG. Rejection sampling avoids modulo bias.
export class SeededRandom {
  private state: number
  constructor(seed: number) { this.state = seed >>> 0 }
  nextUint32(): number {
    let t = this.state = (this.state + 0x6d2b79f5) >>> 0
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (t ^ (t >>> 14)) >>> 0
  }
  index(size: number): number {
    if (!Number.isInteger(size) || size < 2 || size > 0x100000000) throw new Error('Invalid alphabet size')
    const limit = Math.floor(0x100000000 / size) * size
    let value: number
    do { value = this.nextUint32() } while (value >= limit)
    return value % size
  }
}

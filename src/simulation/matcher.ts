export function prefixTable(target: string): Uint32Array {
  const table = new Uint32Array(target.length)
  for (let i = 1, j = 0; i < target.length; i++) {
    while (j > 0 && target[i] !== target[j]) j = table[j - 1]
    if (target[i] === target[j]) j++
    table[i] = j
  }
  return table
}

export class StreamMatcher {
  readonly table: Uint32Array
  matched = 0
  constructor(readonly target: string) {
    if (!target.length) throw new Error('Target must not be empty')
    this.table = prefixTable(target)
  }
  push(character: string): number {
    if (this.matched === this.target.length) this.matched = this.table[this.matched - 1]
    while (this.matched > 0 && character !== this.target[this.matched]) this.matched = this.table[this.matched - 1]
    if (character === this.target[this.matched]) this.matched++
    return this.matched
  }
  reset(): void { this.matched = 0 }
}

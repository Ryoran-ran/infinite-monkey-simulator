import { prefixTable } from './matcher'

// Exact expected first waiting time, including every prefix/suffix border.
export function expectedWaitingTime(target: string, alphabetSize: number): bigint {
  if (!target.length || !Number.isInteger(alphabetSize) || alphabetSize < 2) return 0n
  const table = prefixTable(target)
  const n = BigInt(alphabetSize)
  let result = 0n
  for (let k = target.length; k > 0; k = table[k - 1]) result += n ** BigInt(k)
  return result
}

export function positionDenominator(length: number, alphabetSize: number): bigint {
  return alphabetSize >= 2 && length > 0 ? BigInt(alphabetSize) ** BigInt(length) : 0n
}

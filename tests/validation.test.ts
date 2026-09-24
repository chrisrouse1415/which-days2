import { describe, expect, test } from 'bun:test'
import { isNonEmptyString, isValidShareId, isValidUUID } from '../lib/validation'

describe('isValidUUID', () => {
  test('accepts a UUID in either case', () => {
    expect(isValidUUID('0b0e8f0a-1c2d-4e5f-8a9b-0c1d2e3f4a5b')).toBe(true)
    expect(isValidUUID('0B0E8F0A-1C2D-4E5F-8A9B-0C1D2E3F4A5B')).toBe(true)
  })

  test('rejects junk and non-strings', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false)
    expect(isValidUUID("0b0e8f0a-1c2d-4e5f-8a9b-0c1d2e3f4a5b' OR 1=1")).toBe(false)
    expect(isValidUUID(undefined)).toBe(false)
    expect(isValidUUID(42)).toBe(false)
  })
})

describe('isValidShareId', () => {
  test('accepts a 10-character nanoid', () => {
    expect(isValidShareId('aB3_x-9ZqW')).toBe(true)
  })

  test('rejects wrong length or characters', () => {
    expect(isValidShareId('short')).toBe(false)
    expect(isValidShareId('aB3_x-9ZqW1')).toBe(false)
    expect(isValidShareId('aB3/x-9ZqW')).toBe(false)
    expect(isValidShareId(null)).toBe(false)
  })
})

describe('isNonEmptyString', () => {
  test('rejects blank strings and non-strings', () => {
    expect(isNonEmptyString('hi')).toBe(true)
    expect(isNonEmptyString('   ')).toBe(false)
    expect(isNonEmptyString(['hi'])).toBe(false)
  })
})

import type { View } from 'react-native'
import { Platform } from 'react-native'
import { measurePageOrigin, webOriginFromRect } from '../boardCoords'

function setPlatformOS(os: typeof Platform.OS): () => void {
  const original = Object.getOwnPropertyDescriptor(Platform, 'OS')
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true })
  return () => {
    if (original) Object.defineProperty(Platform, 'OS', original)
  }
}

describe('webOriginFromRect', () => {
  it('converts viewport coords to document coords by adding scroll offsets', () => {
    expect(webOriginFromRect({ left: 10, top: 20 }, 0, 0)).toEqual({ x: 10, y: 20 })
    expect(webOriginFromRect({ left: 10, top: 20 }, 5, 120)).toEqual({ x: 15, y: 140 })
  })
})

describe('measurePageOrigin', () => {
  it('uses measureInWindow on native (matches pageX/pageY coordinate space)', () => {
    const measureInWindow = jest.fn((cb: (x: number, y: number) => void) => cb(33, 44))
    const view = { measureInWindow } as unknown as View

    const onMeasured = jest.fn()
    measurePageOrigin(view, onMeasured)

    expect(measureInWindow).toHaveBeenCalledTimes(1)
    expect(onMeasured).toHaveBeenCalledWith({ x: 33, y: 44 })
  })

  it('does nothing for a null view', () => {
    const onMeasured = jest.fn()
    measurePageOrigin(null, onMeasured)
    expect(onMeasured).not.toHaveBeenCalled()
  })

  it('uses getBoundingClientRect + scroll offsets on web (synchronous)', () => {
    const restore = setPlatformOS('web')
    const g = globalThis as { window?: { scrollX: number; scrollY: number } }
    const originalWindow = g.window
    g.window = { scrollX: 7, scrollY: 250 }
    try {
      const getBoundingClientRect = jest.fn(() => ({ left: 100, top: 40 }) as DOMRect)
      const view = { getBoundingClientRect } as unknown as View

      const onMeasured = jest.fn()
      measurePageOrigin(view, onMeasured)

      // 同期的に、ドキュメント基準（スクロール込み）の原点が返る
      expect(onMeasured).toHaveBeenCalledWith({ x: 107, y: 290 })
    } finally {
      g.window = originalWindow
      restore()
    }
  })

  it('falls back to measureInWindow on web when the ref is not a DOM element', () => {
    const restore = setPlatformOS('web')
    try {
      const measureInWindow = jest.fn((cb: (x: number, y: number) => void) => cb(1, 2))
      const view = { measureInWindow } as unknown as View

      const onMeasured = jest.fn()
      measurePageOrigin(view, onMeasured)

      expect(onMeasured).toHaveBeenCalledWith({ x: 1, y: 2 })
    } finally {
      restore()
    }
  })
})

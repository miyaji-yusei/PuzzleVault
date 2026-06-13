import { act, renderHook } from '@testing-library/react-native'
import { useSevenTutorial } from '../useSevenTutorial'
import { TUTORIAL_STEPS } from '../../engines/seven'

describe('useSevenTutorial', () => {
  it('starts at step 1 of 10', () => {
    const { result } = renderHook(() => useSevenTutorial())
    expect(result.current.stepIndex).toBe(0)
    expect(result.current.totalSteps).toBe(10)
    expect(result.current.isFirst).toBe(true)
    expect(result.current.isLast).toBe(false)
  })

  it('advances with next() and goes back with prev()', () => {
    const { result } = renderHook(() => useSevenTutorial())

    act(() => result.current.next())
    expect(result.current.stepIndex).toBe(1)

    act(() => result.current.prev())
    expect(result.current.stepIndex).toBe(0)
    expect(result.current.isFirst).toBe(true)
  })

  it('does not go below step 0 or above the last step', () => {
    const { result } = renderHook(() => useSevenTutorial())

    act(() => result.current.prev())
    expect(result.current.stepIndex).toBe(0)

    for (let i = 0; i < TUTORIAL_STEPS.length + 2; i++) {
      act(() => result.current.next())
    }
    expect(result.current.stepIndex).toBe(TUTORIAL_STEPS.length - 1)
    expect(result.current.isLast).toBe(true)
  })

  it('step 1 has no required action and can advance manually', () => {
    const { result } = renderHook(() => useSevenTutorial())
    expect(result.current.canAdvanceManually).toBe(true)
  })

  it('step 2 only advances when the king (rank 13) is tapped', () => {
    const { result } = renderHook(() => useSevenTutorial())
    act(() => result.current.next())
    expect(result.current.stepIndex).toBe(1)
    expect(result.current.canAdvanceManually).toBe(false)

    // 違うランクのカードをタップしても進まない
    const nonKingIndex = result.current.step.state.hands[0].findIndex((c) => c.rank !== 13)
    act(() => result.current.handleSelectCard(nonKingIndex))
    expect(result.current.stepIndex).toBe(1)

    // Kをタップすると次のステップへ進む
    const kingIndex = result.current.step.state.hands[0].findIndex((c) => c.rank === 13)
    act(() => result.current.handleSelectCard(kingIndex))
    expect(result.current.stepIndex).toBe(2)
  })

  it('step 3 only advances when drawing from the deck', () => {
    const { result } = renderHook(() => useSevenTutorial())
    act(() => result.current.next())
    act(() => result.current.next())
    expect(result.current.stepIndex).toBe(2)

    act(() => result.current.handleDraw('discard'))
    expect(result.current.stepIndex).toBe(2)

    act(() => result.current.handleDraw('deck'))
    expect(result.current.stepIndex).toBe(3)
  })

  it('reset() returns to step 1', () => {
    const { result } = renderHook(() => useSevenTutorial())
    act(() => result.current.next())
    act(() => result.current.next())
    expect(result.current.stepIndex).toBe(2)

    act(() => result.current.reset())
    expect(result.current.stepIndex).toBe(0)
  })
})

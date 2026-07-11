import { Modal, View, Text, StyleSheet, SafeAreaView } from 'react-native'
import { SevenBoard } from './Board'
import { Button } from '../../ui'
import { useSevenTutorial } from '../../../hooks/useSevenTutorial'
import { vault, ink, gold, fontSize, radii, shadows } from '../../../theme'

interface Props {
  visible: boolean
  onClose: () => void
}

/** Sevenの固定シナリオによる遊び方チュートリアル(10ステップ) */
export function SevenTutorialOverlay({ visible, onClose }: Props) {
  const { step, stepIndex, totalSteps, isFirst, isLast, canAdvanceManually, next, prev, reset, handleSelectCard, handleDraw } =
    useSevenTutorial()

  const highlight = step.highlight
  const highlightIndices =
    highlight?.type === 'hand-rank'
      ? step.state.hands[0].reduce<number[]>((acc, c, i) => (c.rank === highlight.rank ? [...acc, i] : acc), [])
      : []
  const highlightPile = highlight?.type === 'pile' ? highlight.pile : null

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" supportedOrientations={['portrait', 'landscape']}>
      <SafeAreaView style={styles.container}>
        <View style={styles.boardWrap} pointerEvents={step.action ? 'auto' : 'none'}>
          <SevenBoard
            state={step.state}
            selectedIndices={[]}
            isHumanTurn
            onSelectCard={handleSelectCard}
            onDrawFrom={handleDraw}
            highlightIndices={highlightIndices}
            highlightPile={highlightPile}
            forceCanDraw={highlightPile !== null}
          />
        </View>

        <View style={[styles.card, shadows.dialog]}>
          <Text style={styles.stepCounter}>
            {stepIndex + 1} / {totalSteps}
          </Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.message}>{step.message}</Text>
          <View style={styles.buttons}>
            {!isFirst && <Button label="戻る" onPress={prev} variant="secondary" />}
            {canAdvanceManually && <Button label={isLast ? '完了' : '次へ'} onPress={isLast ? handleClose : next} />}
            <Button label="スキップ" onPress={handleClose} variant="text" />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  boardWrap: {
    flex: 1,
  },
  card: {
    backgroundColor: vault.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: gold.deep,
    padding: 16,
    margin: 12,
  },
  stepCounter: {
    fontSize: fontSize.xs,
    color: gold.accent,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: ink.strong,
    marginBottom: 8,
  },
  message: {
    fontSize: fontSize.base,
    color: ink.body,
    lineHeight: 20,
  },
  buttons: {
    marginTop: 16,
    gap: 10,
  },
})

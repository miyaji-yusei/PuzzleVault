import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SolitaireBoard } from '../../../src/components/games/solitaire/Board'
import { useSolitaireGame } from '../../../src/hooks/useSolitaireGame'
import { Difficulty } from '../../../src/types/engine'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

export default function SolitaireScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const paramDifficulty: Difficulty | null = isDifficulty(params.difficulty) ? params.difficulty : null
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(paramDifficulty)
  const difficulty: Difficulty = selectedDifficulty ?? 'easy'

  const {
    state, puzzle, selected, isComplete, maxResets,
    canAutoComplete, canUndo, isDeadlocked,
    tapStock, tapWaste, tapTableau, tapFoundation, doubleTapCard, doubleTapWaste, directMove,
    undo, restart, newGame, autoComplete,
  } = useSolitaireGame(difficulty)

  const [showAutoCompleteDialog, setShowAutoCompleteDialog] = useState(false)
  const [autoCompleteHandled, setAutoCompleteHandled] = useState(false)
  const [showDeadlockDialog, setShowDeadlockDialog] = useState(false)
  const [deadlockHandled, setDeadlockHandled] = useState(false)
  const [showRestartDialog, setShowRestartDialog] = useState(false)

  useEffect(() => {
    if (canAutoComplete && !autoCompleteHandled) {
      setShowAutoCompleteDialog(true)
      setAutoCompleteHandled(true)
    }
    if (!canAutoComplete) {
      setAutoCompleteHandled(false)
    }
  }, [canAutoComplete, autoCompleteHandled])

  useEffect(() => {
    if (isDeadlocked && !deadlockHandled) {
      setShowDeadlockDialog(true)
      setDeadlockHandled(true)
    }
    if (!isDeadlocked) {
      setDeadlockHandled(false)
    }
  }, [isDeadlocked, deadlockHandled])

  const resetLeft = maxResets === 999 ? '∞' : String(maxResets - state.stockResets)

  if (!selectedDifficulty) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.title}>ソリティア</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.selectScreen}>
          <Text style={styles.selectTitle}>難易度を選択</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setSelectedDifficulty('easy')}
          >
            <Text style={styles.selectButtonTitle}>初級</Text>
            <Text style={styles.selectButtonDesc}>山札を1枚ずつめくる</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setSelectedDifficulty('hard')}
          >
            <Text style={styles.selectButtonTitle}>上級</Text>
            <Text style={styles.selectButtonDesc}>山札を3枚ずつめくる</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ソリティア</Text>
        <View style={styles.headerRight}>
          <Text style={styles.metaText}>スコア: {state.score}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={undo}
              disabled={!canUndo}
              style={[styles.iconButton, !canUndo && styles.iconButtonDisabled]}
            >
              <Text style={styles.iconButtonText}>↩</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowRestartDialog(true)} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>↺</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          {puzzle.drawMode === 1 ? '1枚めくり' : '3枚めくり'} ・ {difficulty} ・ リセット残: {resetLeft} ・ 手数: {state.moves}
        </Text>
      </View>

      <SolitaireBoard
        state={state}
        selected={selected}
        onTapStock={tapStock}
        onTapWaste={tapWaste}
        onDoubleTapWaste={doubleTapWaste}
        onTapFoundation={tapFoundation}
        onTapTableau={tapTableau}
        onDoubleTapCard={doubleTapCard}
        onDirectMove={directMove}
      />

      {/* Restart confirmation dialog */}
      <Modal visible={showRestartDialog} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>リセット確認</Text>
            <Text style={styles.dialogMessage}>ゲームをリセットしますか？</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => setShowRestartDialog(false)}
              >
                <Text style={styles.dialogButtonTextCancel}>いいえ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonOk]}
                onPress={() => {
                  setShowRestartDialog(false)
                  restart()
                }}
              >
                <Text style={styles.dialogButtonTextOk}>はい</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Auto-complete dialog */}
      <Modal visible={showAutoCompleteDialog} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>自動完成</Text>
            <Text style={styles.dialogMessage}>すべてのカードを組み札に移動しますか？</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => setShowAutoCompleteDialog(false)}
              >
                <Text style={styles.dialogButtonTextCancel}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonOk]}
                onPress={() => {
                  setShowAutoCompleteDialog(false)
                  autoComplete()
                }}
              >
                <Text style={styles.dialogButtonTextOk}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deadlock dialog */}
      <Modal visible={showDeadlockDialog} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>詰みました</Text>
            <Text style={styles.dialogMessage}>これ以上有効な手がありません。</Text>
            <View style={styles.dialogButtons}>
              {canUndo && (
                <TouchableOpacity
                  style={[styles.dialogButton, styles.dialogButtonCancel]}
                  onPress={() => {
                    setShowDeadlockDialog(false)
                    undo()
                  }}
                >
                  <Text style={styles.dialogButtonTextCancel}>手を戻す</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => {
                  setShowDeadlockDialog(false)
                  restart()
                }}
              >
                <Text style={styles.dialogButtonTextCancel}>リセット</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonOk]}
                onPress={() => {
                  setShowDeadlockDialog(false)
                  newGame()
                }}
              >
                <Text style={styles.dialogButtonTextOk}>新しいゲーム</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Win dialog */}
      <Modal visible={isComplete} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>🎉 クリア！</Text>
            <Text style={styles.dialogMessage}>スコア: {state.score}点</Text>
            <Text style={styles.dialogMessage}>手数: {state.moves}手</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => router.back()}
              >
                <Text style={styles.dialogButtonTextCancel}>タイトルに戻る</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonOk]}
                onPress={restart}
              >
                <Text style={styles.dialogButtonTextOk}>もう一度プレイ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b5e20',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1b5e20',
    borderBottomWidth: 1,
    borderBottomColor: '#2e7d32',
  },
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 14,
    color: '#a5d6a7',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#c8e6c9',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  iconButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  infoRow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#2e7d32',
  },
  infoText: {
    fontSize: 11,
    color: '#c8e6c9',
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 280,
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  dialogButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  dialogButtonCancel: {
    backgroundColor: '#eee',
  },
  dialogButtonOk: {
    backgroundColor: '#1b5e20',
  },
  dialogButtonTextCancel: {
    color: '#333',
    fontWeight: '600',
  },
  dialogButtonTextOk: {
    color: '#fff',
    fontWeight: '600',
  },
  selectScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  selectTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  selectButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  selectButtonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  selectButtonDesc: {
    fontSize: 14,
    color: '#c8e6c9',
  },
})

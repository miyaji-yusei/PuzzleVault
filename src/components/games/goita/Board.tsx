import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { getTeamScore, teamOf } from '../../../engines/goita'
import { GoitaState, Piece, PieceType } from '../../../engines/goita/types'
import { HUMAN_PLAYER, LeadInfo } from '../../../hooks/useGoitaGame'
import { PieceIcon } from './PieceIcon'
import { gold as goldColor } from '../../../theme'

// 駒の表示名（ひらがなの動物名）。動物アイコンと併記する。
export const PIECE_LABELS: Record<PieceType, string> = {
  king: 'らいおん',
  rook: 'わし',
  bishop: 'しか',
  gold: 'とら',
  silver: 'おおかみ',
  knight: 'うま',
  lance: 'へび',
  pawn: 'ねずみ',
  shi: 'ねこ',
  do: 'いぬ',
  ne: 'うさぎ',
  hi: 'ひつじ',
  ko: 'こあら',
  sa: 'さる',
}

// 強い駒（king/rook/bishop/gold/silver）はタイル枠を金色にして差別化する
const HIGH_VALUE_TYPES = new Set<PieceType>(['king', 'rook', 'bishop', 'gold', 'silver'])

const PLAYER_NAMES = ['あなた', '右の相手', '相方', '左の相手']

type Props = {
  state: GoitaState
  lastPlay: LeadInfo | null
}

type TileProps = {
  piece?: Piece
  faceDown?: boolean
  size?: number
  highlighted?: boolean
}

export function PieceTile({ piece, faceDown = false, size = 44, highlighted = false }: TileProps) {
  const dimensions = { width: size, height: size * 1.3 }

  if (faceDown || !piece) {
    return <View style={[styles.tile, styles.tileBack, dimensions]} />
  }

  return (
    <View
      style={[
        styles.tile,
        styles.tileFace,
        HIGH_VALUE_TYPES.has(piece.type) && styles.tileHighValue,
        highlighted && styles.tileHighlight,
        dimensions,
      ]}
    >
      <PieceIcon type={piece.type} size={size * 0.52} />
      <Text style={[styles.tileText, { fontSize: size * 0.2 }]}>{PIECE_LABELS[piece.type]}</Text>
    </View>
  )
}

function OpponentArea({ player, count, current }: { player: number; count: number; current: boolean }) {
  return (
    <View style={[styles.opponentArea, current && styles.activeArea]}>
      <Text style={styles.opponentName}>{PLAYER_NAMES[player]}</Text>
      <View style={styles.opponentTileRow}>
        <PieceTile faceDown size={28} />
        <Text style={styles.opponentCount}>× {count}</Text>
      </View>
    </View>
  )
}

export function GoitaBoard({ state, lastPlay }: Props) {
  const myTeam = teamOf(state, HUMAN_PLAYER)
  const opponentTeam = 1 - myTeam

  let centerMessage = '相手が出すのを待っています…'
  if (state.finished) {
    centerMessage = state.winningTeam === myTeam ? 'あなたのチームの勝ち！' : '相手チームの勝ち'
  } else if (state.currentPlayer === HUMAN_PLAYER) {
    centerMessage = '駒を選んで「出す」を押してください'
  }

  return (
    <View style={styles.table}>
      <View style={styles.topRow}>
        <OpponentArea player={2} count={state.hands[2].length} current={state.currentPlayer === 2} />
      </View>

      <View style={styles.middleRow}>
        <OpponentArea player={3} count={state.hands[3].length} current={state.currentPlayer === 3} />

        <View style={styles.center}>
          <Text style={styles.scoreText}>
            あなたのチーム {getTeamScore(state, myTeam)} － {getTeamScore(state, opponentTeam)} 相手チーム
          </Text>

          {lastPlay && (
            <View style={styles.lastPlayBox}>
              <PieceTile piece={lastPlay.piece} size={36} />
              <Text style={styles.lastPlayText}>
                {PLAYER_NAMES[lastPlay.leader]}が{PIECE_LABELS[lastPlay.piece.type]}を出した
                {'\n'}
                {lastPlay.emptiedHand
                  ? '→ 最後の1枚を出し切った！'
                  : lastPlay.capturedBy !== null
                    ? `→ ${PLAYER_NAMES[lastPlay.capturedBy]}が取った！`
                    : '→ 誰も取れず流れた'}
              </Text>
            </View>
          )}

          <Text style={styles.centerMessage}>{centerMessage}</Text>
        </View>

        <OpponentArea player={1} count={state.hands[1].length} current={state.currentPlayer === 1} />
      </View>

      <View style={styles.bottomRow}>
        <View style={[styles.opponentArea, state.currentPlayer === HUMAN_PLAYER && styles.activeArea]}>
          <Text style={styles.opponentName}>{PLAYER_NAMES[HUMAN_PLAYER]}</Text>
          <Text style={styles.opponentCount}>残り {state.hands[HUMAN_PLAYER].length} 枚</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  table: {
    width: '100%',
    maxWidth: 380,
    aspectRatio: 0.95,
    backgroundColor: '#2e7d32',
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#1b5e20',
    padding: 12,
    justifyContent: 'space-between',
  },
  topRow: {
    alignItems: 'center',
  },
  bottomRow: {
    alignItems: 'center',
  },
  middleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  opponentArea: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
  },
  activeArea: {
    backgroundColor: 'rgba(255, 235, 59, 0.35)',
  },
  opponentName: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  opponentTileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  opponentCount: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  scoreText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  lastPlayBox: {
    alignItems: 'center',
    marginBottom: 8,
  },
  lastPlayText: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  centerMessage: {
    color: '#fffde7',
    fontSize: 12,
    textAlign: 'center',
  },
  tile: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  tileFace: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#8d6e63',
  },
  tileHighValue: {
    borderWidth: 2,
    borderColor: goldColor.deep,
  },
  tileHighlight: {
    borderColor: '#fbc02d',
    borderWidth: 3,
    backgroundColor: '#fff3c4',
  },
  tileBack: {
    backgroundColor: '#5d4037',
    borderWidth: 1,
    borderColor: '#3e2723',
  },
  tileText: {
    color: '#3e2723',
    fontWeight: 'bold',
    marginTop: 1,
  },
})

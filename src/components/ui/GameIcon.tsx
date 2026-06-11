import Svg, { Path, Circle, Line, Rect, G } from 'react-native-svg'

export type IconName =
  | 'solitaire'
  | 'spider'
  | 'sudoku'
  | 'nonogram'
  | 'queens'
  | 'libra'
  | 'panda'
  | 'hashi'
  | 'sums'
  | 'gechoout'
  | 'goita'
  | 'sun'
  | 'moon'
  | 'bamboo'
  | 'crown'
  | 'bolt'

interface Props {
  name: IconName
  size?: number
  color?: string
}

/**
 * 白黒（単色）アイコンセット。絵文字の代替としてゲーム一覧・盤面で使用する。
 * color に指定した1色で描画される（デフォルト白）。
 */
export function GameIcon({ name, size = 24, color = '#FFFFFF' }: Props) {
  const p = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const
  switch (name) {
    case 'solitaire': // スペード
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 2C9 7 4 9.5 4 13.5a4 4 0 0 0 7 2.6c-.2 2-1 3.4-2.5 4.9h7c-1.5-1.5-2.3-2.9-2.5-4.9a4 4 0 0 0 7-2.6C20 9.5 15 7 12 2z"
            fill={color}
          />
        </Svg>
      )
    case 'spider': // 蜘蛛（白黒）
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="14" r="3.4" fill={color} />
          <Circle cx="12" cy="9" r="2" fill={color} />
          <G {...p}>
            <Path d="M10 9 6 5M14 9l4-4" />
            <Path d="M9 12H3.5M15 12h5.5" />
            <Path d="M9.5 15.5 5 18.5M14.5 15.5l4.5 3" />
            <Path d="M10.5 17 8 21.5M13.5 17l2.5 4.5" />
          </G>
        </Svg>
      )
    case 'sudoku': // 9分割グリッド
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Rect x="3.5" y="3.5" width="17" height="17" rx="2" />
            <Line x1="9.2" y1="3.5" x2="9.2" y2="20.5" />
            <Line x1="14.8" y1="3.5" x2="14.8" y2="20.5" />
            <Line x1="3.5" y1="9.2" x2="20.5" y2="9.2" />
            <Line x1="3.5" y1="14.8" x2="20.5" y2="14.8" />
          </G>
          <Circle cx="6.35" cy="6.35" r="1.2" fill={color} />
          <Circle cx="17.65" cy="12" r="1.2" fill={color} />
          <Circle cx="12" cy="17.65" r="1.2" fill={color} />
        </Svg>
      )
    case 'nonogram': // 一部塗られたグリッド
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Rect x="3.5" y="3.5" width="17" height="17" rx="2" />
          </G>
          <Rect x="5.5" y="5.5" width="4.2" height="4.2" fill={color} />
          <Rect x="10.3" y="10.3" width="4.2" height="4.2" fill={color} />
          <Rect x="15" y="5.5" width="4.2" height="4.2" fill={color} />
          <Rect x="5.5" y="15" width="4.2" height="4.2" fill={color} />
        </Svg>
      )
    case 'queens':
    case 'crown': // 王冠
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 18h16l1.5-9-5 3L12 5 7.5 12l-5-3L4 18z" fill={color} />
          <Rect x="4.5" y="19.5" width="15" height="2" rx="1" fill={color} />
        </Svg>
      )
    case 'libra': // 天秤
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Line x1="12" y1="3.5" x2="12" y2="18" />
            <Line x1="5" y1="6.5" x2="19" y2="6.5" />
            <Path d="M2.5 13.5a2.8 2.8 0 0 0 5.6 0L5.3 7.2 2.5 13.5z" fill={color} />
            <Path d="M15.9 13.5a2.8 2.8 0 0 0 5.6 0l-2.8-6.3-2.8 6.3z" fill={color} />
            <Line x1="8" y1="20.5" x2="16" y2="20.5" />
          </G>
        </Svg>
      )
    case 'panda': // パンダ（白黒）
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="6.5" cy="6" r="2.6" fill={color} />
          <Circle cx="17.5" cy="6" r="2.6" fill={color} />
          <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth={1.8} fill="none" />
          <Path d="M8 11.2a2 2 0 1 0 2.4 2.6" fill={color} />
          <Path d="M16 11.2a2 2 0 1 1-2.4 2.6" fill={color} />
          <Circle cx="12" cy="16" r="1.1" fill={color} />
        </Svg>
      )
    case 'hashi': // 橋（島と二重橋）
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Line x1="8.5" y1="5" x2="15.5" y2="5" />
            <Line x1="8.5" y1="7.5" x2="15.5" y2="7.5" />
            <Line x1="6" y1="10.5" x2="6" y2="15.5" />
          </G>
          <Circle cx="6" cy="6.2" r="2.7" fill={color} />
          <Circle cx="18" cy="6.2" r="2.7" fill={color} />
          <Circle cx="6" cy="18" r="2.7" fill={color} />
        </Svg>
      )
    case 'sums': // Σ風の合計
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M6 4h12v3h-2.2l-.3-1.2H9.8L14 12l-4.2 6.2h5.7l.3-1.2H18v3H6v-1.6L11 12 6 5.6V4z"
            fill={color}
          />
        </Svg>
      )
    case 'gechoout': // 脱出ドア
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Path d="M13 4h6v16h-6" />
            <Path d="M4 12h10" />
            <Path d="m10.5 8.5 3.5 3.5-3.5 3.5" />
          </G>
        </Svg>
      )
    case 'goita': // 駒（将棋駒型）
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3 7 6.5 5.5 20h13L17 6.5 12 3z" fill={color} />
        </Svg>
      )
    case 'sun': // 太陽（白黒）
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="4.2" fill={color} />
          <G {...p}>
            <Line x1="12" y1="2.5" x2="12" y2="5" />
            <Line x1="12" y1="19" x2="12" y2="21.5" />
            <Line x1="2.5" y1="12" x2="5" y2="12" />
            <Line x1="19" y1="12" x2="21.5" y2="12" />
            <Line x1="5.3" y1="5.3" x2="7" y2="7" />
            <Line x1="17" y1="17" x2="18.7" y2="18.7" />
            <Line x1="5.3" y1="18.7" x2="7" y2="17" />
            <Line x1="17" y1="7" x2="18.7" y2="5.3" />
          </G>
        </Svg>
      )
    case 'moon': // 月（白黒）
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5z" fill={color} />
        </Svg>
      )
    case 'bamboo': // 笹（白黒）
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="10.7" y="3" width="2.6" height="18" rx="1.2" fill={color} />
          <G {...p}>
            <Line x1="10.7" y1="9" x2="13.3" y2="9" />
            <Line x1="10.7" y1="15" x2="13.3" y2="15" />
            <Path d="M13.3 6.5c2.5-.5 4.5-2 5.5-4-2.5.2-4.6 1.5-5.5 4z" fill={color} />
            <Path d="M10.7 12.5c-2.5-.5-4.5-2-5.5-4 2.5.2 4.6 1.5 5.5 4z" fill={color} />
          </G>
        </Svg>
      )
    case 'bolt': // 雷（ブランドモチーフ）
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" fill={color} />
        </Svg>
      )
  }
}

import Svg, { Circle, Ellipse, Path, G } from 'react-native-svg'
import { PieceType } from '../../../engines/goita/types'

interface Props {
  type: PieceType
  size?: number
  color?: string
}

const CX = 12
const CY = 13
const R = 6

/**
 * 駒の種類ごとの動物アイコン（単色・顔シルエット）。
 * 耳・角・たてがみ等、1〜2の特徴で動物を見分けられるようにしている。
 */
export function PieceIcon({ type, size = 24, color = '#3e2723' }: Props) {
  const p = { stroke: color, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const
  const face = <Circle cx={CX} cy={CY} r={R} {...p} />
  const eyes = (
    <>
      <Circle cx={CX - 2.3} cy={CY - 0.6} r="0.9" fill={color} />
      <Circle cx={CX + 2.3} cy={CY - 0.6} r="0.9" fill={color} />
    </>
  )

  switch (type) {
    case 'king': // ライオン: 放射状のたてがみ
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Path d="M5.5 8 7.5 10.5M18.5 8 16.5 10.5M4 13.5h2.5M19.5 13.5H17M6 18.5 8 16M18 18.5 16 16M9.3 4.5 10.3 7.5M14.7 4.5 13.7 7.5M12 3.5V7" />
          </G>
          {face}
          {eyes}
          <Path d="M11 15.3h2l-1 1.3z" fill={color} />
        </Svg>
      )
    case 'rook': // ワシ: 鋭いくちばし＋逆立った羽角
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          {face}
          {eyes}
          <Path d="M9 4 10.5 8M15 4 13.5 8" {...p} />
          <Path d="M10.5 14.5h3l-1.5 3z" fill={color} />
        </Svg>
      )
    case 'bishop': // シカ: 枝分かれした角
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Path d="M9 7 8 2M8 4 6 3M8 2 6.5 1.5" />
            <Path d="M15 7 16 2M16 4 18 3M16 2 17.5 1.5" />
          </G>
          {face}
          {eyes}
          <Ellipse cx={CX} cy={CY + 2.6} rx="1.1" ry="0.7" fill={color} />
        </Svg>
      )
    case 'gold': // トラ: 三角の耳＋頬の縞模様
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Path d="M7.5 8 6 4 10 6.5z" />
            <Path d="M16.5 8 18 4 14 6.5z" />
            <Path d="M6.5 12.5 8.5 14M17.5 12.5 15.5 14" />
          </G>
          {face}
          {eyes}
          <Ellipse cx={CX} cy={CY + 2.6} rx="1.1" ry="0.7" fill={color} />
        </Svg>
      )
    case 'silver': // オオカミ: 大きく尖った耳＋長い鼻先
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Path d="M6.5 7.5 4.5 2.5 9.5 6z" />
            <Path d="M17.5 7.5 19.5 2.5 14.5 6z" />
          </G>
          <Circle cx={CX} cy={CY - 0.5} r={R} {...p} />
          {eyes}
          <Ellipse cx={CX} cy={CY + 4} rx="2.2" ry="1.6" {...p} />
          <Circle cx={CX} cy={CY + 4} r="0.7" fill={color} />
        </Svg>
      )
    case 'knight': // ウマ: 長い顔＋立った耳＋前髪
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Ellipse cx={CX} cy={CY + 1} rx="5" ry="7" {...p} />
          <G {...p}>
            <Path d="M9 6.5 8.5 2.5 11 5.5" />
            <Path d="M15 6.5 15.5 2.5 13 5.5" />
            <Path d="M12 4v3" />
          </G>
          {eyes}
          <Ellipse cx={CX} cy={CY + 4.5} rx="1" ry="1.4" fill={color} />
        </Svg>
      )
    case 'lance': // ヘビ: S字の身体＋舌
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M16 4c2 2-3 4-3 7s5 5 3 8" {...p} />
          <Circle cx={CX} cy={CY - 4.5} r="3.2" {...p} />
          <Circle cx={CX - 1.1} cy={CY - 5} r="0.7" fill={color} />
          <Circle cx={CX + 1.1} cy={CY - 5} r="0.7" fill={color} />
          <Path d="M9.6 9.5 7 12M9.6 9.5 8 10.5" {...p} />
        </Svg>
      )
    case 'pawn': // ネズミ: 大きな丸い耳＋ひげ
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Circle cx={CX - 4.5} cy={CY - 4} r="2.6" />
            <Circle cx={CX + 4.5} cy={CY - 4} r="2.6" />
          </G>
          {face}
          {eyes}
          <Path d="M12 13.5 14.5 12.8M12 13.5 14.5 14.2M12 13.5 9.5 12.8M12 13.5 9.5 14.2" {...p} />
          <Ellipse cx={CX} cy={CY + 1.8} rx="0.8" ry="0.6" fill={color} />
        </Svg>
      )
    case 'shi': // ネコ: 三角の耳＋ひげ
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Path d="M8 8 6.5 3.5 10.5 6.5z" />
            <Path d="M16 8 17.5 3.5 13.5 6.5z" />
          </G>
          {face}
          {eyes}
          <Path d="M9.5 14.5 6.5 14M9.5 15.5 6.5 16M14.5 14.5 17.5 14M14.5 15.5 17.5 16" {...p} />
          <Path d="M11.2 15h1.6l-0.8 1z" fill={color} />
        </Svg>
      )
    case 'do': // イヌ: 垂れた耳
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Ellipse cx={CX - 6.2} cy={CY + 1} rx="2.2" ry="3.6" />
            <Ellipse cx={CX + 6.2} cy={CY + 1} rx="2.2" ry="3.6" />
          </G>
          {face}
          {eyes}
          <Ellipse cx={CX} cy={CY + 2.6} rx="1.3" ry="1" fill={color} />
        </Svg>
      )
    case 'ne': // ウサギ: 長い立ち耳
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Ellipse cx={CX - 2.4} cy={CY - 7} rx="1.6" ry="4.2" />
            <Ellipse cx={CX + 2.4} cy={CY - 7} rx="1.6" ry="4.2" />
          </G>
          {face}
          {eyes}
          <Path d="M11 15.3h2l-1 1.3z" fill={color} />
        </Svg>
      )
    case 'hi': // ヒツジ: もくもくした毛
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Circle cx={CX - 5} cy={CY - 4} r="2" />
            <Circle cx={CX} cy={CY - 6} r="2.2" />
            <Circle cx={CX + 5} cy={CY - 4} r="2" />
            <Circle cx={CX - 3} cy={CY - 1.5} r="1.8" />
            <Circle cx={CX + 3} cy={CY - 1.5} r="1.8" />
          </G>
          <Circle cx={CX} cy={CY + 1} r="4.5" {...p} />
          <Circle cx={CX - 1.7} cy={CY + 0.5} r="0.8" fill={color} />
          <Circle cx={CX + 1.7} cy={CY + 0.5} r="0.8" fill={color} />
          <Ellipse cx={CX} cy={CY + 2.6} rx="0.9" ry="0.6" fill={color} />
        </Svg>
      )
    case 'ko': // コアラ: 非常に大きな丸い耳
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Circle cx={CX - 6} cy={CY - 2.5} r="3.2" />
            <Circle cx={CX + 6} cy={CY - 2.5} r="3.2" />
          </G>
          {face}
          {eyes}
          <Ellipse cx={CX} cy={CY + 2.8} rx="1.6" ry="1.1" fill={color} />
        </Svg>
      )
    case 'sa': // サル: 大きな顔の中の小さな顔（中央が白い）＋小さな耳
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <G {...p}>
            <Circle cx={CX - 5.5} cy={CY} r="2" />
            <Circle cx={CX + 5.5} cy={CY} r="2" />
          </G>
          {face}
          <Ellipse cx={CX} cy={CY + 0.8} rx="3.6" ry="4.2" {...p} />
          {eyes}
          <Path d="M10 15.5q2 1.5 4 0" {...p} />
        </Svg>
      )
  }
}

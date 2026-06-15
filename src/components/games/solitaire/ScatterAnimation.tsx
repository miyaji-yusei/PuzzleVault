import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native'
import { radii } from '../../../theme'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const SUITS = ['♠', '♥', '♦', '♣']
const CARD_COLORS = ['#1A1A1A', '#C9483B', '#C9483B', '#1A1A1A']
const SCATTER_COUNT = 8
const SCATTER_VISIBLE_MS = 1500

function makeScatterCards() {
  return Array.from({ length: SCATTER_COUNT }, (_, i) => ({
    suit: SUITS[i % 4] as string,
    color: CARD_COLORS[i % 4] as string,
    tx: (Math.random() - 0.5) * SCREEN_W * 1.6,
    ty: (Math.random() - 0.5) * SCREEN_H * 1.6,
    rotate: (Math.random() - 0.5) * 720,
  }))
}

export interface ScatterAnimationRef {
  /** クリア時のカード散布アニメーションを再生する */
  play: () => void
}

/** クリア時に画面いっぱいにカードが散らばるアニメーション */
export const ScatterAnimation = forwardRef<ScatterAnimationRef>(function ScatterAnimation(_props, ref) {
  const scatterAnims = useRef(
    Array.from({ length: SCATTER_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current
  const scatterCards = useRef(makeScatterCards()).current
  const [visible, setVisible] = useState(false)

  useImperativeHandle(ref, () => ({
    play: () => {
      setVisible(true)
      scatterAnims.forEach((anim, i) => {
        anim.x.setValue(0)
        anim.y.setValue(0)
        anim.opacity.setValue(0)
        anim.rotate.setValue(0)
        Animated.parallel([
          Animated.timing(anim.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(anim.x, { toValue: scatterCards[i]!.tx, duration: 1200, useNativeDriver: true }),
          Animated.timing(anim.y, { toValue: scatterCards[i]!.ty, duration: 1200, useNativeDriver: true }),
          Animated.timing(anim.rotate, { toValue: scatterCards[i]!.rotate, duration: 1200, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(900),
            Animated.timing(anim.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ]).start()
      })
      setTimeout(() => setVisible(false), SCATTER_VISIBLE_MS)
    },
  }), [scatterAnims, scatterCards])

  if (!visible) return null

  return (
    <View style={styles.scatterOverlay} pointerEvents="none">
      {scatterAnims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.scatterCard,
            {
              opacity: anim.opacity,
              transform: [
                { translateX: anim.x },
                { translateY: anim.y },
                { rotate: anim.rotate.interpolate({ inputRange: [-720, 720], outputRange: ['-720deg', '720deg'] }) },
              ],
            },
          ]}
        >
          <Text style={[styles.scatterSuit, { color: scatterCards[i]!.color }]}>
            {scatterCards[i]!.suit}
          </Text>
        </Animated.View>
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  scatterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  scatterCard: {
    position: 'absolute',
    width: 44,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scatterSuit: {
    fontSize: 28,
    fontWeight: 'bold',
  },
})

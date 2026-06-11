import { ReactNode, useEffect, useRef } from 'react'
import { Modal, View, Text, Animated, StyleSheet } from 'react-native'
import { vault, gold, ink, fontSize, radii, shadows } from '../../theme'
import { Button } from './Button'

export interface DialogAction {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger'
}

interface Props {
  visible: boolean
  title: string
  message?: string
  /** タイトル上の装飾（アイコン等） */
  icon?: ReactNode
  actions: DialogAction[]
  children?: ReactNode
}

/** スプリングポップインするモーダルダイアログ（クリア/ゲームオーバー/確認 共通基盤） */
export function AppDialog({ visible, title, message, icon, actions, children }: Props) {
  const scale = useRef(new Animated.Value(0.8)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      scale.setValue(0.8)
      opacity.setValue(0)
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start()
    }
  }, [visible, scale, opacity])

  return (
    <Modal visible={visible} transparent animationType="fade" supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.dialog, shadows.dialog, { opacity, transform: [{ scale }] }]}>
          {icon}
          <Text style={styles.title}>{title}</Text>
          {message != null && <Text style={styles.message}>{message}</Text>}
          {children}
          <View style={styles.buttons}>
            {actions.map((a) => (
              <Button key={a.label} label={a.label} onPress={a.onPress} variant={a.variant ?? 'primary'} />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: vault.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: gold.deep,
    padding: 24,
    width: 300,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: ink.strong,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: { fontSize: fontSize.base, color: ink.body, textAlign: 'center' },
  buttons: { marginTop: 20, gap: 10, width: '100%' },
})

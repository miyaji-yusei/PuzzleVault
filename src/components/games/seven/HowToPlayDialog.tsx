import { useEffect, useState } from 'react'
import { AppDialog, DialogAction } from '../../ui'

interface Props {
  visible: boolean
  onClose: () => void
}

const PAGES = [
  {
    title: '遊び方 (1/3) 目的',
    message:
      'あなたとAIで7枚の手札を持って対戦します。\n\n手札の合計（ジョーカー＝0点、A〜Kは数字どおり）が7以下になったら、その時点で即勝利です。',
  },
  {
    title: '遊び方 (2/3) 手番の流れ',
    message:
      '①同じランクのカードを1枚以上まとめて捨て札に置きます。\n\n②山札（裏向き）または捨て札の一番上（自分が出す直前に見えていたカード）のどちらかから1枚引きます。',
  },
  {
    title: '遊び方 (3/3) 勝敗',
    message:
      '引いた後の手札合計が7以下なら、その場で勝利になります。\n\n先に7以下にできた方が勝ちです。手札の合計をよく見て、何を捨てるか考えましょう！',
  },
]

/** Seven の遊び方を3ページで説明するダイアログ */
export function HowToPlayDialog({ visible, onClose }: Props) {
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (visible) setPage(0)
  }, [visible])

  const isFirst = page === 0
  const isLast = page === PAGES.length - 1

  const actions: DialogAction[] = []
  if (!isFirst) {
    actions.push({ label: '戻る', onPress: () => setPage((p) => p - 1), variant: 'secondary' })
  }
  actions.push({
    label: isLast ? '閉じる' : '次へ',
    onPress: () => (isLast ? onClose() : setPage((p) => p + 1)),
  })

  return <AppDialog visible={visible} title={PAGES[page].title} message={PAGES[page].message} actions={actions} />
}

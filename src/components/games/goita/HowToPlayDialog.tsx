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
      '2対2のチーム戦です。あなたと向かい側の「相方」がチームになります。\n\nチームのどちらかが先に手札をすべて出し切れば、そのチームの勝利です。',
  },
  {
    title: '遊び方 (2/3) 駒の出し方',
    message:
      '自分の番では、手札から駒を1枚選んで「出す」を押します。\n\n次の人から順に、出された駒と同じ動物の駒を持っていれば、それを出して受け取ることができます。受け取った人が次の手番になります。',
  },
  {
    title: '遊び方 (3/3) 流れるとき',
    message:
      '誰も同じ動物の駒を持っていない場合は流れて、出した人がもう一度駒を出します。\n\n強い動物（ライオン・ワシなど）ほど持っている人が少なく、受けられにくい駒です。先に手札を出し切ったプレイヤーのチームが勝ちです！',
  },
]

/** ごいたの遊び方を3ページで説明するダイアログ */
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

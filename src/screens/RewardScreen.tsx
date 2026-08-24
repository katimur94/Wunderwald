import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BigButton } from '../components/BigButton'
import { Funkel } from '../world/Funkel'
import { StarCounter } from '../components/StarCounter'
import { useActiveChild } from '../store/useApp'
import { sfx } from '../audio/AudioManager'
import type { Milestone } from '../learning/adaptivity'
import { Confetti } from '../components/Confetti'
import './RewardScreen.css'

interface Props {
  stars: number
  correct: number
  total: number
  milestone: Milestone | null
  onAgain: () => void
  onForest: () => void
  onMap: () => void
}

/** Belohnungsscreen: die verdienten Sterne fliegen animiert in den Zähler. */
export function RewardScreen({ stars, correct, total, milestone, onAgain, onForest, onMap }: Props) {
  const child = useActiveChild()
  const [flown, setFlown] = useState(0)

  useEffect(() => {
    if (flown >= stars) return
    const t = setTimeout(() => {
      setFlown((n) => n + 1)
      sfx('star')
    }, 240 + flown * 90)
    return () => clearTimeout(t)
  }, [flown, stars])

  const counterValue = (child?.stars ?? 0) - stars + flown

  return (
    <main className="ww-reward">
      <Confetti active />
      <div className="ww-reward__counter">
        <StarCounter stars={counterValue} size="l" bump={flown > 0} />
      </div>

      <Funkel state="jubelt" size={150} outfitId={child?.companion.outfitId ?? null} />

      <h1 className="ww-reward__head">
        {correct === total ? 'Alles richtig!' : correct >= total / 2 ? 'Gut gemacht!' : 'Geschafft!'}
      </h1>
      <p className="ww-reward__score">
        {correct} von {total} richtig
      </p>

      {milestone && (
        <motion.div
          className="ww-reward__milestone"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 180 }}
        >
          <span aria-hidden="true">🏅</span>
          <div>
            <strong>Neuer Titel: {milestone.title}</strong>
            <p className="ww-hint">+{milestone.bonusStars} Extra-Sterne</p>
          </div>
        </motion.div>
      )}

      <div className="ww-reward__flight" aria-hidden="true">
        {Array.from({ length: stars }, (_, i) => (
          <motion.span
            key={i}
            className="ww-reward__star"
            initial={{ opacity: 0, y: 30, scale: 0.4 }}
            animate={
              i < flown
                ? { opacity: 0, y: -260, scale: 0.5 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            ⭐
          </motion.span>
        ))}
      </div>

      <div className="ww-reward__actions">
        <BigButton size="xl" tone="sonne" full onClick={onAgain}>
          Nochmal
        </BigButton>
        <BigButton size="l" tone="blatt" full onClick={onForest}>
          In meinen Wald
        </BigButton>
        <BigButton size="l" tone="papier" full onClick={onMap}>
          Zur Karte
        </BigButton>
      </div>
    </main>
  )
}

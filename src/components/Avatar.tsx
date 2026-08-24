import './Avatar.css'

export interface AvatarDef {
  id: string
  name: string
  emoji: string
  color: string
}

/** Acht Tiere zur Auswahl – kein Klarname nötig, das Tier ist die Identität. */
export const AVATARS: AvatarDef[] = [
  { id: 'fuchs', name: 'Fuchs', emoji: '🦊', color: '#E4634F' },
  { id: 'igel', name: 'Igel', emoji: '🦔', color: '#B98A5E' },
  { id: 'eule', name: 'Eule', emoji: '🦉', color: '#9A7FC9' },
  { id: 'hase', name: 'Hase', emoji: '🐰', color: '#6FB5C9' },
  { id: 'baer', name: 'Bär', emoji: '🐻', color: '#8E6842' },
  { id: 'frosch', name: 'Frosch', emoji: '🐸', color: '#7FB069' },
  { id: 'biene', name: 'Biene', emoji: '🐝', color: '#F6BD41' },
  { id: 'reh', name: 'Reh', emoji: '🦌', color: '#2F6B4F' },
]

export function avatarOf(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]
}

interface Props {
  avatarId: string
  size?: number
  className?: string
}

/** Runder Button-Kopf mit Tier-Emoji auf gemalter Scheibe. */
export function Avatar({ avatarId, size = 88, className = '' }: Props) {
  const a = avatarOf(avatarId)
  return (
    <span
      className={`ww-avatar ${className}`}
      style={{ width: size, height: size, background: a.color, fontSize: size * 0.55 }}
      role="img"
      aria-label={a.name}
    >
      <span aria-hidden="true">{a.emoji}</span>
    </span>
  )
}

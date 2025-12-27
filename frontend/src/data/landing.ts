import type { LucideIcon } from 'lucide-react'
import { Check, Globe, Shield } from 'lucide-react'

export type ValueProp = {
  icon: LucideIcon
  title: string
  desc: string
}

export const valueProps: ValueProp[] = [
  {
    icon: Shield,
    title: '100% Transparent',
    desc: 'Every donation is verified on the blockchain, so you know exactly where funds go.',
  },
  {
    icon: Globe,
    title: 'Global Impact',
    desc: 'Support communities across borders without intermediaries taking a cut.',
  },
  {
    icon: Check,
    title: 'Guaranteed Results',
    desc: 'Smart contracts ensure funds are only used when project goals are met.',
  },
]

export type FeaturedCause = {
  id: string
  title: string
  summary: string
  category: string
  raisedEth: number
  goalEth: number
  daysLeft: number
  donors: number
  imageSeed: string
}

export const featuredCauses: FeaturedCause[] = [
  {
    id: '1',
    title: 'Clean Water for Village 1',
    summary: 'Providing sustainable filtration systems for rural communities in need of clean drinking water.',
    category: 'Humanitarian',
    raisedEth: 4.5,
    goalEth: 10,
    daysLeft: 12,
    donors: 142,
    imageSeed: 'cause1',
  },
  {
    id: '2',
    title: 'Clean Water for Village 2',
    summary: 'Expanding access to safe wells and filtration for families facing drought and contamination.',
    category: 'Humanitarian',
    raisedEth: 4.5,
    goalEth: 10,
    daysLeft: 12,
    donors: 142,
    imageSeed: 'cause2',
  },
  {
    id: '3',
    title: 'Clean Water for Village 3',
    summary: 'Delivering community-managed water systems with sustainable maintenance plans.',
    category: 'Humanitarian',
    raisedEth: 4.5,
    goalEth: 10,
    daysLeft: 12,
    donors: 142,
    imageSeed: 'cause3',
  },
]

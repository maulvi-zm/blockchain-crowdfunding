export type CampaignListingItem = {
  id: string
  title: string
  description: string
  raised: number
  goal: number
  avatarSeed: string
  daysLeft: number
  isTrending: boolean
  badgeType: 'success' | 'primary'
  badgeLabel: string
  imageSeed: string
  organizer: string
}

export const campaigns: CampaignListingItem[] = [
  {
    id: '1',
    title: 'Community Solar Power Initiative 1',
    description: 'Help us install solar panels on community centers to reduce costs and carbon footprint.',
    raised: 14200,
    goal: 20000,
    avatarSeed: 'avatar1',
    daysLeft: 15,
    isTrending: false,
    badgeType: 'primary',
    badgeLabel: 'Urgent',
    imageSeed: 'cause11',
    organizer: 'Sarah J.',
  },
  {
    id: '2',
    title: 'Community Solar Power Initiative 2',
    description: 'Bring clean energy to shared spaces with long-term savings for local programs.',
    raised: 16800,
    goal: 20000,
    avatarSeed: 'avatar2',
    daysLeft: 18,
    isTrending: false,
    badgeType: 'success',
    badgeLabel: 'Tax Deductible',
    imageSeed: 'cause12',
    organizer: 'Sarah J.',
  },
  {
    id: '3',
    title: 'Community Solar Power Initiative 3',
    description: 'Upgrade facilities with solar to cut emissions and power after-school programs.',
    raised: 15200,
    goal: 20000,
    avatarSeed: 'avatar3',
    daysLeft: 14,
    isTrending: true,
    badgeType: 'primary',
    badgeLabel: 'Urgent',
    imageSeed: 'cause13',
    organizer: 'Sarah J.',
  },
  {
    id: '4',
    title: 'Community Solar Power Initiative 4',
    description: 'Support renewable energy installations that keep community centers running.',
    raised: 12200,
    goal: 20000,
    avatarSeed: 'avatar4',
    daysLeft: 19,
    isTrending: false,
    badgeType: 'success',
    badgeLabel: 'Tax Deductible',
    imageSeed: 'cause14',
    organizer: 'Sarah J.',
  },
  {
    id: '5',
    title: 'Community Solar Power Initiative 5',
    description: 'Provide reliable clean power for community shelters and kitchens.',
    raised: 13200,
    goal: 20000,
    avatarSeed: 'avatar5',
    daysLeft: 16,
    isTrending: false,
    badgeType: 'primary',
    badgeLabel: 'Urgent',
    imageSeed: 'cause15',
    organizer: 'Sarah J.',
  },
  {
    id: '6',
    title: 'Community Solar Power Initiative 6',
    description: 'Lower energy costs so more funding goes to programs and services.',
    raised: 18600,
    goal: 20000,
    avatarSeed: 'avatar6',
    daysLeft: 12,
    isTrending: true,
    badgeType: 'success',
    badgeLabel: 'Tax Deductible',
    imageSeed: 'cause16',
    organizer: 'Sarah J.',
  },
]

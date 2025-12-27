export type ContributionStatus = 'active' | 'success' | 'ended'

export type Contribution = {
  id: string
  title: string
  date: string
  amountEth: number
  status: ContributionStatus
  imageSeed: string
}

export const contributions: Contribution[] = [
  {
    id: '1',
    title: 'Clean Water Initiative 1',
    date: 'Oct 12, 2024',
    amountEth: 2.5,
    status: 'active',
    imageSeed: 'cause21',
  },
  {
    id: '2',
    title: 'Clean Water Initiative 2',
    date: 'Oct 12, 2024',
    amountEth: 2.5,
    status: 'success',
    imageSeed: 'cause22',
  },
  {
    id: '3',
    title: 'Clean Water Initiative 3',
    date: 'Oct 12, 2024',
    amountEth: 2.5,
    status: 'ended',
    imageSeed: 'cause23',
  },
]

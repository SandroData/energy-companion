export type TimeBucket = 'morning' | 'afternoon' | 'evening'


export function bucketByTimeOfDay(dateOrISO: string | Date): TimeBucket {
const d = typeof dateOrISO === 'string' ? new Date(dateOrISO) : dateOrISO
const h = d.getHours()
if (h < 12) return 'morning'
if (h < 18) return 'afternoon'
return 'evening'
}
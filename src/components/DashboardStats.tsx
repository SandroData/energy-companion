'use client'
import React from 'react'


type Stat = { label: string; value: string }


export function DashboardStats({ stats }: { stats: Stat[] }) {
return (
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
{stats.map((s) => (
<div key={s.label} className="p-4 bg-white border rounded-xl shadow-sm text-gray-900">
<div className="text-sm text-gray-500">{s.label}</div>
<div className="mt-1 text-2xl font-bold">{s.value}</div>
</div>
))}
</div>
)
}
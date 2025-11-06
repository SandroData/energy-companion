'use client'
import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Row = { name: string; count: number }

export default function TimeOfDayBar({ data }: { data: Row[] }) {
  return (
    <div className="p-4 bg-white border rounded-xl shadow-sm text-gray-900">
      <div className="mb-2 text-sm text-gray-500">Activities by time of day (last 60 days)</div>
      {/* 👇 make sure container has size */}
      <div className="w-full h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

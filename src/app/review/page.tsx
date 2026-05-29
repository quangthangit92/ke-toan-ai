'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Entry = {
  id: string
  entry_date: string
  description: string
  debit_account: string
  credit_account: string
  amount: number
  confidence: number
  ai_note: string
  status: 'pending' | 'approved' | 'rejected'
  invoice_id: string
  customer_id: string
  customers: { name: string }
  invoices: { invoice_number: string; invoice_type: string }
}

export default function ReviewPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => { fetchEntries() }, [filter])

  async function fetchEntries() {
    setLoading(true)
    const { data } = await supabase
      .from('journal_entries')
      .select('*, customers(name), invoices(invoice_number, invoice_type)')
      .eq('status', filter)
      .order('entry_date', { ascending: false })
    setEntries((data as Entry[]) || [])
    console.log('data:', data)
console.log('filter:', filter)
    setLoading(false)
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setSaving(id)
    await supabase.from('journal_entries').update({ status }).eq('id', id)
    setSaving(null)
    fetchEntries()
  }

  async function approveAll() {
    setSaving('all')
    const ids = entries.filter(e => e.status === 'pending').map(e => e.id)
    for (const id of ids) {
      await supabase.from('journal_entries').update({ status: 'approved' }).eq('id', id)
    }
    setSaving(null)
    fetchEntries()
  }

  const formatMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n)
  const pendingCount = entries.length

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kiểm duyệt bút toán</h1>
            <p className="text-gray-500 text-sm mt-1">Xem xét và duyệt bút toán AI đề xuất</p>
          </div>
          <div className="flex gap-3">
            <a href="/" className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">← Khách hàng</a>
            {filter === 'pending' && entries.length > 0 && (
              <button
                onClick={approveAll}
                disabled={saving === 'all'}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving === 'all' ? 'Đang duyệt...' : `✅ Duyệt tất cả (${pendingCount})`}
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s === 'pending' ? '⏳ Chờ duyệt' : s === 'approved' ? '✅ Đã duyệt' : '❌ Từ chối'}
            </button>
          ))}
        </div>

        {/* Bảng bút toán */}
        {loading ? (
          <p className="text-gray-400 text-center py-12">Đang tải...</p>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-lg">Không có bút toán nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Khách hàng</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Diễn giải</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Nợ</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Có</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Số tiền</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Tin cậy</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <React.Fragment key={e.id}>
                    <tr className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${e.ai_note ? 'border-l-2 border-yellow-400' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{e.customers?.name}</p>
                        <p className="text-xs text-gray-400">HĐ: {e.invoices?.invoice_number}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs">
                        <p>{e.description}</p>
                        <p className="text-xs text-gray-400">{e.entry_date}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-blue-700">{e.debit_account}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-600">{e.credit_account}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(e.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          e.confidence >= 85 ? 'bg-green-50 text-green-700' :
                          e.confidence >= 70 ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {e.confidence}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {filter === 'pending' && (
                          <div className="flex gap-2">
                            <button
  onClick={() => updateStatus(e.id, 'approved')}
  disabled={saving === e.id}
  className="px-3 py-1 text-xs bg-green-100 text-green-800 border border-green-400 rounded font-medium hover:bg-green-200 disabled:opacity-50"
>
  {saving === e.id ? '...' : '✅ Duyệt'}
</button>
<button
  onClick={() => updateStatus(e.id, 'rejected')}
  disabled={saving === e.id}
  className="px-3 py-1 text-xs bg-red-100 text-red-700 border border-red-400 rounded font-medium hover:bg-red-200 disabled:opacity-50"
>
  ❌ Từ chối
</button>
                          </div>
                        )}
                        {filter === 'approved' && <span className="text-xs text-green-600">✅ Đã duyệt</span>}
                        {filter === 'rejected' && <span className="text-xs text-red-500">❌ Từ chối</span>}
                      </td>
                    </tr>
                    {e.ai_note && (
                      <tr className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td colSpan={7} className="px-4 pb-3">
                          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-1.5 text-xs text-yellow-700">
                            {e.ai_note}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
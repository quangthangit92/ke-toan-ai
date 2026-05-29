'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Customer } from '@/lib/supabase'

type Period = {
  id: string
  period: string
  status: 'open' | 'reviewing' | 'closed'
  created_at: string
}

export default function CustomerDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newPeriod, setNewPeriod] = useState('')

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('accounting_periods').select('*').eq('customer_id', id).order('period', { ascending: false })
    ])
    setCustomer(c)
    setPeriods(p || [])
    setLoading(false)
  }

  async function addPeriod() {
    if (!newPeriod) return alert('Vui lòng chọn kỳ kế toán')
    const { error } = await supabase.from('accounting_periods').insert([{
      customer_id: id,
      period: newPeriod,
      status: 'open'
    }])
    if (error) return alert('Lỗi: ' + error.message)
    setShowForm(false)
    setNewPeriod('')
    fetchData()
  }

  const statusLabel: Record<string, { label: string; color: string }> = {
    open: { label: 'Đang mở', color: 'bg-green-50 text-green-700' },
    reviewing: { label: 'Đang duyệt', color: 'bg-yellow-50 text-yellow-700' },
    closed: { label: 'Đã chốt', color: 'bg-gray-100 text-gray-500' },
  }

  if (loading) return <div className="p-8 text-gray-400">Đang tải...</div>
  if (!customer) return <div className="p-8 text-gray-400">Không tìm thấy khách hàng</div>

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 text-sm">← Quay lại</button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 text-sm">{customer.name}</span>
        </div>

        {/* Thông tin khách hàng */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              <p className="text-gray-500 text-sm mt-1">MST: {customer.tax_code}</p>
            </div>
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
              {customer.accounting_regime === 'tt133' ? 'Thông tư 133' : 'Thông tư 200'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Loại hình</p>
              <p className="text-sm text-gray-700 mt-0.5">{customer.business_type?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Ngành nghề</p>
              <p className="text-sm text-gray-700 mt-0.5">{customer.industry?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Liên hệ</p>
              <p className="text-sm text-gray-700 mt-0.5">{customer.phone || customer.email || '—'}</p>
            </div>
          </div>
        </div>

        {/* Kỳ kế toán */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Kỳ kế toán</h2>
          <div className="flex gap-3">
            
             <a href={`/customers/${id}/ledger`} className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 bg-white rounded-lg hover:bg-blue-50">📒 Xem sổ</a>
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              + Thêm kỳ
            </button>
          </div>
        </div>

        {/* Form thêm kỳ */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Chọn kỳ kế toán</p>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Tháng/Năm</label>
                <input
                  type="month"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={newPeriod}
                  onChange={e => setNewPeriod(e.target.value)}
                />
              </div>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg">Huỷ</button>
              <button onClick={addPeriod} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg">Tạo kỳ</button>
            </div>
          </div>
        )}

        {/* Danh sách kỳ */}
        {periods.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-400">Chưa có kỳ kế toán nào</p>
            <p className="text-gray-300 text-sm mt-1">Bấm "+ Thêm kỳ" để tạo kỳ đầu tiên</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Kỳ</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Ngày tạo</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.period}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusLabel[p.status].color}`}>
                        {statusLabel[p.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(p.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/customers/${id}/periods/${p.id}`} className="text-blue-600 hover:underline text-xs">Upload hoá đơn →</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
'use client'
import * as XLSX from 'xlsx'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Entry = {
  id: string
  entry_date: string
  description: string
  debit_account: string
  credit_account: string
  amount: number
  confidence: number
  invoices: { invoice_number: string; invoice_type: string }
}

type Period = {
  id: string
  period: string
  status: string
}

export default function LedgerPage() {
  const { id } = useParams()
  const router = useRouter()
  const [entries, setEntries] = useState<Entry[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [id])
  useEffect(() => { fetchEntries() }, [selectedPeriod])

  async function fetchData() {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('customers').select('name').eq('id', id).single(),
      supabase.from('accounting_periods').select('*').eq('customer_id', id).order('period', { ascending: false })
    ])
    setCustomerName(c?.name || '')
    setPeriods(p || [])
    setLoading(false)
  }

  async function fetchEntries() {
    let query = supabase
      .from('journal_entries')
      .select('*, invoices(invoice_number, invoice_type)')
      .eq('customer_id', id)
      .eq('status', 'approved')
      .order('entry_date', { ascending: true })

    if (selectedPeriod !== 'all') {
      query = query.eq('period_id', selectedPeriod)
    }

    const { data } = await query
    setEntries((data as Entry[]) || [])
  }

  const formatMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n)
  const totalDebit = entries.reduce((sum, e) => sum + e.amount, 0)
function exportExcel() {
  const data = entries.map((e, i) => ({
    'STT': i + 1,
    'Ngày': e.entry_date,
    'Số HĐ': e.invoices?.invoice_number || '',
    'Diễn giải': e.description,
    'Tài khoản Nợ': e.debit_account,
    'Tài khoản Có': e.credit_account,
    'Số tiền': e.amount,
  }))

  // Thêm dòng tổng cộng
  data.push({
    'STT': 0,
    'Ngày': '',
    'Số HĐ': '',
    'Diễn giải': 'TỔNG CỘNG',
    'Tài khoản Nợ': '',
    'Tài khoản Có': '',
    'Số tiền': totalDebit,
  })

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'So nhat ky')

  // Độ rộng cột
  ws['!cols'] = [
    { wch: 5 },   // STT
    { wch: 12 },  // Ngày
    { wch: 15 },  // Số HĐ
    { wch: 50 },  // Diễn giải
    { wch: 15 },  // TK Nợ
    { wch: 15 },  // TK Có
    { wch: 20 },  // Số tiền
  ]

  XLSX.writeFile(wb, `So_nhat_ky_${customerName}_${selectedPeriod}.xlsx`)
}
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Quay lại</button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 text-sm">{customerName}</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 text-sm">Sổ nhật ký</span>
        </div>

        {/* Bộ lọc kỳ */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center gap-4">
          <span className="text-sm text-gray-600 font-medium">Kỳ kế toán:</span>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
          >
            <option value="all">Tất cả</option>
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.period}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-4">
  <span className="text-sm text-gray-500">
    Tổng phát sinh: <span className="font-bold text-gray-900">{formatMoney(totalDebit)} đ</span>
  </span>
  <button
    onClick={exportExcel}
    disabled={entries.length === 0}
    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
  >
    ⬇ Tải Excel
  </button>
</div>
        </div>

        {/* Sổ nhật ký */}
        {loading ? (
          <p className="text-gray-400 text-center py-12">Đang tải...</p>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">Chưa có bút toán nào được duyệt</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Sổ nhật ký chung</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Ngày</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Số HĐ</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Diễn giải</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Nợ TK</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Có TK</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.entry_date}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{e.invoices?.invoice_number || '—'}</td>
                    <td className="px-4 py-3 text-gray-900">{e.description}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">{e.debit_account}</td>
<td className="px-4 py-3 text-center font-bold text-gray-900">{e.credit_account}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatMoney(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={5} className="px-4 py-3 font-semibold text-gray-900">Tổng cộng</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatMoney(totalDebit)} đ</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
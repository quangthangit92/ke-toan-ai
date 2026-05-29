'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { parseInvoiceXML, ParsedInvoice } from '@/lib/xmlParser'
import { generateJournalEntries, JournalSuggestion } from '@/lib/ruleEngine'

type Invoice = {
  id: string
  invoice_number: string
  invoice_date: string
  seller_name: string
  seller_tax_code: string
  total_amount: number
  tax_amount: number
  invoice_type: 'mua_vao' | 'ban_ra'
  payment_method: 'tien_mat' | 'chuyen_khoan'
  status: string
}

type Customer = {
  accounting_regime: 'tt133' | 'tt200'
  industry: 'thuong_mai' | 'dich_vu' | 'san_xuat'
}

export default function PeriodDetail() {
  const { id, periodId } = useParams()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<ParsedInvoice | null>(null)
  const [previewXml, setPreviewXml] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'chuyen_khoan' | 'tien_mat'>('chuyen_khoan')
  const [invoiceType, setInvoiceType] = useState<'mua_vao' | 'ban_ra'>('mua_vao')
  const [suggestions, setSuggestions] = useState<JournalSuggestion[]>([])
  const [savingEntries, setSavingEntries] = useState(false)

  useEffect(() => { fetchData() }, [periodId])

  async function fetchData() {
    const [{ data: c }, { data: inv }] = await Promise.all([
      supabase.from('customers').select('accounting_regime, industry').eq('id', id).single(),
      supabase.from('invoices').select('*').eq('period_id', periodId).order('invoice_date', { ascending: false })
    ])
    setCustomer(c)
    setInvoices(inv || [])
    setLoading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseInvoiceXML(text)
      if (parsed) {
        setPreview(parsed)
        setPreviewXml(text)
        setSuggestions([])
      } else {
        alert('Không đọc được file XML. Vui lòng kiểm tra lại định dạng.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function saveInvoice() {
    if (!preview) return
    setUploading(true)
    const { data, error } = await supabase.from('invoices').insert([{
      customer_id: id,
      period_id: periodId,
      invoice_number: preview.invoice_number,
      invoice_date: preview.invoice_date,
      seller_tax_code: preview.seller_tax_code,
      seller_name: preview.seller_name,
      buyer_tax_code: preview.buyer_tax_code,
      total_amount: Math.round(preview.total_amount),
      tax_amount: Math.round(preview.tax_amount),
      invoice_type: invoiceType,
      payment_method: paymentMethod,
      xml_raw: previewXml,
      status: 'pending',
    }]).select().single()
    setUploading(false)
    if (error) return alert('Lỗi lưu: ' + error.message)

    // Tự động generate bút toán
    if (customer) {
      const entries = generateJournalEntries({
        invoice: preview,
        invoice_type: invoiceType,
        payment_method: paymentMethod,
        total_amount: Math.round(preview.total_amount),
        tax_amount: Math.round(preview.tax_amount),
        accounting_regime: customer.accounting_regime,
        industry: customer.industry,
      })
      setSuggestions(entries)

      // Lưu bút toán vào database
      const journalRows = entries.map(e => ({
        customer_id: id,
        period_id: periodId,
        invoice_id: data.id,
        entry_date: preview.invoice_date || new Date().toISOString().split('T')[0],
        description: e.description,
        debit_account: e.debit_account,
        credit_account: e.credit_account,
        amount: e.amount,
        confidence: e.confidence,
        ai_note: e.ai_note,
        status: 'pending',
      }))
      await supabase.from('journal_entries').insert(journalRows)
    }

    setPreview(null)
    setPreviewXml('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    fetchData()
  }

  async function approveAll(invoiceId: string) {
    setSavingEntries(true)
    await supabase
      .from('journal_entries')
      .update({ status: 'approved' })
      .eq('invoice_id', invoiceId)
    setSavingEntries(false)
    fetchData()
  }

  const formatMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n)

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Quay lại</button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 text-sm">Kỳ kế toán</span>
        </div>

        {/* Upload zone */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Upload hoá đơn XML</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Loại hoá đơn</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={invoiceType} onChange={e => setInvoiceType(e.target.value as 'mua_vao' | 'ban_ra')}>
                <option value="mua_vao">Hoá đơn mua vào</option>
                <option value="ban_ra">Hoá đơn bán ra</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hình thức thanh toán</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as 'chuyen_khoan' | 'tien_mat')}>
                <option value="chuyen_khoan">Chuyển khoản</option>
                <option value="tien_mat">Tiền mặt</option>
              </select>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-3xl mb-2">📄</div>
            <p className="text-gray-600 text-sm font-medium">Bấm để chọn file XML hoá đơn điện tử</p>
            <p className="text-gray-400 text-xs mt-1">Định dạng .xml theo Nghị định 123/2020</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".xml" className="hidden" onChange={handleFileChange} />

          {/* Preview */}
          {preview && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">📋 Xem trước hoá đơn</p>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div><span className="text-gray-400">Số HĐ:</span> <span className="font-medium">{preview.invoice_number || '—'}</span></div>
                <div><span className="text-gray-400">Ngày:</span> <span className="font-medium">{preview.invoice_date || '—'}</span></div>
                <div><span className="text-gray-400">Người bán:</span> <span className="font-medium">{preview.seller_name || '—'}</span></div>
                <div><span className="text-gray-400">MST người bán:</span> <span className="font-medium">{preview.seller_tax_code || '—'}</span></div>
                <div><span className="text-gray-400">Tiền hàng:</span> <span className="font-medium text-blue-700">{formatMoney(Math.round(preview.total_amount - preview.tax_amount))} đ</span></div>
                <div><span className="text-gray-400">Thuế GTGT:</span> <span className="font-medium text-orange-600">{formatMoney(Math.round(preview.tax_amount))} đ</span></div>
              </div>

              {paymentMethod === 'tien_mat' && preview.total_amount > 20000000 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700 mb-3">
                  ⚠️ Hoá đơn trên 20 triệu thanh toán tiền mặt — <strong>không được khấu trừ thuế GTGT đầu vào</strong>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button onClick={() => { setPreview(null); setSuggestions([]) }} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg">Huỷ</button>
                <button onClick={saveInvoice} disabled={uploading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {uploading ? 'Đang xử lý...' : '⚡ Lưu & Hạch toán tự động'}
                </button>
              </div>
            </div>
          )}

          {/* Hiện bút toán vừa generate */}
          {suggestions.length > 0 && (
            <div className="mt-4 bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-sm font-medium text-green-800 mb-3">✅ Bút toán AI đề xuất</p>
              <div className="border border-green-200 rounded-lg overflow-hidden mb-3">
                <table className="w-full text-xs">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-green-700">Diễn giải</th>
                      <th className="text-center px-3 py-2 text-green-700">Nợ</th>
                      <th className="text-center px-3 py-2 text-green-700">Có</th>
                      <th className="text-right px-3 py-2 text-green-700">Số tiền</th>
                      <th className="text-center px-3 py-2 text-green-700">Tin cậy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((s, i) => (
                      <tr key={i} className="bg-white border-t border-green-100">
                        <td className="px-3 py-2">{s.description}</td>
                        <td className="px-3 py-2 text-center font-medium text-blue-700">{s.debit_account}</td>
                        <td className="px-3 py-2 text-center font-medium text-red-600">{s.credit_account}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(s.amount)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.confidence >= 85 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {s.confidence}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {suggestions.some(s => s.ai_note) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700 mb-3">
                  {suggestions.filter(s => s.ai_note).map((s, i) => <p key={i}>{s.ai_note}</p>)}
                </div>
              )}
              <p className="text-xs text-green-600">Bút toán đã lưu vào database, chờ kế toán viên duyệt.</p>
            </div>
          )}
        </div>

        {/* Danh sách hoá đơn */}
        <h2 className="font-semibold text-gray-900 mb-4">Hoá đơn đã upload ({invoices.length})</h2>
        {loading ? (
          <p className="text-gray-400 text-center py-8">Đang tải...</p>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-400">Chưa có hoá đơn nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Số HĐ</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Người bán</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Loại</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Tổng tiền</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Thuế</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.seller_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${inv.invoice_type === 'mua_vao' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                        {inv.invoice_type === 'mua_vao' ? 'Mua vào' : 'Bán ra'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">{formatMoney(inv.total_amount)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatMoney(inv.tax_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${inv.status === 'processed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {inv.status === 'processed' ? 'Đã hạch toán' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/review`} className="text-blue-600 hover:underline text-xs">Duyệt bút toán →</a>
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
'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, Customer } from '@/lib/supabase'

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    tax_code: '',
    business_type: 'cong_ty_tnhh',
    industry: 'thuong_mai',
    accounting_regime: 'tt133',
    email: '',
    phone: '',
    address: '',
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }

  async function addCustomer() {
    if (!form.name || !form.tax_code) return alert('Vui lòng nhập tên và MST')
    const { error } = await supabase.from('customers').insert([form])
    if (error) return alert('Lỗi: ' + error.message)
    setShowForm(false)
    setForm({ name: '', tax_code: '', business_type: 'cong_ty_tnhh', industry: 'thuong_mai', accounting_regime: 'tt133', email: '', phone: '', address: '' })
    fetchCustomers()
  }

  const businessTypeLabel: Record<string, string> = {
    ho_kinh_doanh: 'Hộ kinh doanh',
    cong_ty_tnhh: 'Công ty TNHH',
    cong_ty_cp: 'Công ty CP',
    tu_nhan: 'Doanh nghiệp tư nhân',
  }

  const industryLabel: Record<string, string> = {
    thuong_mai: 'Thương mại',
    dich_vu: 'Dịch vụ',
    san_xuat: 'Sản xuất',
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kế Toán AI</h1>
            <a href="/review" className="text-sm text-blue-600 hover:underline mt-1 block">→ Trang kiểm duyệt bút toán</a>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Thêm khách hàng
          </button>
        </div>

        {/* Form thêm khách hàng */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Thêm khách hàng mới</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Tên doanh nghiệp *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Công ty TNHH ABC" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Mã số thuế *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.tax_code} onChange={e => setForm({ ...form, tax_code: e.target.value })} placeholder="0123456789" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Loại hình</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.business_type} onChange={e => setForm({ ...form, business_type: e.target.value })}>
                  <option value="cong_ty_tnhh">Công ty TNHH</option>
                  <option value="cong_ty_cp">Công ty CP</option>
                  <option value="ho_kinh_doanh">Hộ kinh doanh</option>
                  <option value="tu_nhan">DN tư nhân</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Ngành nghề</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
                  <option value="thuong_mai">Thương mại</option>
                  <option value="dich_vu">Dịch vụ</option>
                  <option value="san_xuat">Sản xuất</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Chế độ kế toán</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.accounting_regime} onChange={e => setForm({ ...form, accounting_regime: e.target.value })}>
                  <option value="tt133">Thông tư 133</option>
                  <option value="tt200">Thông tư 200</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Email</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="abc@company.com" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Số điện thoại</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0901234567" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Địa chỉ</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Nguyễn Văn A, Q.1, TP.HCM" />
              </div>
            </div>
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Huỷ</button>
              <button onClick={addCustomer} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lưu khách hàng</button>
            </div>
          </div>
        )}

        {/* Danh sách */}
        {loading ? (
          <p className="text-gray-400 text-center py-12">Đang tải...</p>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">Chưa có khách hàng nào</p>
            <p className="text-gray-300 text-sm mt-1">Bấm "+ Thêm khách hàng" để bắt đầu</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Tên doanh nghiệp</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">MST</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Loại hình</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Ngành</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Chế độ</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.tax_code}</td>
                    <td className="px-4 py-3 text-gray-600">{businessTypeLabel[c.business_type]}</td>
                    <td className="px-4 py-3 text-gray-600">{industryLabel[c.industry]}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                        {c.accounting_regime === 'tt133' ? 'TT133' : 'TT200'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/customers/${c.id}`} className="text-blue-600 hover:underline text-xs">Vào sổ →</a>
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
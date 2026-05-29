import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Kiểu dữ liệu khớp với database
export type Customer = {
  id: string
  name: string
  tax_code: string
  business_type: 'ho_kinh_doanh' | 'cong_ty_tnhh' | 'cong_ty_cp' | 'tu_nhan'
  industry: 'thuong_mai' | 'dich_vu' | 'san_xuat'
  accounting_regime: 'tt133' | 'tt200'
  address: string
  email: string
  phone: string
  created_at: string
}

export type Invoice = {
  id: string
  customer_id: string
  period_id: string
  invoice_number: string
  invoice_date: string
  seller_tax_code: string
  seller_name: string
  total_amount: number
  tax_amount: number
  invoice_type: 'mua_vao' | 'ban_ra'
  payment_method: 'tien_mat' | 'chuyen_khoan'
  xml_raw: string
  status: 'pending' | 'processed' | 'error'
}

export type JournalEntry = {
  id: string
  customer_id: string
  period_id: string
  invoice_id: string
  entry_date: string
  description: string
  debit_account: string
  credit_account: string
  amount: number
  confidence: number
  ai_note: string
  status: 'pending' | 'approved' | 'rejected'
}

import { ParsedInvoice } from './xmlParser'

export type JournalSuggestion = {
  debit_account: string
  credit_account: string
  amount: number
  description: string
  confidence: number
  ai_note: string
}

type InvoiceContext = {
  invoice: ParsedInvoice
  invoice_type: 'mua_vao' | 'ban_ra'
  payment_method: 'tien_mat' | 'chuyen_khoan'
  total_amount: number
  tax_amount: number
  accounting_regime: 'tt133' | 'tt200'
  industry: 'thuong_mai' | 'dich_vu' | 'san_xuat'
}

// Bảng từ khoá → tài khoản
const KEYWORD_MAP: { keywords: string[]; debit: string; label: string }[] = [
  { keywords: ['văn phòng phẩm', 'bút', 'giấy', 'mực', 'ghim', 'file', 'bìa'], debit: '6422', label: 'Chi phí quản lý' },
  { keywords: ['điện', 'nước', 'internet', 'điện thoại', 'viễn thông'], debit: '6422', label: 'Chi phí quản lý' },
  { keywords: ['thuê nhà', 'thuê văn phòng', 'thuê mặt bằng'], debit: '242', label: 'Chi phí trả trước (cần phân bổ)' },
  { keywords: ['xăng', 'dầu', 'nhiên liệu', 'xe'], debit: '6422', label: 'Chi phí quản lý' },
  { keywords: ['quảng cáo', 'marketing', 'thiết kế', 'in ấn'], debit: '6421', label: 'Chi phí bán hàng' },
  { keywords: ['lương', 'thưởng', 'phụ cấp', 'bảo hiểm xã hội'], debit: '6421', label: 'Chi phí nhân viên' },
  { keywords: ['máy tính', 'laptop', 'máy in', 'thiết bị', 'máy móc'], debit: 'CHECK_VALUE', label: 'Tài sản/CCDC' },
  { keywords: ['nguyên vật liệu', 'nguyên liệu', 'vật liệu', 'bao bì'], debit: '152', label: 'Nguyên vật liệu' },
  { keywords: ['hàng hoá', 'hàng hóa', 'sản phẩm'], debit: '156', label: 'Hàng hoá' },
  { keywords: ['dịch vụ kế toán', 'kiểm toán', 'tư vấn', 'dịch vụ pháp lý'], debit: '6422', label: 'Chi phí quản lý' },
  { keywords: ['sửa chữa', 'bảo trì', 'bảo dưỡng'], debit: '6422', label: 'Chi phí sửa chữa' },
  { keywords: ['công cụ', 'dụng cụ', 'đồ dùng'], debit: 'CHECK_VALUE', label: 'CCDC/TSCĐ' },
]

function detectDebitAccount(
  items: ParsedInvoice['items'],
  totalAmount: number,
  industry: string
): { account: string; label: string; confidence: number } {
  const allDesc = items.map(i => i.description.toLowerCase()).join(' ')

  // Kiểm tra từ khoá
  for (const rule of KEYWORD_MAP) {
    if (rule.keywords.some(k => allDesc.includes(k))) {
      // Nếu là tài sản/CCDC → kiểm tra giá trị
      if (rule.debit === 'CHECK_VALUE') {
        if (totalAmount >= 30000000) {
          return { account: '211', label: 'Tài sản cố định', confidence: 85 }
        } else {
          return { account: '153', label: 'Công cụ dụng cụ', confidence: 85 }
        }
      }
      // Thuê nhà/văn phòng → luôn TK 242
      if (rule.debit === '242') {
        return { account: '242', label: rule.label, confidence: 90 }
      }
      return { account: rule.debit, label: rule.label, confidence: 88 }
    }
  }

  // Không khớp từ khoá → dùng ngành nghề
  if (industry === 'thuong_mai') return { account: '156', label: 'Hàng hoá (mặc định TM)', confidence: 60 }
  if (industry === 'san_xuat') return { account: '152', label: 'Nguyên vật liệu (mặc định SX)', confidence: 60 }
  return { account: '6422', label: 'Chi phí quản lý (mặc định)', confidence: 50 }
}

function getCreditAccount(
  paymentMethod: string,
  debitAccount: string
): string {
  // TSCĐ thường mua chịu
  if (debitAccount === '211') return '331'
  if (paymentMethod === 'tien_mat') return '111'
  return '112' // chuyển khoản
}

export function generateJournalEntries(ctx: InvoiceContext): JournalSuggestion[] {
  const entries: JournalSuggestion[] = []
  const notes: string[] = []

  const netAmount = ctx.total_amount - ctx.tax_amount
  const { account: debitAccount, label, confidence } = detectDebitAccount(
    ctx.invoice.items,
    ctx.total_amount,
    ctx.industry
  )
  const creditAccount = getCreditAccount(ctx.payment_method, debitAccount)

  // Kiểm tra cảnh báo
  const isOver20M = ctx.total_amount > 20000000
  const isCash = ctx.payment_method === 'tien_mat'
  const canDeductVAT = !(isOver20M && isCash)

  if (isOver20M && isCash) {
    notes.push('⚠️ Hoá đơn >20tr thanh toán tiền mặt — không được khấu trừ thuế GTGT đầu vào')
  }
  if (debitAccount === '242') {
    notes.push('⚠️ Chi phí trả trước — cần tạo bút toán phân bổ hàng tháng')
  }
  if (debitAccount === '211') {
    notes.push('⚠️ Tài sản cố định — cần tạo thẻ TSCĐ và bút toán khấu hao')
  }

  if (ctx.invoice_type === 'mua_vao') {
    // Bút toán 1: ghi nhận hàng/chi phí
    entries.push({
      debit_account: debitAccount,
      credit_account: creditAccount,
      amount: netAmount,
      description: `Mua ${label} - ${ctx.invoice.seller_name}`,
      confidence,
      ai_note: notes.join('\n'),
    })

    // Bút toán 2: thuế GTGT đầu vào (nếu được khấu trừ)
    if (ctx.tax_amount > 0 && canDeductVAT) {
      entries.push({
        debit_account: '1331',
        credit_account: creditAccount,
        amount: ctx.tax_amount,
        description: `Thuế GTGT đầu vào - ${ctx.invoice.seller_name}`,
        confidence: confidence,
        ai_note: '',
      })
    } else if (ctx.tax_amount > 0 && !canDeductVAT) {
      // Không được khấu trừ → cộng vào giá vốn
      entries.push({
        debit_account: debitAccount,
        credit_account: creditAccount,
        amount: ctx.tax_amount,
        description: `Thuế GTGT không được khấu trừ (TM >20tr) - ${ctx.invoice.seller_name}`,
        confidence: 95,
        ai_note: '⚠️ Thuế GTGT không khấu trừ được do thanh toán tiền mặt >20 triệu',
      })
    }
  } else {
    // Hoá đơn bán ra
    entries.push({
      debit_account: creditAccount === '112' ? '112' : '111',
      credit_account: '511',
      amount: netAmount,
      description: `Doanh thu bán hàng - ${ctx.invoice.buyer_name || ctx.invoice.seller_name}`,
      confidence: 90,
      ai_note: '',
    })
    if (ctx.tax_amount > 0) {
      entries.push({
        debit_account: creditAccount === '112' ? '112' : '111',
        credit_account: '33311',
        amount: ctx.tax_amount,
        description: `Thuế GTGT đầu ra - ${ctx.invoice.buyer_name || ctx.invoice.seller_name}`,
        confidence: 95,
        ai_note: '',
      })
    }
  }

  return entries
}
export type ParsedInvoice = {
  invoice_number: string
  invoice_date: string
  seller_tax_code: string
  seller_name: string
  buyer_tax_code: string
  buyer_name: string
  total_amount: number
  tax_amount: number
  items: InvoiceItem[]
}

export type InvoiceItem = {
  description: string
  quantity: number
  unit_price: number
  amount: number
  tax_rate: number
}

export function parseInvoiceXML(xmlText: string): ParsedInvoice | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, 'text/xml')

    const get = (tag: string) => doc.getElementsByTagName(tag)[0]?.textContent?.trim() || ''

    // Parse các trường chính
    const invoice_number = get('SHDon') || get('so') || get('KHSo')
    const invoice_date = get('NLap') || get('ngayLap') || ''
    const seller_tax_code = get('MST') || get('mst') || ''
    const seller_name = get('Ten') || get('ten') || ''
    const buyer_tax_code = get('MSTNMua') || get('mstNguoiMua') || ''
    const buyer_name = get('TenNMua') || get('tenNguoiMua') || ''
    const total_amount = parseFloat(get('TgTTTBSo') || get('tongTienThanhToan') || '0')
    const tax_amount = parseFloat(get('TgTThue') || get('tongTienThue') || '0')

    // Parse danh sách hàng hoá
    const itemNodes = doc.getElementsByTagName('HHDVu') || doc.getElementsByTagName('hanHoaDichVu')
    const items: InvoiceItem[] = []

    Array.from(itemNodes).forEach(node => {
      const getText = (tag: string) => node.getElementsByTagName(tag)[0]?.textContent?.trim() || '0'
      items.push({
        description: node.getElementsByTagName('THHDVu')[0]?.textContent?.trim() || node.getElementsByTagName('tenHHDV')[0]?.textContent?.trim() || '',
        quantity: parseFloat(getText('SLuong') || getText('soLuong')),
        unit_price: parseFloat(getText('DGia') || getText('donGia')),
        amount: parseFloat(getText('ThTien') || getText('thanhTien')),
        tax_rate: parseFloat(getText('TSuat') || getText('thueSuat') || '0'),
      })
    })

    return {
      invoice_number,
      invoice_date,
      seller_tax_code,
      seller_name,
      buyer_tax_code,
      buyer_name,
      total_amount,
      tax_amount,
      items,
    }
  } catch (err) {
    console.error('Lỗi parse XML:', err)
    return null
  }
}
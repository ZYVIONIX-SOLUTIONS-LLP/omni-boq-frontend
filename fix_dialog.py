import re

with open('components/quotations/QuotationItemMaterialDialog.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace button with input using regex
new_input = '''      <input
        value={selectedProduct ? ${selectedProduct.manufacturerName ? selectedProduct.manufacturerName + ' ' : ''} : value}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => setIsOpen(true)}
        placeholder="Select or type material..."
        className="w-full h-auto min-h-8 py-1.5 px-2 text-left text-xs bg-white border border-slate-200 hover:border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary text-wrap break-words"
      />'''
content = re.sub(r'      <button[\s\S]*?</button>', new_input, content, count=1)

# Handle product change with else branch
new_hpc = '''  const handleProductChange = (reqId: string, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (prod) {
      const categoryPref = prod.categoryId ? (brandPreferences as any)[prod.categoryId] : undefined;
      updateCustom(reqId, { 
        productId, 
        rate: Number(prod.mrp) || 0,
        profitPct: categoryPref?.defaultProfitPct ?? localCustoms[reqId]?.profitPct ?? 0,
        discountPct: categoryPref?.defaultDiscountPct ?? (Number(prod.discountPercent) || 0),
        taxRate: categoryPref?.defaultTaxPct ?? localCustoms[reqId]?.taxRate ?? 0,
      });
    } else {
      updateCustom(reqId, { productId });
    }
  };'''
content = re.sub(r'  const handleProductChange = \(reqId: string, productId: string\) => \{[\s\S]*?  \};', new_hpc, content, count=1)

with open('components/quotations/QuotationItemMaterialDialog.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

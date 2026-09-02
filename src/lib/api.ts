const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('khatinoo_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getCustomerAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('khatinoo_customer_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error || data.message || `خطای سرور (${response.status})`;
    throw new Error(errorMsg);
  }
  return data;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }).then(handleResponse),

  getMe: () =>
    fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  getUsers: () =>
    fetch(`${API_BASE}/users`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  createUser: (user: any) =>
    fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(user),
    }).then(handleResponse),

  updateUser: (id: string, user: any) =>
    fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(user),
    }).then(handleResponse),

  deleteUser: (id: string) =>
    fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),

  // Products & Categories
  getProducts: (params?: { category?: string; query?: string; inStockOnly?: boolean; featuredOnly?: boolean; specialOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.query) query.append('query', params.query);
    if (params?.inStockOnly) query.append('inStockOnly', 'true');
    if (params?.featuredOnly) query.append('featuredOnly', 'true');
    if (params?.specialOnly) query.append('specialOnly', 'true');
    return fetch(`${API_BASE}/products?${query.toString()}`).then(handleResponse);
  },

  getProduct: (id: string) => fetch(`${API_BASE}/products/${id}`).then(handleResponse),

  createProduct: (product: any) =>
    fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(product),
    }).then(handleResponse),

  updateProduct: (id: string, product: any) =>
    fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(product),
    }).then(handleResponse),

  deleteProduct: (id: string) =>
    fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),

  getCategories: () => fetch(`${API_BASE}/categories`).then(handleResponse),

  createCategory: (cat: any) =>
    fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(cat),
    }).then(handleResponse),

  getUnits: () => fetch(`${API_BASE}/units`).then(handleResponse),

  createUnit: (unit: any) =>
    fetch(`${API_BASE}/units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(unit),
    }).then(handleResponse),

  // POS & Pasargad
  getPosConfig: () =>
    fetch(`${API_BASE}/pos/config`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  updatePosConfig: (config: any) =>
    fetch(`${API_BASE}/pos/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(config),
    }).then(handleResponse),

  sendPosTransaction: (data: { amountRials: number; invoiceNumber?: string }) =>
    fetch(`${API_BASE}/pos/send-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  posCheckout: (data: any) =>
    fetch(`${API_BASE}/pos/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getPosLogs: () =>
    fetch(`${API_BASE}/pos/logs`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  // Invoices
  getSalesInvoices: () =>
    fetch(`${API_BASE}/invoices/sales`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  getSalesInvoice: (id: string) =>
    fetch(`${API_BASE}/invoices/sales/${id}`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  getPurchaseInvoices: () =>
    fetch(`${API_BASE}/invoices/purchase`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  createPurchaseInvoice: (data: any) =>
    fetch(`${API_BASE}/invoices/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Return Invoices
  getReturnInvoices: () =>
    fetch(`${API_BASE}/invoices/returns`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  createReturnInvoice: (data: any) =>
    fetch(`${API_BASE}/invoices/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Customers & Suppliers
  getCustomers: () =>
    fetch(`${API_BASE}/customers`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  createCustomer: (customer: any) =>
    fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(customer),
    }).then(handleResponse),

  updateCustomer: (id: string, customer: any) =>
    fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(customer),
    }).then(handleResponse),

  deleteCustomer: (id: string) =>
    fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),

  getCustomerLedger: (id: string) =>
    fetch(`${API_BASE}/customers/${id}/ledger`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  recordCustomerPayment: (id: string, data: { amount: number; paymentMethod?: string; description?: string; invoiceId?: string }) =>
    fetch(`${API_BASE}/customers/${id}/record-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getSuppliers: () =>
    fetch(`${API_BASE}/suppliers`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  createSupplier: (supplier: any) =>
    fetch(`${API_BASE}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(supplier),
    }).then(handleResponse),

  updateSupplier: (id: string, supplier: any) =>
    fetch(`${API_BASE}/suppliers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(supplier),
    }).then(handleResponse),

  deleteSupplier: (id: string) =>
    fetch(`${API_BASE}/suppliers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),

  getSupplierLedger: (id: string) =>
    fetch(`${API_BASE}/suppliers/${id}/ledger`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  recordSupplierPayment: (id: string, data: { amount: number; paymentMethod?: string; description?: string; invoiceId?: string }) =>
    fetch(`${API_BASE}/suppliers/${id}/record-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Cheques
  getCheques: () =>
    fetch(`${API_BASE}/cheques`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  createCheque: (cheque: any) =>
    fetch(`${API_BASE}/cheques`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(cheque),
    }).then(handleResponse),

  updateChequeStatus: (id: string, data: { status: string; notes?: string }) =>
    fetch(`${API_BASE}/cheques/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Copy & Print Services
  getServicePresets: () => fetch(`${API_BASE}/services/presets`).then(handleResponse),

  createServicePreset: (preset: any) =>
    fetch(`${API_BASE}/services/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(preset),
    }).then(handleResponse),

  updateServicePreset: (id: string, preset: any) =>
    fetch(`${API_BASE}/services/presets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(preset),
    }).then(handleResponse),

  deleteServicePreset: (id: string) =>
    fetch(`${API_BASE}/services/presets/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),

  calculatePrintCost: (params: any) =>
    fetch(`${API_BASE}/services/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).then(handleResponse),

  getServiceRecords: () =>
    fetch(`${API_BASE}/services/records`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  createServiceRecord: (record: any) =>
    fetch(`${API_BASE}/services/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(record),
    }).then(handleResponse),

  // Production & Formulation
  getProductionFormulas: () =>
    fetch(`${API_BASE}/production/formulas`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  createProductionFormula: (formula: any) =>
    fetch(`${API_BASE}/production/formulas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(formula),
    }).then(handleResponse),

  updateProductionFormula: (id: string, formula: any) =>
    fetch(`${API_BASE}/production/formulas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(formula),
    }).then(handleResponse),

  deleteProductionFormula: (id: string) =>
    fetch(`${API_BASE}/production/formulas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),

  getProductionRuns: () =>
    fetch(`${API_BASE}/production/runs`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  executeProductionRun: (data: { formulaId: string; producedQuantity: number; warehouseId?: string; outputWarehouseId?: string; notes?: string }) =>
    fetch(`${API_BASE}/production/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Alias for executeProductionRun
  runProduction: (data: { formulaId: string; quantityToProduce: number; warehouseId?: string; outputWarehouseId?: string; notes?: string }) =>
    fetch(`${API_BASE}/production/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({
        formulaId: data.formulaId,
        producedQuantity: data.quantityToProduce,
        warehouseId: data.warehouseId,
        outputWarehouseId: data.outputWarehouseId,
        notes: data.notes,
      }),
    }).then(handleResponse),

  getProductionOrders: () =>
    fetch(`${API_BASE}/production/runs`, {
      headers: getAuthHeader(),
    }).then((res) => handleResponse(res).then((data) => ({ orders: data.runs || [] }))),

  // Torob, Digikala & Stationery Multi-Source Market Intelligence & AI
  searchTorob: (query?: string, context?: any) => {
    return fetch(`${API_BASE}/torob/intel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ query, context }),
    })
      .then(handleResponse)
      .catch(() => {
        const q = query ? `?query=${encodeURIComponent(query)}` : '';
        return fetch(`${API_BASE}/torob/search${q}`, {
          headers: getAuthHeader(),
        }).then(handleResponse);
      });
  },

  getMultiMarketIntel: (query?: string, context?: any) => {
    return fetch(`${API_BASE}/torob/intel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ query, context }),
    }).then(handleResponse);
  },

  getTorobCategory110: (params?: { subCategory?: string; sort?: string; query?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.subCategory) searchParams.append('subCategory', params.subCategory);
    if (params?.sort) searchParams.append('sort', params.sort);
    if (params?.query) searchParams.append('query', params.query);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return fetch(`${API_BASE}/torob/category-110${qs}`, {
      headers: getAuthHeader(),
    }).then(handleResponse);
  },

  importTorobToInventory: (data: any) =>
    fetch(`${API_BASE}/torob/import-to-inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  syncTorobPrice: (data: any) =>
    fetch(`${API_BASE}/torob/sync-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  auditInventoryAgainstTorob: () =>
    fetch(`${API_BASE}/torob/audit-inventory`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  batchRepriceInventory: (updates: Array<{ productId: string; priceShop1?: number; priceShop2?: number; priceShop3?: number; wholesalePrice?: number }>) =>
    fetch(`${API_BASE}/torob/batch-reprice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ updates }),
    }).then(handleResponse),

  inspectTorobDirectUrl: (url: string) =>
    fetch(`${API_BASE}/torob/direct-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ url }),
    }).then(handleResponse),

  askAiAssistant: (
    messagesOrPrompt: Array<{ role: 'user' | 'model'; text: string }> | string,
    storeContext?: string,
    enableSearchGrounding: boolean = true
  ) => {
    const formattedMessages =
      typeof messagesOrPrompt === 'string'
        ? [{ role: 'user' as const, text: messagesOrPrompt }]
        : messagesOrPrompt;

    return fetch(`${API_BASE}/ai/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({
        messages: formattedMessages,
        storeContext,
        enableSearchGrounding,
      }),
    }).then(handleResponse);
  },

  askGeminiAssistant: (prompt: string, enableSearchGrounding: boolean = true) => {
    return fetch(`${API_BASE}/ai/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({
        messages: [{ role: 'user', text: prompt }],
        enableSearchGrounding,
      }),
    }).then(handleResponse);
  },

  searchGroundedWeb: (query: string) => {
    return fetch(`${API_BASE}/ai/grounded-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ query }),
    }).then(handleResponse);
  },

  getAiPricingAdvice: (data: any) =>
    fetch(`${API_BASE}/ai/pricing-advice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Website & Orders
  getWebsiteSettings: () => fetch(`${API_BASE}/website/settings`).then(handleResponse),

  updateWebsiteSettings: (settings: any) =>
    fetch(`${API_BASE}/website/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(settings),
    }).then(handleResponse),

  getBanners: () => fetch(`${API_BASE}/website/banners`).then(handleResponse),

  getGateways: () => fetch(`${API_BASE}/website/gateways`).then(handleResponse),

  getShippingMethods: () => fetch(`${API_BASE}/website/shipping`).then(handleResponse),

  placeOrder: (orderData: any) =>
    fetch(`${API_BASE}/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    }).then(handleResponse),

  getOrders: () =>
    fetch(`${API_BASE}/orders`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  trackOrders: (params: { mobile?: string; orderNumber?: string }) => {
    const q = new URLSearchParams();
    if (params.mobile) q.append('mobile', params.mobile);
    if (params.orderNumber) q.append('orderNumber', params.orderNumber);
    return fetch(`${API_BASE}/orders/track?${q.toString()}`).then(handleResponse);
  },

  updateOrderStatus: (id: string, data: { orderStatus: string; trackingCode?: string }) =>
    fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getServices: () => fetch(`${API_BASE}/services/presets`).then(handleResponse),

  createService: (preset: any) =>
    fetch(`${API_BASE}/services/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(preset),
    }).then(handleResponse),

  updateService: (id: string, preset: any) =>
    fetch(`${API_BASE}/services/presets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(preset),
    }).then(handleResponse),

  deleteService: (id: string) =>
    fetch(`${API_BASE}/services/presets/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),

  getServiceOrders: () =>
    fetch(`${API_BASE}/services/records`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  createServiceOrder: (record: any) =>
    fetch(`${API_BASE}/services/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(record),
    }).then(handleResponse),

  getOnlineOrders: () =>
    fetch(`${API_BASE}/orders`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  updateOnlineOrderStatus: (id: string, statusOrData: string | { orderStatus: string; trackingCode?: string }, trackingCode?: string) => {
    const payload = typeof statusOrData === 'string'
      ? { orderStatus: statusOrData, ...(trackingCode ? { trackingCode } : {}) }
      : statusOrData;
    return fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    }).then(handleResponse);
  },

  createBanner: (banner: any) =>
    fetch(`${API_BASE}/website/banners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(banner),
    }).then(handleResponse).catch(() => ({ success: true })),

  deleteBanner: (id: string) =>
    fetch(`${API_BASE}/website/banners/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse).catch(() => ({ success: true })),

  updateGateway: (code: string, config: any) =>
    fetch(`${API_BASE}/website/gateways/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(config),
    }).then(handleResponse).catch(() => ({ success: true })),

  // Dashboard
  getDashboardStats: () =>
    fetch(`${API_BASE}/dashboard/stats`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  // CMS Architecture: Modules & Hooks
  getCmsModules: () => fetch(`${API_BASE}/cms/modules`).then(handleResponse),

  toggleCmsModule: (id: string, isEnabled: boolean) =>
    fetch(`${API_BASE}/cms/modules/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ isEnabled }),
    }).then(handleResponse),

  getCmsHooks: () => fetch(`${API_BASE}/cms/hooks`).then(handleResponse),

  // Page Builder (Visual Layout & Drag & Drop)
  getPageBlocks: () => fetch(`${API_BASE}/cms/page-builder/blocks`).then(handleResponse),

  savePageBlocks: (blocks: any[]) =>
    fetch(`${API_BASE}/cms/page-builder/blocks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ blocks }),
    }).then(handleResponse),

  getPageTemplates: () => fetch(`${API_BASE}/cms/page-builder/templates`).then(handleResponse),

  applyPageTemplate: (templateId: string) =>
    fetch(`${API_BASE}/cms/page-builder/templates/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ templateId }),
    }).then(handleResponse),

  savePageTemplate: (name: string, description?: string, blocks?: any[]) =>
    fetch(`${API_BASE}/cms/page-builder/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ name, description, blocks }),
    }).then(handleResponse),

  deletePageTemplate: (id: string) =>
    fetch(`${API_BASE}/cms/page-builder/templates/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),

  // Media Library & Uploads
  uploadFile: (data: { dataUrl: string; filename?: string; category?: string; title?: string; altText?: string }) =>
    fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getMediaItems: (category?: string) => {
    const q = category ? `?category=${category}` : '';
    return fetch(`${API_BASE}/cms/media${q}`).then(handleResponse);
  },

  addMediaItem: (item: any) =>
    fetch(`${API_BASE}/cms/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(item),
    }).then(handleResponse),

  deleteMediaItem: (id: string) =>
    fetch(`${API_BASE}/cms/media/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),

  // SMS Gateway
  getSmsConfig: () =>
    fetch(`${API_BASE}/cms/sms/config`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  updateSmsConfig: (config: any) =>
    fetch(`${API_BASE}/cms/sms/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(config),
    }).then(handleResponse),

  sendTestSms: (mobile: string, message: string) =>
    fetch(`${API_BASE}/cms/sms/send-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ mobile, message }),
    }).then(handleResponse),

  getSmsLogs: () =>
    fetch(`${API_BASE}/cms/sms/logs`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  // Payment Gateways
  getPaymentGateways: () => fetch(`${API_BASE}/cms/gateways`).then(handleResponse),

  updatePaymentGateway: (code: string, config: any) =>
    fetch(`${API_BASE}/cms/gateways/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(config),
    }).then(handleResponse),

  // Coupons
  getCoupons: () => fetch(`${API_BASE}/cms/coupons`).then(handleResponse),

  createCoupon: (coupon: any) =>
    fetch(`${API_BASE}/cms/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(coupon),
    }).then(handleResponse),

  deleteCoupon: (id: string) =>
    fetch(`${API_BASE}/cms/coupons/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    }).then(handleResponse),

  validateCoupon: (code: string, cartAmount: number) =>
    fetch(`${API_BASE}/cms/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, cartAmount }),
    }).then(handleResponse),

  // Reviews
  getProductReviews: (productId?: string) => {
    const q = productId ? `?productId=${productId}` : '';
    return fetch(`${API_BASE}/cms/reviews${q}`).then(handleResponse);
  },

  submitProductReview: (review: any) =>
    fetch(`${API_BASE}/cms/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    }).then(handleResponse),

  approveProductReview: (id: string) =>
    fetch(`${API_BASE}/cms/reviews/${id}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    }).then(handleResponse),

  rejectProductReview: (id: string) =>
    fetch(`${API_BASE}/cms/reviews/${id}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    }).then(handleResponse),

  replyProductReview: (id: string, replyText: string) =>
    fetch(`${API_BASE}/cms/reviews/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ replyText }),
    }).then(handleResponse),

  // Security Audit Logs
  getCmsAuditLogs: () =>
    fetch(`${API_BASE}/cms/audit-logs`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  // Treasury & Central Cash Ledger (خزانه و نقدینگی متمرکز)
  getTreasuryTransactions: (params?: { sourceModule?: string; transactionType?: string }) => {
    const query = new URLSearchParams();
    if (params?.sourceModule) query.append('sourceModule', params.sourceModule);
    if (params?.transactionType) query.append('transactionType', params.transactionType);
    return fetch(`${API_BASE}/treasury/transactions?${query.toString()}`, {
      headers: getAuthHeader(),
    }).then(handleResponse);
  },

  getTreasurySummary: () =>
    fetch(`${API_BASE}/treasury/summary`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  createTreasuryTransaction: (tx: any) =>
    fetch(`${API_BASE}/treasury/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(tx),
    }).then(handleResponse),

  // ==========================================
  // CUSTOMER AUTH, PROFILE & ORDERS (مشتریان)
  // ==========================================
  sendCustomerOtp: (mobile: string) =>
    fetch(`${API_BASE}/customer/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile }),
    }).then(handleResponse),

  verifyCustomerOtp: (mobile: string, code: string) =>
    fetch(`${API_BASE}/customer/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, code }),
    }).then(handleResponse),

  getCustomerMe: () =>
    fetch(`${API_BASE}/customer/me`, {
      headers: getCustomerAuthHeader(),
    }).then(handleResponse),

  updateCustomerProfile: (data: {
    name: string;
    email?: string;
    province?: string;
    city?: string;
    postalCode?: string;
    fullAddress?: string;
    nationalCode?: string;
    companyName?: string;
  }) =>
    fetch(`${API_BASE}/customer/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getCustomerAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getCustomerOrders: () =>
    fetch(`${API_BASE}/customer/orders`, {
      headers: getCustomerAuthHeader(),
    }).then(handleResponse),

  getCustomerOrderById: (id: string) =>
    fetch(`${API_BASE}/customer/orders/${id}`, {
      headers: getCustomerAuthHeader(),
    }).then(handleResponse),

  // ==========================================
  // MULTI-WAREHOUSE & INVENTORY OPERATIONS
  // ==========================================
  getWarehouses: () =>
    fetch(`${API_BASE}/warehouses`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  createWarehouse: (data: any) =>
    fetch(`${API_BASE}/warehouses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getInventoryByLocation: (params?: { warehouseId?: string; productId?: string }) => {
    const q = new URLSearchParams();
    if (params?.warehouseId) q.append('warehouseId', params.warehouseId);
    if (params?.productId) q.append('productId', params.productId);
    return fetch(`${API_BASE}/inventory/by-location?${q.toString()}`, {
      headers: getAuthHeader(),
    }).then(handleResponse);
  },

  transferStock: (data: {
    fromWarehouseId: string;
    toWarehouseId: string;
    productId: string;
    quantity: number;
    notes?: string;
  }) =>
    fetch(`${API_BASE}/inventory/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getInventoryTransfers: (limit = 50) =>
    fetch(`${API_BASE}/inventory/transfers?limit=${limit}`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  adjustProductStock: (data: {
    productId: string;
    warehouseId?: string;
    newStock?: number;
    delta?: number;
    reason: string;
    notes?: string;
  }) =>
    fetch(`${API_BASE}/inventory/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getInventoryAdjustments: (limit = 50) =>
    fetch(`${API_BASE}/inventory/adjustments?limit=${limit}`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  // ==========================================
  // SYSTEM AUDIT LOGS
  // ==========================================
  getAuditLogs: (params?: { limit?: number; module?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.module) q.append('module', params.module);
    return fetch(`${API_BASE}/audit-logs?${q.toString()}`, {
      headers: getAuthHeader(),
    }).then(handleResponse);
  },

  createAuditLog: (data: { action: string; module?: string; targetId?: string; details?: any; status?: string }) =>
    fetch(`${API_BASE}/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    }).then(handleResponse),

  // ==========================================
  // UNIFIED DATABASE & MEDIA BACKUP & RESTORE
  // ==========================================
  getBackupStats: () =>
    fetch(`${API_BASE}/backup/stats`, {
      headers: getAuthHeader(),
    }).then(handleResponse),

  exportBackupUrl: (format: 'sql' | 'json' = 'sql') =>
    `${API_BASE}/backup/export?format=${format}`,

  exportBackupBlob: async (format: 'sql' | 'json' = 'sql'): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/backup/export?format=${format}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'خطا در دریافت فایل پشتیبان');
    }
    return res.blob();
  },

  restoreBackup: (payload: { format?: 'sql' | 'json'; content?: string; data?: any }) =>
    fetch(`${API_BASE}/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    }).then(handleResponse),
};


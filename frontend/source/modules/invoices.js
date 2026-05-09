import { API_URL, getHeaders } from './config.js';

export async function fetchInvoices() {
    const container = document.getElementById('invoices-container');
    container.innerHTML = '<div class="text-center py-20 text-gray-400">Đang tải lịch sử...</div>';
    try {
        const res = await fetch(`${API_URL}/admin/invoices`, { headers: getHeaders() });
        const invoices = await res.json();
        container.innerHTML = '';

        const groups = {};
        invoices.forEach(inv => {
            const dateStr = new Date(inv.check_out_time).toLocaleDateString('vi-VN');
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(inv);
        });

        Object.keys(groups).forEach(date => {
            const dateGroup = document.createElement('div');
            dateGroup.className = "mb-10";
            dateGroup.innerHTML = `
                <div class="flex items-center gap-4 mb-4">
                    <div class="h-px flex-1 bg-gray-200"></div>
                    <span class="text-xs font-black text-gray-400 uppercase tracking-widest">${date}</span>
                    <div class="h-px flex-1 bg-gray-200"></div>
                </div>
                <div class="space-y-2">
                    ${groups[date].map(inv => {
                        const pMethod = inv.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản';
                        return `
                        <div onclick="window.openBillModal(${inv.id})" class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
                            <div class="flex items-center gap-4">
                                <div class="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                    <i data-lucide="file-text" class="w-5 h-5 text-gray-400 group-hover:text-blue-600"></i>
                                </div>
                                <div>
                                    <p class="font-bold text-gray-800">Phòng ${inv.room_number} (HĐ #${inv.id})</p>
                                    <p class="text-[10px] text-gray-400 uppercase font-bold">Khách: ${inv.guest_name || 'N/A'} • NV: ${inv.username} • ${pMethod}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="text-lg font-black text-gray-800">${inv.total_amount.toLocaleString()}đ</p>
                                <p class="text-[10px] text-gray-500">${new Date(inv.check_out_time).toLocaleTimeString('vi-VN')}</p>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            `;
            container.appendChild(dateGroup);
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

import { API_URL, getHeaders } from './config.js';
import { currentUser } from './auth.js';

export async function fetchCurrentShift() {
    const container = document.getElementById('shift-status-container');
    container.innerHTML = '<div class="text-center py-20 text-gray-400">Đang kiểm tra ca trực...</div>';
    try {
        const res = await fetch(`${API_URL}/shifts/current/${currentUser.id}`);
        const shift = await res.json();
        
        const hasEnded = localStorage.getItem('shift_ended') === 'true';

        if (!shift) {
            if (hasEnded) {
                container.innerHTML = `
                    <div class="bg-white p-10 rounded-3xl border border-gray-200 shadow-xl text-center">
                        <div class="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
                            <i data-lucide="check-circle" class="w-10 h-10"></i>
                        </div>
                        <h3 class="text-2xl font-black text-gray-800 mb-2">Ca trực đã kết thúc</h3>
                        <p class="text-gray-400 mb-8">Bạn đã chốt tiền thành công. Vui lòng đăng xuất để bàn giao máy.</p>
                        <button onclick="window.logout()" class="w-full py-4 bg-gray-800 text-white rounded-xl font-bold hover:bg-black transition-all">Đăng xuất ngay</button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="bg-white p-10 rounded-3xl border border-gray-200 shadow-xl text-center">
                        <div class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-300 animate-pulse">
                            <i data-lucide="loader" class="w-10 h-10"></i>
                        </div>
                        <h3 class="text-2xl font-black text-gray-800 mb-2">Đang khởi tạo ca trực...</h3>
                        <p class="text-gray-400">Hệ thống đang tự động kích hoạt ca trực của bạn.</p>
                    </div>
                `;
                setTimeout(startShift, 1000);
            }
            lucide.createIcons();
        } else {
            container.innerHTML = `
                <div class="bg-white p-10 rounded-3xl border border-gray-200 shadow-xl">
                    <div class="flex items-center justify-between mb-10">
                        <div>
                            <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ca trực hiện tại</p>
                            <h3 class="text-2xl font-black text-gray-800">${shift.username}</h3>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bắt đầu lúc</p>
                            <p class="font-bold text-gray-800">${new Date(shift.start_time).toLocaleString('vi-VN')}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-6 mb-10">
                        <div class="p-6 bg-green-50 rounded-2xl border border-green-100">
                            <p class="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">Tiền mặt</p>
                            <p class="text-3xl font-black text-green-700">${shift.total_cash.toLocaleString()}đ</p>
                        </div>
                        <div class="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                            <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Chuyển khoản</p>
                            <p class="text-3xl font-black text-blue-700">${shift.total_transfer.toLocaleString()}đ</p>
                        </div>
                    </div>

                    <div class="p-6 bg-gray-50 rounded-2xl border border-gray-200 mb-10">
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-bold text-gray-500 uppercase">Tổng cộng doanh thu</span>
                            <span class="text-3xl font-black text-gray-800">${(shift.total_cash + shift.total_transfer).toLocaleString()}đ</span>
                        </div>
                    </div>

                    <button onclick="window.endShift()" class="w-full py-4 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                        <i data-lucide="log-out" class="w-5 h-5"></i>
                        Kết thúc ca & Chốt tiền
                    </button>
                </div>
            `;
        }
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

export async function startShift() {
    try {
        const res = await fetch(`${API_URL}/shifts/start/${currentUser.id}`, { method: 'POST' });
        if (res.ok) fetchCurrentShift();
    } catch (e) { console.error(e); }
}

export async function endShift() {
    if (!confirm("Bạn có chắc chắn muốn kết thúc ca và chốt tiền không?")) return;
    try {
        const res = await fetch(`${API_URL}/shifts/end/${currentUser.id}`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('shift_ended', 'true');
            alert(`CA TRỰC ĐÃ KẾT THÚC\n-------------------\n${data.report}`);
            fetchCurrentShift();
        }
    } catch (e) { console.error(e); }
}

export async function fetchShiftHistory() {
    try {
        const res = await fetch(`${API_URL}/admin/shifts`, { headers: getHeaders() });
        const shifts = await res.json();
        const tbody = document.getElementById('shift-history-table-body');
        tbody.innerHTML = '';
        shifts.forEach(s => {
            const row = document.createElement('tr');
            row.className = "border-b hover:bg-gray-50 transition-all text-sm";
            row.innerHTML = `
                <td class="px-6 py-4 font-bold text-gray-800">${s.username}</td>
                <td class="px-6 py-4 text-gray-500">${new Date(s.start_time).toLocaleString('vi-VN')}</td>
                <td class="px-6 py-4 text-gray-500">${s.end_time ? new Date(s.end_time).toLocaleString('vi-VN') : '---'}</td>
                <td class="px-6 py-4 font-bold text-green-600">${s.total_cash.toLocaleString()}đ</td>
                <td class="px-6 py-4 font-bold text-blue-600">${s.total_transfer.toLocaleString()}đ</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded-full text-[10px] font-black uppercase ${s.status === 'OPEN' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}">
                        ${s.status === 'OPEN' ? 'Đang trực' : 'Đã kết thúc'}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (e) { console.error(e); }
}

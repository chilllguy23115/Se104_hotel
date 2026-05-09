import { API_URL, getHeaders } from './config.js';
import { fetchRooms } from './rooms.js';

let selectedServices = [];
let allServices = [];
let currentBookingId = null;

export async function fetchServicesConfig() {
    try {
        const res = await fetch(`${API_URL}/services`);
        const svcs = await res.json();
        const tbody = document.getElementById('services-config-table-body');
        tbody.innerHTML = '';
        svcs.forEach(s => {
            const row = document.createElement('tr');
            row.className = "border-b hover:bg-gray-50 transition-all";
            row.innerHTML = `
                <td class="px-6 py-4 font-bold text-gray-800">${s.name}</td>
                <td class="px-6 py-4">${s.price.toLocaleString()}đ</td>
                <td class="px-6 py-4"><span class="px-2 py-1 ${s.stock_quantity < 5 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'} rounded text-xs font-bold">${s.stock_quantity}</span></td>
                <td class="px-6 py-4 text-right flex justify-end gap-2">
                    <button onclick='window.openServiceConfigModal(${JSON.stringify(s)})' class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="window.deleteServiceConfig(${s.id})" class="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

export function openServiceConfigModal(svc = null) {
    const modal = document.getElementById('service-config-modal');
    const title = document.getElementById('service-modal-title');
    const idInput = document.getElementById('edit-service-id');
    const nameInput = document.getElementById('edit-service-name');
    const priceInput = document.getElementById('edit-service-price');
    const stockInput = document.getElementById('edit-service-stock');

    if (svc) {
        title.innerText = "Chỉnh sửa dịch vụ";
        idInput.value = svc.id;
        nameInput.value = svc.name;
        priceInput.value = svc.price;
        stockInput.value = svc.stock_quantity;
    } else {
        title.innerText = "Thêm dịch vụ mới";
        idInput.value = "";
        nameInput.value = "";
        priceInput.value = "";
        stockInput.value = "0";
    }
    modal.classList.remove('hidden');
}

export async function saveServiceConfig() {
    const id = document.getElementById('edit-service-id').value;
    const name = document.getElementById('edit-service-name').value;
    const price = document.getElementById('edit-service-price').value;
    const stock = document.getElementById('edit-service-stock').value;
    if (!name || !price) return alert("Vui lòng nhập đủ thông tin!");

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/admin/services/${id}` : `${API_URL}/admin/services`;

    const res = await fetch(url, {
        method: method,
        headers: getHeaders(),
        body: JSON.stringify({ name: name, price: parseInt(price), stock_quantity: parseInt(stock) })
    });

    if (res.ok) { 
        document.getElementById('service-config-modal').classList.add('hidden'); 
        fetchServicesConfig(); 
    } else { 
        alert("Lỗi khi lưu dịch vụ!"); 
    }
}

export async function deleteServiceConfig(id) {
    if (!confirm("Xác nhận xóa dịch vụ này?")) return;
    const res = await fetch(`${API_URL}/admin/services/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (res.ok) fetchServicesConfig(); else alert("Không thể xóa (có thể dịch vụ đang được sử dụng trong hóa đơn)");
}

export async function openServiceModal(bookingId) {
    currentBookingId = bookingId;
    selectedServices = [];
    renderSelectedServices();
    document.getElementById('service-modal').classList.remove('hidden');

    try {
        const res = await fetch(`${API_URL}/services`);
        allServices = await res.json();
        const list = document.getElementById('services-list');
        list.innerHTML = '';
        allServices.forEach(s => {
            const item = document.createElement('div');
            item.className = "flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-300 transition-all shadow-sm";
            item.innerHTML = `
                <div>
                    <p class="font-bold text-gray-800">${s.name}</p>
                    <div class="flex gap-2 items-center">
                        <span class="text-xs font-black text-indigo-500">${s.price.toLocaleString('vi-VN')}đ</span>
                        <span class="text-[10px] font-bold ${s.stock_quantity > 0 ? 'text-amber-500' : 'text-red-500'} uppercase">Kho: ${s.stock_quantity}</span>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="flex items-center border rounded-lg bg-gray-50">
                        <button onclick="window.updateQtyInList(${s.id}, -1)" class="p-1.5 hover:text-indigo-600"><i data-lucide="minus" class="w-3.5 h-3.5"></i></button>
                        <input type="number" id="qty-input-${s.id}" value="1" class="w-8 text-center bg-transparent border-none text-xs font-bold focus:ring-0 p-0" min="1">
                        <button onclick="window.updateQtyInList(${s.id}, 1)" class="p-1.5 hover:text-indigo-600"><i data-lucide="plus" class="w-3.5 h-3.5"></i></button>
                    </div>
                    <button onclick="window.addToSelection(${s.id})" class="p-2.5 ${s.stock_quantity > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-300 pointer-events-none'} rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                        <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            list.appendChild(item);
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

export function updateQtyInList(id, delta) {
    const input = document.getElementById(`qty-input-${id}`);
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;
}

export function addToSelection(serviceId) {
    const qty = parseInt(document.getElementById(`qty-input-${serviceId}`).value);
    const service = allServices.find(s => s.id === serviceId);
    const existing = selectedServices.find(s => s.id === serviceId);
    const currentTotal = (existing ? existing.quantity : 0) + qty;
    
    if (currentTotal > service.stock_quantity) {
        return alert(`Không đủ hàng! ${service.name} trong kho chỉ còn ${service.stock_quantity}`);
    }

    if (existing) {
        existing.quantity += qty;
    } else {
        selectedServices.push({ ...service, quantity: qty });
    }
    renderSelectedServices();
}

export function removeFromSelection(serviceId) {
    selectedServices = selectedServices.filter(s => s.id !== serviceId);
    renderSelectedServices();
}

export function renderSelectedServices() {
    const list = document.getElementById('selected-services-list');
    const totalEl = document.getElementById('selected-services-total');
    if (selectedServices.length === 0) {
        list.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-10">Chưa chọn dịch vụ nào</p>';
        totalEl.innerText = "0đ";
        return;
    }
    let total = 0;
    list.innerHTML = selectedServices.map(s => {
        total += s.price * s.quantity;
        return `
            <div class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm animate-slide-in">
                <div class="min-w-0">
                    <p class="text-xs font-bold text-gray-800 truncate">${s.name}</p>
                    <p class="text-[10px] text-gray-400 uppercase font-black">x${s.quantity} = ${(s.price * s.quantity).toLocaleString()}đ</p>
                </div>
                <button onclick="window.removeFromSelection(${s.id})" class="p-1 text-gray-300 hover:text-red-500 transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    }).join('');
    totalEl.innerText = total.toLocaleString('vi-VN') + "đ";
    lucide.createIcons();
}

export async function confirmBatchServices() {
    if (selectedServices.length === 0) return alert("Vui lòng chọn ít nhất 1 dịch vụ!");
    const payload = {
        services: selectedServices.map(s => ({ service_id: s.id, quantity: s.quantity }))
    };
    try {
        const res = await fetch(`${API_URL}/bookings/${currentBookingId}/batch-services`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            document.getElementById('service-modal').classList.add('hidden');
            alert("Đã thêm dịch vụ thành công!");
            fetchRooms();
        } else {
            const err = await res.json();
            alert(err.detail || "Lỗi khi thêm dịch vụ!");
        }
    } catch (e) { console.error(e); }
}

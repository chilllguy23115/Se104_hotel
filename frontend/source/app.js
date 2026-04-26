const API_URL = "http://127.0.0.1:8000/api";
let currentUser = JSON.parse(localStorage.getItem('hotel_user'));
let currentRoomId = null;
let currentBookingId = null;

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        loginSuccess(currentUser);
    }
    lucide.createIcons();
});

function toggleAuth(type) {
    document.getElementById('login-form').classList.toggle('hidden-section', type === 'register');
    document.getElementById('register-form').classList.toggle('hidden-section', type === 'login');
    lucide.createIcons();
}

async function handleLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('hotel_user', JSON.stringify(data));
            loginSuccess(data);
        } else { alert("Sai tài khoản hoặc mật khẩu!"); }
    } catch (e) { alert("Không thể kết nối Backend!"); }
}

async function handleRegister() {
    const user = document.getElementById('reg-user').value;
    const pass = document.getElementById('reg-pass').value;
    const role = document.getElementById('reg-role').value;
    if (!user || !pass) return alert("Vui lòng nhập đủ thông tin!");
    try {
        const res = await fetch(`${API_URL}/admin/staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Role': currentUser?.role },
            body: JSON.stringify({ username: user, password: pass, role: role })
        });
        if (res.ok) {
            alert("Đăng ký thành công! Hãy đăng nhập.");
            toggleAuth('login');
        } else { alert("Tên đăng nhập đã tồn tại!"); }
    } catch (e) { console.error(e); }
}

function loginSuccess(user) {
    currentUser = user;
    document.getElementById('auth-screen').classList.add('hidden-section');
    document.getElementById('main-sidebar').classList.remove('hidden-section');
    document.getElementById('main-content').classList.remove('hidden-section');
    document.getElementById('user-display-name').innerText = user.username;
    document.getElementById('user-display-role').innerText = user.role === 'ADMIN' ? 'Quản lý' : 'Lễ tân';
    if (user.role === 'ADMIN') document.getElementById('admin-nav').classList.remove('hidden-section');
    showSection('rooms');
    lucide.createIcons();
}

function logout() { localStorage.removeItem('hotel_user'); window.location.reload(); }

function showSection(sectionId) {
    ['rooms', 'prices', 'services-config', 'invoices', 'staff', 'reports'].forEach(s => {
        const el = document.getElementById(`section-${s}`);
        const nav = document.getElementById(`nav-${s}`);
        if (el) el.classList.add('hidden-section');
        if (nav) nav.classList.remove('active');
    });
    const section = document.getElementById(`section-${sectionId}`);
    const nav = document.getElementById(`nav-${sectionId}`);
    if (section) section.classList.remove('hidden-section');
    if (nav) nav.classList.add('active');

    if (sectionId === 'rooms') fetchRooms();
    if (sectionId === 'prices') fetchCategories();
    if (sectionId === 'services-config') fetchServicesConfig();
    if (sectionId === 'invoices') fetchInvoices();
    if (sectionId === 'staff') fetchStaff();
    if (sectionId === 'reports') fetchRevenue();
}

// --- Invoice History Logic ---
async function fetchInvoices() {
    const container = document.getElementById('invoices-container');
    container.innerHTML = '<div class="text-center py-20 text-gray-400">Đang tải lịch sử...</div>';
    try {
        const res = await fetch(`${API_URL}/admin/invoices`, { headers: { 'X-Role': currentUser.role } });
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
                    ${groups[date].map(inv => `
                        <div onclick="openBillModal(${inv.id})" class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
                            <div class="flex items-center gap-4">
                                <div class="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                    <i data-lucide="file-text" class="w-5 h-5 text-gray-400 group-hover:text-blue-600"></i>
                                </div>
                                <div>
                                    <p class="font-bold text-gray-800">Phòng ${inv.room_id} (HĐ #${inv.id})</p>
                                    <p class="text-[10px] text-gray-400 uppercase font-bold">Khách: ${inv.guest_name || 'N/A'}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="text-lg font-black text-gray-800">${inv.total_amount.toLocaleString()}đ</p>
                                <p class="text-[10px] text-gray-500">${new Date(inv.check_out_time).toLocaleTimeString('vi-VN')}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(dateGroup);
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

// --- Services Config Logic ---
async function fetchServicesConfig() {
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
                <td class="px-6 py-4 text-right flex justify-end gap-2">
                    <button onclick='openServiceConfigModal(${JSON.stringify(s)})' class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteServiceConfig(${s.id})" class="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

function openServiceConfigModal(svc = null) {
    const modal = document.getElementById('service-config-modal');
    const title = document.getElementById('service-modal-title');
    const idInput = document.getElementById('edit-service-id');
    const nameInput = document.getElementById('edit-service-name');
    const priceInput = document.getElementById('edit-service-price');

    if (svc) {
        title.innerText = "Chỉnh sửa dịch vụ";
        idInput.value = svc.id;
        nameInput.value = svc.name;
        priceInput.value = svc.price;
    } else {
        title.innerText = "Thêm dịch vụ mới";
        idInput.value = "";
        nameInput.value = "";
        priceInput.value = "";
    }
    modal.classList.remove('hidden');
}

function closeServiceConfigModal() { document.getElementById('service-config-modal').classList.add('hidden'); }

async function saveServiceConfig() {
    const id = document.getElementById('edit-service-id').value;
    const name = document.getElementById('edit-service-name').value;
    const price = document.getElementById('edit-service-price').value;
    if (!name || !price) return alert("Vui lòng nhập đủ thông tin!");

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/admin/services/${id}` : `${API_URL}/admin/services`;

    const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'X-Role': currentUser.role },
        body: JSON.stringify({ name: name, price: parseInt(price) })
    });

    if (res.ok) { closeServiceConfigModal(); fetchServicesConfig(); } else { alert("Lỗi khi lưu dịch vụ!"); }
}

async function deleteServiceConfig(id) {
    if (!confirm("Xác nhận xóa dịch vụ này?")) return;
    const res = await fetch(`${API_URL}/admin/services/${id}`, { method: 'DELETE', headers: { 'X-Role': currentUser.role } });
    if (res.ok) fetchServicesConfig(); else alert("Không thể xóa (có thể dịch vụ đang được sử dụng trong hóa đơn)");
}

// --- Pricing Logic ---
async function fetchCategories() {
    try {
        const res = await fetch(`${API_URL}/admin/room-categories`, { headers: { 'X-Role': currentUser.role } });
        const cats = await res.json();
        const tbody = document.getElementById('prices-table-body');
        tbody.innerHTML = '';
        cats.forEach(c => {
            const row = document.createElement('tr');
            row.className = "border-b hover:bg-gray-50 transition-all";
            row.innerHTML = `
                <td class="px-6 py-4 font-bold text-gray-800">${c.name}</td>
                <td class="px-6 py-4">${c.price_first_hour.toLocaleString()}đ</td>
                <td class="px-6 py-4">${c.price_next_hour.toLocaleString()}đ</td>
                <td class="px-6 py-4">${c.price_overnight.toLocaleString()}đ</td>
                <td class="px-6 py-4">${c.price_daily.toLocaleString()}đ</td>
                <td class="px-6 py-4 text-right">
                    <button onclick='openPriceModal(${JSON.stringify(c)})' class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

function openPriceModal(cat) {
    document.getElementById('edit-cat-id').value = cat.id;
    document.getElementById('edit-cat-name').innerText = cat.name;
    document.getElementById('edit-p1').value = cat.price_first_hour;
    document.getElementById('edit-p2').value = cat.price_next_hour;
    document.getElementById('edit-p3').value = cat.price_overnight;
    document.getElementById('edit-p4').value = cat.price_daily;
    document.getElementById('price-modal').classList.remove('hidden');
}

function closePriceModal() { document.getElementById('price-modal').classList.add('hidden'); }

async function confirmUpdatePrice() {
    const id = document.getElementById('edit-cat-id').value;
    const payload = {
        price_first_hour: parseInt(document.getElementById('edit-p1').value),
        price_next_hour: parseInt(document.getElementById('edit-p2').value),
        price_overnight: parseInt(document.getElementById('edit-p3').value),
        price_daily: parseInt(document.getElementById('edit-p4').value)
    };
    const res = await fetch(`${API_URL}/admin/room-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Role': currentUser.role },
        body: JSON.stringify(payload)
    });
    if (res.ok) { closePriceModal(); fetchCategories(); } else { alert("Lỗi khi cập nhật!"); }
}

async function fetchRooms() {
    try {
        const res = await fetch(`${API_URL}/rooms`);
        const rooms = await res.json();
        const container = document.getElementById('rooms-container');
        container.innerHTML = '';

        const floorGroups = {};
        rooms.forEach(r => {
            const f = r.floor || 1;
            if (!floorGroups[f]) floorGroups[f] = [];
            floorGroups[f].push(r);
        });

        const floors = Object.keys(floorGroups).map(Number).sort((a, b) => a - b);

        floors.forEach(f => {
            const row = document.createElement('div');
            row.className = "space-y-6";

            const floorLabel = document.createElement('div');
            floorLabel.className = "flex items-center gap-4";
            floorLabel.innerHTML = `<span class="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Tầng ${f}</span><div class="h-px w-full bg-gray-100"></div>`;
            row.appendChild(floorLabel);

            const grid = document.createElement('div');
            grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8";

            const roomsOnFloor = floorGroups[f].sort((a, b) => a.room_number.localeCompare(b.room_number));
            roomsOnFloor.forEach((room, index) => {
                const card = createRoomCard(room);
                card.style.animationDelay = `${index * 0.05}s`;
                card.classList.add('animate-slide-in');
                grid.appendChild(card);
            });

            if (currentUser && currentUser.role === 'ADMIN') {
                const addBtnCard = document.createElement('div');
                addBtnCard.className = "fluent-card flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-transparent hover:bg-gray-50 cursor-pointer p-10 group transition-all h-[320px]";
                addBtnCard.onclick = () => openAddRoomModal(f, roomsOnFloor);
                addBtnCard.innerHTML = `
                    <div class="flex flex-col items-center gap-3">
                        <div class="p-4 bg-gray-50 rounded-full group-hover:bg-blue-50 transition-colors">
                            <i data-lucide="plus" class="w-8 h-8 text-gray-300 group-hover:text-blue-500"></i>
                        </div>
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-blue-600">Thêm phòng mới</p>
                    </div>
                `;
                grid.appendChild(addBtnCard);
            }

            row.appendChild(grid);
            container.appendChild(row);
        });

        if (currentUser && currentUser.role === 'ADMIN') {
            const nextFloor = (floors.length > 0 ? Math.max(...floors) : 0) + 1;
            const addFloorBtn = document.createElement('button');
            addFloorBtn.className = "w-full py-8 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all font-black text-xs uppercase tracking-widest mt-4 mb-10";
            addFloorBtn.onclick = () => openAddRoomModal(nextFloor, []);
            addFloorBtn.innerHTML = `<i data-lucide="plus-circle" class="w-5 h-5"></i> Thêm tầng ${nextFloor}`;
            container.appendChild(addFloorBtn);
        }

        lucide.createIcons();
        setTimeout(() => {
            document.querySelectorAll('.fluent-card').forEach((el, i) => {
                setTimeout(() => el.classList.add('active'), i * 20);
            });
        }, 100);
    } catch (e) { console.error(e); }
}

// --- Add Room Logic ---
async function openAddRoomModal(floor, existingRoomsOnFloor) {
    document.getElementById('add-room-floor').value = floor;
    document.getElementById('add-room-floor-label').innerText = floor;

    let suggestedNum = `${floor}01`;
    if (existingRoomsOnFloor && existingRoomsOnFloor.length > 0) {
        const numbers = existingRoomsOnFloor.map(r => {
            const match = String(r.room_number).match(/\d+/);
            return match ? parseInt(match[0]) : 0;
        });
        const max = Math.max(...numbers);
        suggestedNum = `${max + 1}`;
    }
    document.getElementById('add-room-number').value = suggestedNum;

    const res = await fetch(`${API_URL}/admin/room-categories`);
    const cats = await res.json();
    const select = document.getElementById('add-room-category');
    select.innerHTML = cats.map(c => `<option value="${c.id}">${c.name} (${c.price_first_hour.toLocaleString()}đ)</option>`).join('');

    document.getElementById('add-room-modal').classList.remove('hidden');
}

function closeAddRoomModal() { document.getElementById('add-room-modal').classList.add('hidden'); }

async function confirmAddRoom() {
    let roomNum = document.getElementById('add-room-number').value.trim();
    roomNum = roomNum.replace(/^[Pp]\.?/, '');

    const payload = {
        room_number: roomNum,
        floor: parseInt(document.getElementById('add-room-floor').value),
        category_id: parseInt(document.getElementById('add-room-category').value)
    };
    const res = await fetch(`${API_URL}/admin/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Role': currentUser.role },
        body: JSON.stringify(payload)
    });
    if (res.ok) { closeAddRoomModal(); fetchRooms(); } else { const err = await res.json(); alert(err.detail); }
}

function createRoomCard(room) {
    const div = document.createElement('div');
    const statusMap = { 'AVAILABLE': { label: 'Phòng trống', color: 'text-green-600', bg: 'bg-green-50', icon: 'sparkles' }, 'OCCUPIED': { label: 'Có khách', color: 'text-red-600', bg: 'bg-red-50', icon: 'user' }, 'CLEANING': { label: 'Đang dọn', color: 'text-amber-600', bg: 'bg-amber-50', icon: 'brush' } };
    const s = statusMap[room.status];
    div.className = "fluent-card flex flex-col opacity-0 group relative";

    let deleteBtn = (room.status === 'AVAILABLE' && currentUser.role === 'ADMIN') ? `<button onclick="deleteRoom(${room.id})" class="absolute top-2 right-2 p-1.5 bg-white/80 text-red-500 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all border border-red-100 z-10"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : '';

    let actionBtn = room.status === 'AVAILABLE' ? `<button onclick="openCheckIn(${room.id}, '${room.room_number}')" class="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm">Nhận phòng</button>` : room.status === 'OCCUPIED' ? `<div class="grid grid-cols-2 gap-2"><button onclick="openServiceModal(${room.active_booking_id})" class="py-2 bg-indigo-50 text-indigo-600 border rounded-lg font-bold text-xs">Dịch vụ</button><button onclick="openBillModal(${room.active_booking_id})" class="py-2 bg-red-600 text-white rounded-lg font-bold text-xs">Trả phòng</button></div>` : `<button onclick="finishCleaning(${room.id})" class="w-full py-2.5 bg-amber-500 text-white rounded-lg font-bold text-sm">Dọn xong</button>`;
    let displayNum = room.room_number;
    if (!String(displayNum).startsWith('P.')) displayNum = 'P.' + displayNum;

    div.innerHTML = `${deleteBtn}<div class="p-6 flex-1"><div class="flex justify-between items-start mb-6"><div class="p-3 ${s.bg} rounded-xl"><i data-lucide="${s.icon}" class="w-6 h-6 ${s.color}"></i></div><span class="text-[10px] font-black uppercase px-3 py-1 ${s.bg} ${s.color} rounded-full border border-current">${s.label}</span></div><h3 class="text-3xl font-black text-gray-800 mb-1">${displayNum}</h3><p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">${room.category_name}</p><div class="pt-4 border-t"><p class="text-[10px] font-bold text-gray-400 uppercase">Giá mở cửa</p><p class="text-xl font-black text-gray-800">${room.price_first_hour.toLocaleString('vi-VN')}đ</p></div></div><div class="p-4 bg-gray-50/80 border-t">${actionBtn}</div>`;
    return div;
}

async function deleteRoom(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa phòng này?")) return;
    const res = await fetch(`${API_URL}/admin/rooms/${id}`, { method: 'DELETE', headers: { 'X-Role': currentUser.role } });
    if (res.ok) fetchRooms(); else { const err = await res.json(); alert(err.detail); }
}

// --- Bill Logic ---
async function openBillModal(bookingId) {
    currentBookingId = bookingId;
    const content = document.getElementById('bill-content');
    content.innerHTML = '<div class="text-center py-10">Đang tính toán hóa đơn...</div>';
    document.getElementById('bill-modal').classList.remove('hidden');

    try {
        const res = await fetch(`${API_URL}/bookings/${bookingId}/preview`);
        const data = await res.json();

        let servicesHtml = data.service_details.length > 0
            ? data.service_details.map(s => `<div class="flex justify-between text-sm"><span>${s.name} x${s.qty}</span><span class="font-bold">${(s.qty * s.price).toLocaleString('vi-VN')}đ</span></div>`).join('')
            : '<p class="text-sm text-gray-400 italic">Không sử dụng dịch vụ</p>';

        content.innerHTML = `
            <div class="space-y-4">
                <div class="flex justify-between items-end border-b pb-4">
                    <div>
                        <p class="text-[10px] font-bold text-gray-400 uppercase">Phòng</p>
                        <p class="text-2xl font-black text-gray-800">P.${data.room_number}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] font-bold text-gray-400 uppercase">Thời gian ở</p>
                        <p class="text-lg font-bold text-gray-800">${data.hours_stayed} giờ</p>
                    </div>
                </div>
                
                <div class="space-y-2">
                    <p class="text-[10px] font-bold text-gray-400 uppercase">Tiền phòng</p>
                    <div class="flex justify-between">
                        <span>Giá thuê theo hình thức đã chọn</span>
                        <span class="font-bold text-gray-800">${data.room_charge.toLocaleString('vi-VN')}đ</span>
                    </div>
                </div>

                <div class="space-y-2">
                    <p class="text-[10px] font-bold text-gray-400 uppercase">Tiền dịch vụ</p>
                    ${servicesHtml}
                </div>

                <div class="pt-6 border-t-2 border-dashed border-gray-200">
                    <div class="flex justify-between items-center">
                        <span class="text-lg font-bold text-gray-800">TỔNG CỘNG</span>
                        <span class="text-3xl font-black text-red-600">${data.total_amount.toLocaleString('vi-VN')}đ</span>
                    </div>
                </div>
            </div>
        `;

        const btn = document.getElementById('confirm-payment-btn');
        if (data.status === 'COMPLETED') {
            btn.classList.add('hidden');
        } else {
            btn.classList.remove('hidden');
            btn.onclick = () => confirmCheckOut(bookingId);
        }
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

function closeBillModal() { document.getElementById('bill-modal').classList.add('hidden'); }

async function confirmCheckOut(bookingId) {
    try {
        const res = await fetch(`${API_URL}/bookings/${bookingId}/check-out`, { method: 'POST' });
        if (res.ok) {
            alert("Thanh toán thành công! Phòng đã chuyển sang trạng thái chờ dọn.");
            closeBillModal();
            fetchRooms();
        }
    } catch (e) { console.error(e); }
}

async function fetchStaff() {
    const res = await fetch(`${API_URL}/admin/staff`, { headers: { 'X-Role': currentUser.role } });
    const staff = await res.json();
    const tbody = document.getElementById('staff-table-body');
    tbody.innerHTML = '';
    staff.forEach(s => {
        const row = document.createElement('tr');
        row.className = "border-b hover:bg-gray-50 transition-all";
        row.innerHTML = `<td class="px-6 py-4 text-sm text-gray-500">#${s.id}</td><td class="px-6 py-4 text-sm font-bold text-gray-800">${s.username}</td><td class="px-6 py-4"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.role === 'ADMIN' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}">${s.role}</span></td>`;
        tbody.appendChild(row);
    });
    lucide.createIcons();
}

async function fetchRevenue() {
    const res = await fetch(`${API_URL}/admin/revenue`, { headers: { 'X-Role': currentUser.role } });
    const data = await res.json();
    document.getElementById('stat-total-revenue').innerText = data.total_revenue.toLocaleString('vi-VN') + "đ";
    document.getElementById('stat-room-revenue').innerText = data.room_revenue.toLocaleString('vi-VN') + "đ";
    document.getElementById('stat-service-revenue').innerText = data.service_revenue.toLocaleString('vi-VN') + "đ";
}

function openCheckIn(id, num) { currentRoomId = id; document.getElementById('modal-room-number').innerText = num; document.getElementById('checkin-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('checkin-modal').classList.add('hidden'); }
async function confirmCheckIn() {
    const payload = { room_id: currentRoomId, user_id: currentUser.id, guest_name: document.getElementById('guest-name').value, guest_id_number: document.getElementById('guest-id').value, guest_dob: document.getElementById('guest-dob').value, rental_type: document.getElementById('rental-type').value };
    const res = await fetch(`${API_URL}/bookings/check-in`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { closeModal(); fetchRooms(); } else { const err = await res.json(); alert(err.detail.map(d => d.msg).join("\n")); }
}

let selectedServices = [];
let allServices = [];

async function openServiceModal(bookingId) {
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
                    <p class="text-xs font-black text-indigo-500">${s.price.toLocaleString('vi-VN')}đ</p>
                </div>
                <div class="flex items-center gap-2">
                    <div class="flex items-center border rounded-lg bg-gray-50">
                        <button onclick="updateQtyInList(${s.id}, -1)" class="p-1.5 hover:text-indigo-600"><i data-lucide="minus" class="w-3.5 h-3.5"></i></button>
                        <input type="number" id="qty-input-${s.id}" value="1" class="w-8 text-center bg-transparent border-none text-xs font-bold focus:ring-0 p-0" min="1">
                        <button onclick="updateQtyInList(${s.id}, 1)" class="p-1.5 hover:text-indigo-600"><i data-lucide="plus" class="w-3.5 h-3.5"></i></button>
                    </div>
                    <button onclick="addToSelection(${s.id})" class="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                        <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            list.appendChild(item);
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

function updateQtyInList(id, delta) {
    const input = document.getElementById(`qty-input-${id}`);
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;
}

function addToSelection(serviceId) {
    const qty = parseInt(document.getElementById(`qty-input-${serviceId}`).value);
    const service = allServices.find(s => s.id === serviceId);
    const existing = selectedServices.find(s => s.id === serviceId);
    if (existing) {
        existing.quantity += qty;
    } else {
        selectedServices.push({ ...service, quantity: qty });
    }
    renderSelectedServices();
}

function removeFromSelection(serviceId) {
    selectedServices = selectedServices.filter(s => s.id !== serviceId);
    renderSelectedServices();
}

function renderSelectedServices() {
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
                <button onclick="removeFromSelection(${s.id})" class="p-1 text-gray-300 hover:text-red-500 transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    }).join('');
    totalEl.innerText = total.toLocaleString('vi-VN') + "đ";
    lucide.createIcons();
}

async function confirmBatchServices() {
    if (selectedServices.length === 0) return alert("Vui lòng chọn ít nhất 1 dịch vụ!");
    const payload = {
        services: selectedServices.map(s => ({ service_id: s.id, quantity: s.quantity }))
    };
    try {
        const res = await fetch(`${API_URL}/bookings/${currentBookingId}/batch-services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeServiceModal();
            alert("Đã thêm dịch vụ thành công!");
            fetchRooms();
        }
    } catch (e) { console.error(e); }
}

function closeServiceModal() { document.getElementById('service-modal').classList.add('hidden'); }

async function finishCleaning(roomId) { await fetch(`${API_URL}/rooms/${roomId}/clean`, { method: 'POST' }); fetchRooms(); }

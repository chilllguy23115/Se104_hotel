import { API_URL, getHeaders } from './config.js';
import { currentUser } from './auth.js';

export let currentRoomsList = [];

export async function fetchRooms() {
    try {
        const res = await fetch(`${API_URL}/rooms`);
        const rooms = await res.json();
        currentRoomsList = rooms;
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
            row.className = "space-y-6 mb-10";

            const floorLabel = document.createElement('div');
            floorLabel.className = "flex items-center gap-4";
            floorLabel.innerHTML = `<span class="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Tầng ${f}</span><div class="h-px w-full bg-gray-100"></div>`;
            row.appendChild(floorLabel);

            const grid = document.createElement('div');
            grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8";

            const roomsOnFloor = floorGroups[f].sort((a, b) => a.room_number.localeCompare(b.room_number));
            roomsOnFloor.forEach((room, index) => {
                const card = createRoomCard(room);
                grid.appendChild(card);
            });

            if (currentUser && currentUser.role === 'ADMIN') {
                const addBtnCard = document.createElement('div');
                addBtnCard.className = "fluent-card flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-transparent hover:bg-gray-50 cursor-pointer p-10 group transition-all h-[320px]";
                addBtnCard.onclick = () => window.openAddRoomModal(f, roomsOnFloor);
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
            addFloorBtn.onclick = () => window.openAddRoomModal(nextFloor, []);
            addFloorBtn.innerHTML = `<i data-lucide="plus-circle" class="w-5 h-5"></i> Thêm tầng ${nextFloor}`;
            container.appendChild(addFloorBtn);
        }

        lucide.createIcons();
    } catch (e) { console.error(e); }
}

export function createRoomCard(room) {
    const div = document.createElement('div');
    const statusMap = { 
        'AVAILABLE': { label: 'Phòng trống', color: 'text-green-600', bg: 'bg-green-50', icon: 'sparkles' }, 
        'OCCUPIED': { label: 'Có khách', color: 'text-red-600', bg: 'bg-red-50', icon: 'user' }, 
        'CLEANING': { label: 'Đang dọn', color: 'text-amber-600', bg: 'bg-amber-50', icon: 'brush' } 
    };
    const s = statusMap[room.status];
    div.className = "fluent-card flex flex-col group relative";

    let deleteBtn = (room.status === 'AVAILABLE' && currentUser && currentUser.role === 'ADMIN') ? `<button onclick="window.deleteRoom(${room.id})" class="absolute top-2 right-2 p-1.5 bg-white/80 text-red-500 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all border border-red-100 z-10" title="Xóa phòng"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : '';
    let uploadBtn = (currentUser && currentUser.role === 'ADMIN') ? `<button onclick="window.openUploadModal(${room.id}, '${room.room_number}')" class="absolute top-2 right-9 p-1.5 bg-white/80 text-indigo-600 rounded-full opacity-0 group-hover:opacity-100 hover:bg-indigo-50 transition-all border border-indigo-100 z-10" title="Tải ảnh lên"><i data-lucide="upload-cloud" class="w-3.5 h-3.5"></i></button>` : '';

    let actionBtn = "";
    if (currentUser && currentUser.role === 'GUEST') {
        actionBtn = `<button onclick="window.openViewRoomModal(${room.id})" class="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-100"><i data-lucide="image" class="w-4 h-4"></i> Xem hình ảnh</button>`;
    } else if (currentUser && currentUser.role === 'JANITOR') {
        if (room.status === 'CLEANING') {
            actionBtn = `<div class="flex flex-col gap-2">
                <button onclick="window.finishCleaning(${room.id})" class="w-full py-2.5 bg-amber-500 text-white rounded-lg font-bold text-sm hover:bg-amber-600 transition-all">Dọn xong</button>
                <button onclick="window.openViewRoomModal(${room.id})" class="w-full py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5"><i data-lucide="image" class="w-3.5 h-3.5"></i> Xem phòng</button>
            </div>`;
        } else {
            actionBtn = `<div class="flex flex-col gap-2">
                <button class="w-full py-2.5 bg-gray-100 text-gray-400 rounded-lg font-bold text-sm cursor-not-allowed" disabled>${room.status === 'AVAILABLE' ? 'Phòng trống' : 'Có khách'}</button>
                <button onclick="window.openViewRoomModal(${room.id})" class="w-full py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5"><i data-lucide="image" class="w-3.5 h-3.5"></i> Xem phòng</button>
            </div>`;
        }
    } else {
        if (room.status === 'AVAILABLE') {
            actionBtn = `<div class="flex gap-2">
                <button onclick="window.openViewRoomModal(${room.id})" class="px-3 py-2.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 transition-all" title="Xem phòng"><i data-lucide="image" class="w-4 h-4"></i></button>
                <button onclick="window.openCheckIn(${room.id}, '${room.room_number}')" class="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all">Nhận phòng</button>
            </div>`;
        } else if (room.status === 'OCCUPIED') {
            actionBtn = `<div class="flex flex-col gap-2">
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="window.openServiceModal(${room.active_booking_id})" class="py-2 bg-indigo-50 text-indigo-600 border rounded-lg font-bold text-xs hover:bg-indigo-100 transition-all">Dịch vụ</button>
                    <button onclick="window.openBillModal(${room.active_booking_id})" class="py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-all">Trả phòng</button>
                </div>
                <button onclick="window.openViewRoomModal(${room.id})" class="w-full py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5"><i data-lucide="image" class="w-3.5 h-3.5"></i> Xem phòng</button>
            </div>`;
        } else {
            actionBtn = `<div class="flex flex-col gap-2">
                <button class="w-full py-2.5 bg-gray-100 text-gray-400 rounded-lg font-bold text-sm cursor-not-allowed" disabled>Đang dọn phòng...</button>
                <button onclick="window.openViewRoomModal(${room.id})" class="w-full py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5"><i data-lucide="image" class="w-3.5 h-3.5"></i> Xem phòng</button>
            </div>`;
        }
    }
    
    let displayNum = room.room_number;
    if (!String(displayNum).startsWith('P.')) displayNum = 'P.' + displayNum;

    div.innerHTML = `${deleteBtn}${uploadBtn}<div class="p-6 flex-1"><div class="flex justify-between items-start mb-6"><div class="p-3 ${s.bg} rounded-xl"><i data-lucide="${s.icon}" class="w-6 h-6 ${s.color}"></i></div><span class="text-[10px] font-black uppercase px-3 py-1 ${s.bg} ${s.color} rounded-full border border-current">${s.label}</span></div><h3 class="text-3xl font-black text-gray-800 mb-1">${displayNum}</h3><p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">${room.category_name}</p><div class="pt-4 border-t"><p class="text-[10px] font-bold text-gray-400 uppercase">Giá mở cửa</p><p class="text-xl font-black text-gray-800">${room.price_first_hour.toLocaleString('vi-VN')}đ</p></div></div><div class="p-4 bg-gray-50/80 border-t">${actionBtn}</div>`;
    return div;
}

export async function openAddRoomModal(floor, existingRoomsOnFloor) {
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

    const res = await fetch(`${API_URL}/admin/room-categories`, { headers: getHeaders() });
    const cats = await res.json();
    const select = document.getElementById('add-room-category');
    select.innerHTML = cats.map(c => `<option value="${c.id}">${c.name} (${c.price_first_hour.toLocaleString()}đ)</option>`).join('');

    document.getElementById('add-room-modal').classList.remove('hidden');
}

export async function confirmAddRoom() {
    let roomNum = document.getElementById('add-room-number').value.trim();
    roomNum = roomNum.replace(/^[Pp]\.?/, '');

    const payload = {
        room_number: roomNum,
        floor: parseInt(document.getElementById('add-room-floor').value),
        category_id: parseInt(document.getElementById('add-room-category').value)
    };
    const res = await fetch(`${API_URL}/admin/rooms`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (res.ok) { 
        document.getElementById('add-room-modal').classList.add('hidden'); 
        fetchRooms(); 
    } else { 
        const err = await res.json(); 
        alert(err.detail); 
    }
}

export async function deleteRoom(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa phòng này?")) return;
    const res = await fetch(`${API_URL}/admin/rooms/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (res.ok) fetchRooms(); else { const err = await res.json(); alert(err.detail); }
}

export async function finishCleaning(roomId) { 
    const res = await fetch(`${API_URL}/rooms/${roomId}/clean`, { 
        method: 'POST',
        headers: getHeaders()
    }); 
    if (res.ok) {
        fetchRooms(); 
    } else {
        const err = await res.json();
        alert(err.detail);
    }
}

export function openViewRoomModal(roomId) {
    const room = currentRoomsList.find(r => r.id === roomId);
    if (!room) return;
    
    const modal = document.getElementById('view-room-modal');
    const numSpan = document.getElementById('view-room-number');
    const img = document.getElementById('view-room-img');
    const desc = document.getElementById('view-room-desc');
    const price = document.getElementById('view-room-price');
    const thumbnailsContainer = document.getElementById('view-room-thumbnails');

    numSpan.innerText = room.room_number.startsWith('P.') ? room.room_number : 'P.' + room.room_number;
    
    const catUpper = room.category_name.toUpperCase();
    const defaultImg = catUpper.includes('VIP') ? 'vip_room.png' : 'standard_room.png';
    
    const img1 = room.image1 || defaultImg;
    const img2 = room.image2 || defaultImg;
    
    img.src = img1;
    
    if (catUpper.includes('VIP')) {
        desc.innerText = `Phòng VIP sang trọng bậc nhất với đầy đủ tiện nghi cao cấp, giường cỡ King êm ái, nội thất nhập khẩu và không gian rộng rãi đẳng cấp.`;
    } else {
        desc.innerText = `Phòng Standard ấm cúng, đầy đủ tiện ích cơ bản, không gian sạch sẽ, nệm lò xo cao cấp mang lại giấc ngủ thư thái nhất cho quý khách.`;
    }
    
    const thumbnails = [img1, img2];
    const imgsHtml = thumbnails.map((src, index) => {
        const borderClass = index === 0 ? 'border-blue-600' : 'border-transparent';
        return `<img onclick="window.switchMainImage(this)" class="w-16 h-12 object-cover rounded-lg border-2 ${borderClass} cursor-pointer hover:opacity-85 transition-all thumbnail-item" src="${src}" alt="Hình ${index + 1}">`;
    }).join('');
    
    thumbnailsContainer.innerHTML = imgsHtml;
    
    price.innerText = `Giá mở cửa: ${room.price_first_hour.toLocaleString('vi-VN')}đ / giờ đầu`;
    modal.classList.remove('hidden');
    lucide.createIcons();
}

export function closeViewRoomModal() {
    document.getElementById('view-room-modal').classList.add('hidden');
}

export function switchMainImage(el) {
    const mainImg = document.getElementById('view-room-img');
    
    mainImg.classList.add('opacity-0');
    setTimeout(() => {
        mainImg.src = el.src;
        mainImg.classList.remove('opacity-0');
    }, 150);

    const thumbnails = document.querySelectorAll('.thumbnail-item');
    thumbnails.forEach(t => {
        t.classList.remove('border-blue-600');
        t.classList.add('border-transparent');
    });
    el.classList.remove('border-transparent');
    el.classList.add('border-blue-600');
}

export function openUploadModal(roomId, roomNumber) {
    document.getElementById('upload-room-id').value = roomId;
    document.getElementById('upload-room-number').innerText = roomNumber.startsWith('P.') ? roomNumber : 'P.' + roomNumber;
    
    document.getElementById('upload-img-1').value = '';
    document.getElementById('upload-img-2').value = '';
    
    document.getElementById('upload-images-modal').classList.remove('hidden');
}

export function closeUploadModal() {
    document.getElementById('upload-images-modal').classList.add('hidden');
}

export async function handleImagesUpload(event) {
    event.preventDefault();
    
    const roomId = document.getElementById('upload-room-id').value;
    const file1 = document.getElementById('upload-img-1').files[0];
    const file2 = document.getElementById('upload-img-2').files[0];
    
    if (!file1 && !file2) {
        return alert("Vui lòng chọn ít nhất một hình ảnh để tải lên!");
    }
    
    const formData = new FormData();
    if (file1) formData.append('image1', file1);
    if (file2) formData.append('image2', file2);
    
    try {
        const res = await fetch(`${API_URL}/admin/rooms/${roomId}/upload-images`, {
            method: 'POST',
            headers: {
                'X-Role': currentUser ? currentUser.role : ''
            },
            body: formData
        });
        
        if (res.ok) {
            alert("Tải hình ảnh lên thành công!");
            closeUploadModal();
            fetchRooms();
        } else {
            const err = await res.json();
            alert(err.detail || "Đã xảy ra lỗi khi tải ảnh lên!");
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối đến server!");
    }
}

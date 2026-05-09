import { API_URL, getHeaders } from './config.js';
import { currentUser } from './auth.js';
import { fetchRooms } from './rooms.js';

let currentRoomId = null;
let currentBookingId = null;

export function openCheckIn(id, num) { 
    currentRoomId = id; 
    document.getElementById('modal-room-number').innerText = num; 
    document.getElementById('checkin-modal').classList.remove('hidden'); 
}

export async function confirmCheckIn() {
    const payload = { 
        room_id: currentRoomId, 
        user_id: currentUser.id, 
        guest_name: document.getElementById('guest-name').value, 
        guest_id_number: document.getElementById('guest-id').value, 
        guest_dob: document.getElementById('guest-dob').value, 
        rental_type: document.getElementById('rental-type').value 
    };
    const res = await fetch(`${API_URL}/bookings/check-in`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify(payload) 
    });
    if (res.ok) { 
        document.getElementById('checkin-modal').classList.add('hidden'); 
        fetchRooms(); 
    } else { 
        const err = await res.json(); 
        alert(err.detail.map(d => d.msg).join("\n")); 
    }
}

export async function openBillModal(bookingId) {
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
        const payContainer = document.getElementById('payment-method-container');

        if (data.status === 'COMPLETED') {
            btn.classList.add('hidden');
            payContainer.classList.add('hidden');
            const pMethod = data.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản';
            content.insertAdjacentHTML('beforeend', `
                <div class="mt-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p class="text-[10px] font-bold text-gray-400 uppercase">Phương thức đã thanh toán</p>
                    <p class="font-bold text-gray-800">${pMethod}</p>
                </div>
            `);
        } else {
            btn.classList.remove('hidden');
            payContainer.classList.remove('hidden');
            btn.onclick = () => window.confirmCheckOut(bookingId);
        }
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

export async function confirmCheckOut(bookingId) {
    try {
        const method = document.querySelector('input[name="pay-method"]:checked').value;
        const res = await fetch(`${API_URL}/bookings/${bookingId}/check-out`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ payment_method: method })
        });
        if (res.ok) {
            alert("Thanh toán thành công! Phòng đã chuyển sang trạng thái chờ dọn.");
            document.getElementById('bill-modal').classList.add('hidden');
            fetchRooms();
        }
    } catch (e) { console.error(e); }
}

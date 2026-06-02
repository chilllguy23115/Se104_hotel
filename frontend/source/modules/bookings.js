import { API_URL, getHeaders } from './config.js';
import { currentUser } from './auth.js';
import { fetchRooms } from './rooms.js';

let currentRoomId = null;
let currentBookingId = null;

export function openCheckIn(id, num) { 
    currentRoomId = id; 
    document.getElementById('modal-room-number').innerText = num; 

    // Set default and min check-in date/time separately
    const checkinDateInput = document.getElementById('checkin-date');
    const checkinTimeInput = document.getElementById('checkin-time');
    if (checkinDateInput && checkinTimeInput) {
        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000;
        const localISO = (new Date(now - tzOffset)).toISOString();
        
        const localDate = localISO.slice(0, 10);
        const localTime = localISO.slice(11, 16);

        checkinDateInput.value = localDate;
        checkinDateInput.min = localDate;
        checkinTimeInput.value = localTime;
    }

    document.getElementById('checkin-modal').classList.remove('hidden'); 
}

export async function confirmCheckIn() {
    const dateVal = document.getElementById('checkin-date').value;
    const timeVal = document.getElementById('checkin-time').value;
    
    if (!dateVal || !timeVal) {
        alert("Vui lòng điền đầy đủ Ngày và Giờ nhận phòng!");
        return;
    }

    const name = document.getElementById('guest-name').value.trim();
    const idNum = document.getElementById('guest-id').value.trim();
    const dob = document.getElementById('guest-dob').value.trim();

    if (!name || !idNum || !dob) {
        alert("Vui lòng nhập đầy đủ thông tin Khách hàng!");
        return;
    }

    const nameRegex = /^[a-zA-Z\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểếệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ\s]+$/;
    if (!nameRegex.test(name)) {
        alert("Họ tên khách hàng chỉ được chứa chữ cái và khoảng trắng!");
        return;
    }
    if (!name.includes(' ')) {
        alert("Họ tên khách hàng phải có ít nhất một dấu cách (bao gồm Họ và Tên)!");
        return;
    }

    if (!/^\d+$/.test(idNum)) {
        alert("Số CCCD phải là dãy số!");
        return;
    }
    if (idNum.length !== 9 && idNum.length !== 12) {
        alert("Số CCCD phải có 9 hoặc 12 chữ số!");
        return;
    }

    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
        alert("Định dạng ngày sinh không hợp lệ!");
        return;
    }
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
    }
    if (age < 18) {
        alert("Khách hàng phải từ 18 tuổi trở lên!");
        return;
    }

    const [year, month, day] = dateVal.split('-').map(Number);
    const [hour, minute] = timeVal.split(':').map(Number);
    const selectedTime = new Date(year, month - 1, day, hour, minute);
    
    const now = new Date();
    if (selectedTime < new Date(now.getTime() - 60000)) {
        alert("Thời gian nhận phòng không được trước thời gian hiện tại!");
        return;
    }

    const payload = { 
        room_id: currentRoomId, 
        user_id: currentUser.id, 
        guest_name: name, 
        guest_id_number: idNum, 
        guest_dob: dob, 
        rental_type: document.getElementById('rental-type').value,
        check_in_time: selectedTime.toISOString()
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
        if (Array.isArray(err.detail)) {
            alert(err.detail.map(d => d.msg).join("\n")); 
        } else {
            alert(err.detail || "Đã xảy ra lỗi khi nhận phòng!");
        }
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
            
            // Reset to CASH and hide QR code when opening the checkout modal
            const cashRadio = document.querySelector('input[name="pay-method"][value="CASH"]');
            if (cashRadio) cashRadio.checked = true;
            const qrContainer = document.getElementById('qrcode-display-container');
            if (qrContainer) qrContainer.classList.add('hidden');
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

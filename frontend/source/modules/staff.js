import { API_URL, getHeaders } from './config.js';

export async function fetchStaff() {
    const res = await fetch(`${API_URL}/admin/staff`, { headers: getHeaders() });
    const staff = await res.json();
    const tbody = document.getElementById('staff-table-body');
    tbody.innerHTML = '';
    staff.forEach(s => {
        const row = document.createElement('tr');
        row.className = "border-b hover:bg-gray-50 transition-all";
        row.innerHTML = `<td class="px-6 py-4 text-sm text-gray-500">#${s.id}</td><td class="px-6 py-4 text-sm font-bold text-gray-800">${s.username}</td><td class="px-6 py-4"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.role === 'ADMIN' ? 'bg-purple-50 text-purple-600' : s.role === 'JANITOR' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}">${s.role}</span></td>`;
        tbody.appendChild(row);
    });
    lucide.createIcons();
}

export async function handleRegister() {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const passConfirm = document.getElementById('reg-pass-confirm').value.trim();
    const role = document.getElementById('reg-role').value;
    if (!user || !pass || !passConfirm) return alert("Vui lòng nhập đủ thông tin!");

    if (user.length < 3) {
        return alert("Tên đăng nhập phải có ít nhất 3 ký tự!");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(user)) {
        return alert("Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới (không chứa dấu cách hay ký tự đặc biệt)!");
    }
    if (pass.length < 6) {
        return alert("Mật khẩu phải có ít nhất 6 ký tự!");
    }
    if (pass !== passConfirm) {
        return alert("Mật khẩu xác nhận không khớp!");
    }

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ username: user, password: pass, role: role })
        });
        if (res.ok) {
            alert("Đăng ký thành công! Hãy đăng nhập.");
            window.toggleAuth('login');
        } else { 
            const err = await res.json();
            if (Array.isArray(err.detail)) {
                alert(err.detail.map(d => d.msg).join("\n"));
            } else {
                alert(err.detail || "Đã có lỗi xảy ra!");
            }
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối đến server!");
    }
}

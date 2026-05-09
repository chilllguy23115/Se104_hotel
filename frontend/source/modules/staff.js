import { API_URL, getHeaders } from './config.js';

export async function fetchStaff() {
    const res = await fetch(`${API_URL}/admin/staff`, { headers: getHeaders() });
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

export async function handleRegister() {
    const user = document.getElementById('reg-user').value;
    const pass = document.getElementById('reg-pass').value;
    const role = document.getElementById('reg-role').value;
    if (!user || !pass) return alert("Vui lòng nhập đủ thông tin!");
    try {
        const res = await fetch(`${API_URL}/admin/staff`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ username: user, password: pass, role: role })
        });
        if (res.ok) {
            alert("Đăng ký thành công! Hãy đăng nhập.");
            window.toggleAuth('login');
        } else { alert("Tên đăng nhập đã tồn tại!"); }
    } catch (e) { console.error(e); }
}

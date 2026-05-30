import { API_URL } from './config.js';

export let currentUser = JSON.parse(localStorage.getItem('hotel_user'));

export async function login() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    if (!user || !pass) return alert("Vui lòng nhập đủ thông tin!");

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        if (res.ok) {
            const userData = await res.json();
            localStorage.setItem('hotel_user', JSON.stringify(userData));
            localStorage.removeItem('shift_ended');
            
            // Tự động bắt đầu ca trực (không để lỗi này chặn việc đăng nhập)
            try {
                await fetch(`${API_URL}/shifts/start/${userData.id}`, { method: 'POST' });
            } catch (e) { console.error("Auto-start shift failed", e); }
            
            window.location.reload();
        } else {
            alert("Sai tài khoản hoặc mật khẩu!");
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối đến server!");
    }
}

export function logout() {
    localStorage.removeItem('hotel_user');
    window.location.reload();
}

export function checkAuth() {
    if (!currentUser) {
        document.getElementById('auth-screen').classList.remove('hidden-section');
    } else {
        document.getElementById('auth-screen').classList.add('hidden-section');
        document.getElementById('main-sidebar').classList.remove('hidden-section');
        document.getElementById('main-content').classList.remove('hidden-section');
        document.getElementById('user-display-name').innerText = currentUser.username;
        
        let roleLabel = currentUser.role || 'Người dùng';
        if (currentUser.role === 'ADMIN') roleLabel = 'Quản lý';
        else if (currentUser.role === 'JANITOR') roleLabel = 'Lao công';
        else if (currentUser.role === 'RECEPTIONIST') roleLabel = 'Lễ tân';
        else if (currentUser.role === 'GUEST') roleLabel = 'Khách hàng';
        
        document.getElementById('user-display-role').innerText = roleLabel;
        
        if (currentUser.role === 'ADMIN') {
            document.getElementById('admin-nav').classList.remove('hidden-section');
        }
        
        if (currentUser.role === 'GUEST') {
            document.getElementById('nav-shift').classList.add('hidden-section');
            document.getElementById('nav-guest-chat').classList.remove('hidden-section');
            document.getElementById('nav-receptionist-chat').classList.add('hidden-section');
        } else {
            document.getElementById('nav-shift').classList.remove('hidden-section');
            document.getElementById('nav-guest-chat').classList.add('hidden-section');
            if (currentUser.role === 'RECEPTIONIST' || currentUser.role === 'ADMIN') {
                document.getElementById('nav-receptionist-chat').classList.remove('hidden-section');
            } else {
                document.getElementById('nav-receptionist-chat').classList.add('hidden-section');
            }
        }
    }
}

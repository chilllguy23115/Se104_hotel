import { API_URL, getHeaders } from './config.js';
import { currentUser } from './auth.js';

let notificationsPollInterval = null;
let displayedNotificationIds = new Set();
let isDropdownOpen = false;

export function startJanitorNotificationPolling() {
    if (!currentUser || currentUser.role !== 'JANITOR') {
        const bellContainer = document.getElementById('janitor-bell-container');
        if (bellContainer) bellContainer.classList.add('hidden');
        return;
    }

    // Show bell container for Janitor
    const bellContainer = document.getElementById('janitor-bell-container');
    if (bellContainer) bellContainer.classList.remove('hidden');

    // Poll immediately
    pollNotifications();

    if (!notificationsPollInterval) {
        notificationsPollInterval = setInterval(pollNotifications, 5000);
    }
}

async function pollNotifications() {
    if (!currentUser || currentUser.role !== 'JANITOR') {
        if (notificationsPollInterval) {
            clearInterval(notificationsPollInterval);
            notificationsPollInterval = null;
        }
        return;
    }

    try {
        const res = await fetch(`${API_URL}/janitor/notifications`, {
            headers: getHeaders()
        });
        if (!res.ok) return;

        const notifications = await res.json();
        
        // Find new notifications to toast
        notifications.forEach(n => {
            if (!displayedNotificationIds.has(n.id)) {
                displayedNotificationIds.add(n.id);
                // Trigger toast notification
                showToast(n.message, 'warning');
            }
        });

        // Update badge
        const badge = document.getElementById('janitor-bell-badge');
        const count = notifications.length;
        if (badge) {
            if (count > 0) {
                badge.innerText = count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        // Render in dropdown if container exists
        const listContainer = document.getElementById('janitor-notifications-list');
        if (listContainer) {
            if (count === 0) {
                listContainer.innerHTML = `
                    <div class="py-6 text-center text-xs text-gray-400 italic">
                        Không có yêu cầu minibar mới
                    </div>
                `;
            } else {
                listContainer.innerHTML = notifications.map(n => {
                    const time = new Date(n.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    return `
                        <div class="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-left">
                            <div class="flex-1">
                                <p class="text-xs font-bold text-gray-800">${escapeHtml(n.message)}</p>
                                <span class="text-[9px] text-gray-400 font-medium">${time}</span>
                            </div>
                            <button onclick="window.markNotificationRead(${n.id})" class="p-1 hover:bg-amber-50 text-amber-600 rounded-lg shrink-0 transition-colors" title="Đánh dấu đã đọc">
                                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    `;
                }).join('');
                lucide.createIcons();
            }
        }
    } catch (e) {
        console.error("Lỗi polling thông báo janitor:", e);
    }
}

export function toggleJanitorNotifications() {
    const dropdown = document.getElementById('janitor-notifications-dropdown');
    if (!dropdown) return;
    
    isDropdownOpen = !isDropdownOpen;
    if (isDropdownOpen) {
        dropdown.classList.remove('hidden');
        pollNotifications(); // Refresh list immediately
    } else {
        dropdown.classList.add('hidden');
    }
}

export async function markNotificationRead(id) {
    try {
        const res = await fetch(`${API_URL}/janitor/notifications/${id}/read`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (res.ok) {
            await pollNotifications();
        }
    } catch (e) {
        console.error(e);
    }
}

export async function markAllNotificationsRead() {
    try {
        const res = await fetch(`${API_URL}/janitor/notifications/read-all`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (res.ok) {
            await pollNotifications();
        }
    } catch (e) {
        console.error(e);
    }
}

// Function to show a premium Glassmorphism toast
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-start gap-3 p-4 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl animate-slide-in min-w-[300px] max-w-sm border-l-4 ${
        type === 'warning' ? 'border-l-amber-500 shadow-amber-100/50' : 'border-l-blue-500 shadow-blue-100/50'
    } transition-all duration-300 transform translate-x-0`;
    
    const icon = type === 'warning' ? 'bell-ring' : 'info';
    const iconColor = type === 'warning' ? 'text-amber-600' : 'text-blue-600';
    const bg = type === 'warning' ? 'bg-amber-50' : 'bg-blue-50';
    
    toast.innerHTML = `
        <div class="p-2 ${bg} ${iconColor} rounded-xl shrink-0">
            <i data-lucide="${icon}" class="w-5 h-5"></i>
        </div>
        <div class="flex-1 min-w-0 pt-0.5">
            <p class="text-xs font-black text-gray-800 tracking-wide uppercase mb-0.5">Thông báo minibar</p>
            <p class="text-xs font-medium text-gray-600 leading-relaxed">${escapeHtml(message)}</p>
        </div>
        <button onclick="this.parentElement.remove()" class="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors shrink-0">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
    `;
    container.appendChild(toast);
    lucide.createIcons();
    
    // Play a subtle web audio notification chime
    playNotificationSound();
    
    // Auto remove
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('opacity-0', 'scale-95', 'translate-x-4');
            setTimeout(() => toast.remove(), 300);
        }
    }, 6000);
}

function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Double chime
        const playTone = (freq, startTime, duration) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            
            gainNode.gain.setValueAtTime(0.12, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        const now = audioCtx.currentTime;
        playTone(523.25, now, 0.15); // C5
        playTone(659.25, now + 0.12, 0.3); // E5
    } catch (e) {
        console.warn("Audio Context is blocked or not supported by browser", e);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

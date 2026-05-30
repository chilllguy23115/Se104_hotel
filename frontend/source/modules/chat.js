import { API_URL, getHeaders } from './config.js';
import { currentUser } from './auth.js';

let activeThreadUsername = null;
let chatPollInterval = null;
let lastMessagesCount = 0;

export async function submitHomepageFeedback() {
    const nameInput = document.getElementById('home-contact-name');
    const phoneInput = document.getElementById('home-contact-phone');
    const messageInput = document.getElementById('home-contact-message');

    if (!currentUser || currentUser.role !== 'GUEST') {
        alert("Vui lòng đăng nhập với tài khoản Khách hàng (Guest) để gửi tin nhắn hỗ trợ/tư vấn!");
        return;
    }

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const message = messageInput.value.trim();

    if (!phone) {
        alert("Vui lòng nhập Số điện thoại!");
        return;
    }
    if (!message) {
        alert("Vui lòng nhập Nội dung lời nhắn!");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                guest_name: name || currentUser.username,
                phone_number: phone,
                message: message
            })
        });

        if (res.ok) {
            alert("Gửi yêu cầu tư vấn thành công! Lễ tân sẽ liên hệ lại với bạn.");
            nameInput.value = '';
            phoneInput.value = '';
            messageInput.value = '';
            
            // Nếu khách hàng đang mở phần Chat, tải lại chat
            const guestChatSect = document.getElementById('section-guest-chat');
            if (guestChatSect && !guestChatSect.classList.contains('hidden-section')) {
                loadGuestChat();
            }
        } else {
            const err = await res.json();
            alert(err.detail || "Đã xảy ra lỗi khi gửi yêu cầu!");
        }
    } catch (e) {
        console.error(e);
        alert("Không thể kết nối đến máy chủ!");
    }
}

export async function loadGuestChat() {
    if (!currentUser || currentUser.role !== 'GUEST') return;

    // Prefill name if empty
    const nameInput = document.getElementById('guest-chat-name');
    if (nameInput && !nameInput.value) {
        nameInput.value = currentUser.username;
    }

    const badge = document.getElementById('guest-chat-username-badge');
    if (badge) {
        badge.innerText = "@" + currentUser.username;
    }

    await fetchAndRenderGuestMessages();

    // Start auto polling if not already running
    if (!chatPollInterval) {
        chatPollInterval = setInterval(pollGuestMessages, 4000);
    }
}

async function fetchAndRenderGuestMessages(isSilent = false) {
    try {
        const res = await fetch(`${API_URL}/chat/my`, {
            headers: getHeaders()
        });
        if (!res.ok) return;

        const messages = await res.json();
        if (isSilent && messages.length === lastMessagesCount) {
            return; // No new messages, skip re-rendering to keep UI stable
        }
        
        lastMessagesCount = messages.length;
        const historyContainer = document.getElementById('guest-chat-history');
        if (!historyContainer) return;

        if (messages.length === 0) {
            historyContainer.innerHTML = `
                <div class="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-3">
                    <div class="p-4 bg-blue-50 text-blue-600 rounded-full">
                        <i data-lucide="message-square" class="w-8 h-8"></i>
                    </div>
                    <p class="text-sm font-bold text-gray-500">Chưa có tin nhắn nào</p>
                    <p class="text-xs text-gray-400 max-w-xs">Nhập tin nhắn ở bên dưới để bắt đầu trò chuyện trực tuyến với Lễ tân.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        historyContainer.innerHTML = messages.map(msg => {
            const time = new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            if (msg.sender_role === 'GUEST') {
                return `
                    <div class="flex flex-col items-end gap-1 mb-2">
                        <div class="bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-md text-sm shadow-sm">
                            ${escapeHtml(msg.message)}
                        </div>
                        <span class="text-[9px] text-gray-400 font-medium mr-1">${time}</span>
                    </div>
                `;
            } else {
                return `
                    <div class="flex flex-col items-start gap-1 mb-2">
                        <span class="text-[9px] text-gray-400 font-bold ml-1">Lễ tân nhà nghỉ</span>
                        <div class="bg-white text-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-sm border border-gray-200 max-w-md text-sm shadow-sm">
                            ${escapeHtml(msg.message)}
                        </div>
                        <span class="text-[9px] text-gray-400 font-medium ml-1">${time}</span>
                    </div>
                `;
            }
        }).join('');

        // Scroll to bottom
        historyContainer.scrollTop = historyContainer.scrollHeight;
    } catch (e) {
        console.error("Error fetching guest chat:", e);
    }
}

function pollGuestMessages() {
    const sect = document.getElementById('section-guest-chat');
    if (!sect || sect.classList.contains('hidden-section')) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
        return;
    }
    fetchAndRenderGuestMessages(true);
}

export async function sendGuestChatMessage() {
    const nameInput = document.getElementById('guest-chat-name');
    const phoneInput = document.getElementById('guest-chat-phone');
    const messageInput = document.getElementById('guest-chat-message-input');

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const message = messageInput.value.trim();

    if (!phone) {
        alert("Vui lòng nhập Số điện thoại liên hệ ở góc trên!");
        return;
    }
    if (!message) {
        return; // Don't send empty messages
    }

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                guest_name: name || currentUser.username,
                phone_number: phone,
                message: message
            })
        });

        if (res.ok) {
            messageInput.value = '';
            await fetchAndRenderGuestMessages();
        } else {
            const err = await res.json();
            alert(err.detail || "Đã xảy ra lỗi!");
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối máy chủ!");
    }
}

// ==================== RECEPTIONIST CHAT FUNCTIONS ====================

export async function loadReceptionistThreads() {
    try {
        const res = await fetch(`${API_URL}/chat/threads`, {
            headers: getHeaders()
        });
        if (!res.ok) return;

        const threads = await res.json();
        const threadsContainer = document.getElementById('receptionist-chat-threads');
        if (!threadsContainer) return;

        if (threads.length === 0) {
            threadsContainer.innerHTML = `
                <div class="p-8 text-center text-gray-400 text-sm">
                    Chưa có tin nhắn tư vấn nào.
                </div>
            `;
            return;
        }

        threadsContainer.innerHTML = threads.map(t => {
            const activeClass = activeThreadUsername === t.guest_username ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50 border-transparent';
            const time = new Date(t.created_at).toLocaleDateString('vi-VN') + ' ' + new Date(t.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            return `
                <div onclick="window.selectChatThread('${t.guest_username}', '${t.guest_name}', '${t.phone_number}')" 
                    class="p-4 border-l-4 cursor-pointer transition-all ${activeClass}">
                    <div class="flex justify-between items-start">
                        <span class="font-bold text-gray-800 text-sm">${escapeHtml(t.guest_name)}</span>
                        <span class="text-[9px] text-gray-400 font-medium">${time}</span>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                        <span class="text-xs text-gray-500 truncate max-w-[160px]">${escapeHtml(t.latest_message)}</span>
                        <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold">@${escapeHtml(t.guest_username)}</span>
                    </div>
                    <div class="text-[10px] text-indigo-600 font-semibold mt-1">SĐT: ${escapeHtml(t.phone_number)}</div>
                </div>
            `;
        }).join('');

        // Start auto polling for current active thread
        if (!chatPollInterval) {
            chatPollInterval = setInterval(pollReceptionistMessages, 4000);
        }
    } catch (e) {
        console.error("Error loading chat threads:", e);
    }
}

export async function selectChatThread(username, name, phone) {
    activeThreadUsername = username;
    
    // UI toggles
    document.getElementById('receptionist-chat-placeholder').classList.add('hidden');
    document.getElementById('receptionist-chat-box').classList.remove('hidden');
    
    document.getElementById('active-chat-guest-name').innerText = name;
    document.getElementById('active-chat-guest-phone').innerText = "SĐT: " + phone;
    document.getElementById('active-chat-guest-username').innerText = "@" + username;

    await fetchAndRenderActiveThreadMessages();
    
    // Refresh the thread list highlight
    loadReceptionistThreads();
}

async function fetchAndRenderActiveThreadMessages(isSilent = false) {
    if (!activeThreadUsername) return;

    try {
        const res = await fetch(`${API_URL}/chat/thread/${activeThreadUsername}`, {
            headers: getHeaders()
        });
        if (!res.ok) return;

        const messages = await res.json();
        if (isSilent && messages.length === lastMessagesCount) {
            return;
        }

        lastMessagesCount = messages.length;
        const historyContainer = document.getElementById('receptionist-chat-history');
        if (!historyContainer) return;

        historyContainer.innerHTML = messages.map(msg => {
            const time = new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            if (msg.sender_role === 'GUEST') {
                return `
                    <div class="flex flex-col items-start gap-1 mb-2">
                        <span class="text-[9px] text-gray-400 font-bold ml-1">${escapeHtml(msg.guest_name)} (Khách)</span>
                        <div class="bg-white text-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-sm border border-gray-200 max-w-md text-sm shadow-sm">
                            ${escapeHtml(msg.message)}
                        </div>
                        <span class="text-[9px] text-gray-400 font-medium ml-1">${time}</span>
                    </div>
                `;
            } else {
                return `
                    <div class="flex flex-col items-end gap-1 mb-2">
                        <div class="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-md text-sm shadow-sm">
                            ${escapeHtml(msg.message)}
                        </div>
                        <span class="text-[9px] text-gray-400 font-medium mr-1">${time}</span>
                    </div>
                `;
            }
        }).join('');

        historyContainer.scrollTop = historyContainer.scrollHeight;
    } catch (e) {
        console.error("Error loading thread messages:", e);
    }
}

function pollReceptionistMessages() {
    const sect = document.getElementById('section-receptionist-chat');
    if (!sect || sect.classList.contains('hidden-section')) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
        return;
    }
    
    if (activeThreadUsername) {
        fetchAndRenderActiveThreadMessages(true);
    }
}

export async function sendReceptionistReply() {
    if (!activeThreadUsername) return;

    const input = document.getElementById('receptionist-reply-input');
    const message = input.value.trim();

    if (!message) return;

    try {
        const res = await fetch(`${API_URL}/chat/reply/${activeThreadUsername}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ message: message })
        });

        if (res.ok) {
            input.value = '';
            await fetchAndRenderActiveThreadMessages();
            loadReceptionistThreads();
        } else {
            const err = await res.json();
            alert(err.detail || "Đã xảy ra lỗi!");
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối máy chủ!");
    }
}

// Helpers
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

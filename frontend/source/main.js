import { API_URL } from './modules/config.js';
import { currentUser, login, logout, checkAuth } from './modules/auth.js';
import { showSection } from './modules/ui.js';
import { fetchRooms, openAddRoomModal, confirmAddRoom, deleteRoom, finishCleaning } from './modules/rooms.js';
import { fetchCategories, openPriceModal, confirmUpdatePrice } from './modules/pricing.js';
import { fetchServicesConfig, openServiceConfigModal, saveServiceConfig, deleteServiceConfig, openServiceModal, updateQtyInList, addToSelection, removeFromSelection, confirmBatchServices } from './modules/services.js';
import { fetchInvoices } from './modules/invoices.js';
import { fetchStaff, handleRegister } from './modules/staff.js';
import { fetchRevenue } from './modules/reports.js';
import { fetchCurrentShift, startShift, endShift, fetchShiftHistory } from './modules/shifts.js';
import { openCheckIn, confirmCheckIn, openBillModal, confirmCheckOut } from './modules/bookings.js';

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    if (currentUser) {
        // Chỉ tự động bắt đầu ca nếu chưa chốt tiền trong phiên này
        if (localStorage.getItem('shift_ended') !== 'true') {
            fetch(`${API_URL}/shifts/start/${currentUser.id}`, { method: 'POST' });
        }
        showSection('rooms', { rooms: fetchRooms });
    }
    lucide.createIcons();
});

// Mapping callbacks for showSection
const sectionCallbacks = {
    'rooms': fetchRooms,
    'prices': fetchCategories,
    'services-config': fetchServicesConfig,
    'invoices': fetchInvoices,
    'staff': fetchStaff,
    'reports': fetchRevenue,
    'shift': fetchCurrentShift,
    'shift-history': fetchShiftHistory
};

// Phơi bày hàm ra window để HTML có thể gọi (onclick)
window.showSection = (id) => showSection(id, sectionCallbacks);
window.handleLogin = login;
window.handleRegister = handleRegister;
window.logout = logout;
window.toggleAuth = (type) => {
    document.getElementById('login-form').classList.toggle('hidden-section', type === 'register');
    document.getElementById('register-form').classList.toggle('hidden-section', type === 'login');
    lucide.createIcons();
};

window.openAddRoomModal = openAddRoomModal;
window.confirmAddRoom = confirmAddRoom;
window.deleteRoom = deleteRoom;
window.finishCleaning = finishCleaning;

window.openPriceModal = openPriceModal;
window.confirmUpdatePrice = confirmUpdatePrice;

window.openServiceConfigModal = openServiceConfigModal;
window.saveServiceConfig = saveServiceConfig;
window.deleteServiceConfig = deleteServiceConfig;

window.openCheckIn = openCheckIn;
window.confirmCheckIn = confirmCheckIn;
window.openBillModal = openBillModal;
window.confirmCheckOut = confirmCheckOut;

window.openServiceModal = openServiceModal;
window.updateQtyInList = updateQtyInList;
window.addToSelection = addToSelection;
window.removeFromSelection = removeFromSelection;
window.confirmBatchServices = confirmBatchServices;

window.startShift = startShift;
window.endShift = endShift;
window.closeServiceConfigModal = () => document.getElementById('service-config-modal').classList.add('hidden');
window.closePriceModal = () => document.getElementById('price-modal').classList.add('hidden');
window.closeAddRoomModal = () => document.getElementById('add-room-modal').classList.add('hidden');
window.closeBillModal = () => document.getElementById('bill-modal').classList.add('hidden');
window.closeModal = () => document.getElementById('checkin-modal').classList.add('hidden');
window.closeServiceModal = () => document.getElementById('service-modal').classList.add('hidden');

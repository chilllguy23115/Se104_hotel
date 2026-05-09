import { API_URL, getHeaders } from './config.js';

export async function fetchCategories() {
    try {
        const res = await fetch(`${API_URL}/admin/room-categories`, { headers: getHeaders() });
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
                    <button onclick='window.openPriceModal(${JSON.stringify(c)})' class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

export function openPriceModal(cat) {
    document.getElementById('edit-cat-id').value = cat.id;
    document.getElementById('edit-cat-name').innerText = cat.name;
    document.getElementById('edit-p1').value = cat.price_first_hour;
    document.getElementById('edit-p2').value = cat.price_next_hour;
    document.getElementById('edit-p3').value = cat.price_overnight;
    document.getElementById('edit-p4').value = cat.price_daily;
    document.getElementById('price-modal').classList.remove('hidden');
}

export async function confirmUpdatePrice() {
    const id = document.getElementById('edit-cat-id').value;
    const payload = {
        price_first_hour: parseInt(document.getElementById('edit-p1').value),
        price_next_hour: parseInt(document.getElementById('edit-p2').value),
        price_overnight: parseInt(document.getElementById('edit-p3').value),
        price_daily: parseInt(document.getElementById('edit-p4').value)
    };
    const res = await fetch(`${API_URL}/admin/room-categories/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (res.ok) { 
        document.getElementById('price-modal').classList.add('hidden'); 
        fetchCategories(); 
    } else { 
        alert("Lỗi khi cập nhật!"); 
    }
}

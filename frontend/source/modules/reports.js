import { API_URL, getHeaders } from './config.js';

let revenueChart = null;
let categoryChart = null;
let paymentChart = null;

export async function fetchRevenue() {
    const res = await fetch(`${API_URL}/admin/revenue`, { headers: getHeaders() });
    const data = await res.json();
    
    document.getElementById('stat-total-revenue').innerText = data.total_revenue.toLocaleString('vi-VN') + "đ";
    document.getElementById('stat-room-revenue').innerText = data.room_revenue.toLocaleString('vi-VN') + "đ";
    document.getElementById('stat-service-revenue').innerText = data.service_revenue.toLocaleString('vi-VN') + "đ";

    // 1. Biểu đồ Doanh thu 7 ngày
    if (revenueChart) revenueChart.destroy();
    const revCtx = document.getElementById('revenue-chart').getContext('2d');
    revenueChart = new Chart(revCtx, {
        type: 'line',
        data: {
            labels: data.daily_stats.map(s => s.date),
            datasets: [{
                label: 'Doanh thu',
                data: data.daily_stats.map(s => s.amount),
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#2563eb'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
        }
    });

    // 2. Biểu đồ Cơ cấu Phòng/Dịch vụ
    if (categoryChart) categoryChart.destroy();
    const catCtx = document.getElementById('category-chart').getContext('2d');
    categoryChart = new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: ['Tiền phòng', 'Dịch vụ'],
            datasets: [{
                data: [data.room_revenue, data.service_revenue],
                backgroundColor: ['#22c55e', '#f97316'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // 3. Biểu đồ Phương thức thanh toán
    if (paymentChart) paymentChart.destroy();
    const payCtx = document.getElementById('payment-chart').getContext('2d');
    paymentChart = new Chart(payCtx, {
        type: 'doughnut',
        data: {
            labels: ['Tiền mặt', 'Chuyển khoản'],
            datasets: [{
                data: [data.cash_revenue, data.transfer_revenue],
                backgroundColor: ['#3b82f6', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

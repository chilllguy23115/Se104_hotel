export function showSection(sectionId, callbacks = {}) {
    ['rooms', 'prices', 'services-config', 'invoices', 'staff', 'reports', 'shift', 'shift-history'].forEach(s => {
        const el = document.getElementById(`section-${s}`);
        const nav = document.getElementById(`nav-${s}`);
        if (el) el.classList.add('hidden-section');
        if (nav) nav.classList.remove('active');
    });
    
    const section = document.getElementById(`section-${sectionId}`);
    const nav = document.getElementById(`nav-${sectionId}`);
    if (section) section.classList.remove('hidden-section');
    if (nav) nav.classList.add('active');

    // Gọi callback tương ứng nếu có
    if (callbacks[sectionId]) {
        callbacks[sectionId]();
    }
}

export function closeAllModals() {
    document.querySelectorAll('.mica-effect.fixed.inset-0').forEach(m => m.classList.add('hidden'));
}

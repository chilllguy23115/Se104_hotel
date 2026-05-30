export const API_URL = `${window.location.origin}/api`;

export function getHeaders() {
    const user = JSON.parse(localStorage.getItem('hotel_user'));
    const headers = { 'Content-Type': 'application/json' };
    if (user && user.role) {
        headers['X-Role'] = user.role;
        headers['X-Username'] = user.username || '';
    }
    return headers;
}

export const API_URL = "http://127.0.0.1:8000/api";

export function getHeaders() {
    const user = JSON.parse(localStorage.getItem('hotel_user'));
    const headers = { 'Content-Type': 'application/json' };
    if (user && user.role) {
        headers['X-Role'] = user.role;
    }
    return headers;
}

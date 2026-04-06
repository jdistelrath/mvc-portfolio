// When VITE_API_URL is empty (default), the app uses local static data.
// When set (e.g. https://api.mvc-portfolio.com), it calls the backend API.
export const API_BASE_URL = import.meta.env.VITE_API_URL || ''
export const isApiEnabled = API_BASE_URL.length > 0

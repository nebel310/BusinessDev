const API_URL = 'http://localhost:3001';

// Функция для регистрации нового пользователя
async function registerUser(username, email, password, passwordConfirm) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                email,
                password,
                password_confirm: passwordConfirm
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка при регистрации');
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        throw error;
    }
}

// Функция для входа пользователя
async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка при входе');
        }
        
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        
        return data;
    } catch (error) {
        console.error('Ошибка входа:', error);
        throw error;
    }
}

// Функция для обновления access токена с помощью refresh токена
async function refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
        throw new Error('Refresh токен отсутствует');
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

            throw new Error(data.detail || 'Ошибка при обновлении токена');
        }
        
        localStorage.setItem('access_token', data.access_token);
        
        return data.access_token;
    } catch (error) {
        console.error('Ошибка обновления токена:', error);
        throw error;
    }
}

// Функция для выхода пользователя
async function logoutUser() {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        console.warn('Пользователь не авторизован');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        if (!response.ok) {
            const data = await response.json();
            console.warn('Ошибка при выходе:', data.detail);
        }
        
        return true;
    } catch (error) {
        console.error('Ошибка выхода:', error);

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return false;
    }
}

// Функция для получения информации о текущем пользователе
async function getCurrentUser() {
    let token = localStorage.getItem('access_token');
    
    if (!token) {
        throw new Error('Пользователь не авторизован');
    }
    
    try {
        let response = await fetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        if (response.status === 401) {
            token = await refreshToken();
            response = await fetch(`${API_URL}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Ошибка получения данных пользователя');
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
        throw error;
    }
}

// Функция для проверки авторизации
function isAuthenticated() {
    try {
        refreshToken()
        return localStorage.getItem('access_token') !== null;
    }
    catch (error) {
        return null;
    }
}

// Функция для страниц, требующих авторизации
function protectRoute() {
    if (!isAuthenticated()) {
        localStorage.setItem('redirect_after_login', window.location.pathname);
    }
}

// Функция для выполнения защищенных запросов к API
async function fetchWithAuth(url, options = {}) {
    let token = localStorage.getItem('access_token');
    
    if (!token) {
        throw new Error('Пользователь не авторизован');
    }
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    
    try {
        let response = await fetch(`${API_URL}${url}`, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            try {
                token = await refreshToken();
                response = await fetch(`${API_URL}${url}`, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (refreshError) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                throw refreshError;
            }
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка запроса к API');
        }
        
        return response;
    } catch (error) {
        console.error('Ошибка запроса:', error);
        throw error;
    }
}

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshToken,
    getCurrentUser,
    isAuthenticated,
    protectRoute,
    fetchWithAuth
};
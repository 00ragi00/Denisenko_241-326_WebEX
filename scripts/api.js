// API базовый функционал
const API_BASE_URL = "http://exam-api-courses.std-900.ist.mospolytech.ru/api/"

// Получить API ключ из localStorage
function getApiKey() {
    return localStorage.getItem("linguaschool-apikey")
}

// Установить API ключ в localStorage
function setApiKey(key) {
    localStorage.setItem("linguaschool-apikey", key)
}

// Удалить API ключ из localStorage
function clearApiKey() {
    localStorage.removeItem("linguaschool-apikey")
}

// Проверить, авторизован ли пользователь
function isAuthorized() {
    const key = getApiKey()
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return key && uuidRegex.test(key)
}

// GET запрос к API
// @param {string} endpoint - путь без базового URL
// @returns {Promise<Object>}
async function apiGet(endpoint) {
    const apiKey = getApiKey()
    if (!apiKey) {
        throw new Error("API ключ не найден. Требуется авторизация.")
    }

    const url = API_BASE_URL + endpoint + "?apikey=" + encodeURIComponent(apiKey)
    
    try {
        const response = await fetch(url)
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Неверный API ключ. Требуется авторизация.")
            } else if (response.status === 403) {
                throw new Error("Доступ запрещен.")
            } else if (response.status === 404) {
                throw new Error("Ресурс не найден.")
            } else {
                throw new Error(`Ошибка сервера (${response.status})`)
            }
        }

        const data = await response.json()
        
        if (data.error) {
            throw new Error(data.error)
        }

        return Array.isArray(data) ? data : (data.data || data)
    } catch (error) {
        console.error("API GET Error:", error)
        throw error
    }
}

// POST запрос к API
// @param {string} endpoint - путь к ресурсу
// @param {Object} body - данные для отправки
// @returns {Promise<Object>}
async function apiPost(endpoint, body) {
    const apiKey = getApiKey()
    if (!apiKey) {
        throw new Error("API ключ не найден. Требуется авторизация.")
    }

    const url = API_BASE_URL + endpoint + "?apikey=" + encodeURIComponent(apiKey)
    
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Неверный API ключ. Требуется авторизация.")
            } else if (response.status === 400) {
                throw new Error("Ошибка в данных запроса.")
            } else if (response.status === 403) {
                throw new Error("Доступ запрещен.")
            } else {
                throw new Error(`Ошибка сервера (${response.status})`)
            }
        }

        const data = await response.json()
        
        if (data.error) {
            throw new Error(data.error)
        }

        return Array.isArray(data) ? data : (data.data || data)
    } catch (error) {
        console.error("API POST Error:", error)
        throw error
    }
}

// PUT запрос к API
// @param {string} endpoint - путь к ресурсу
// @param {Object} body - данные для обновления
// @returns {Promise<Object>}
async function apiPut(endpoint, body) {
    const apiKey = getApiKey()
    if (!apiKey) {
        throw new Error("API ключ не найден. Требуется авторизация.")
    }

    const url = API_BASE_URL + endpoint + "?apikey=" + encodeURIComponent(apiKey)
    
    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Неверный API ключ. Требуется авторизация.")
            } else if (response.status === 400) {
                throw new Error("Ошибка в данных запроса.")
            } else if (response.status === 404) {
                throw new Error("Заявка не найдена.")
            } else if (response.status === 403) {
                throw new Error("Доступ запрещен.")
            } else {
                throw new Error(`Ошибка сервера (${response.status})`)
            }
        }

        const data = await response.json()
        
        if (data.error) {
            throw new Error(data.error)
        }

        return Array.isArray(data) ? data : (data.data || data)
    } catch (error) {
        console.error("API PUT Error:", error)
        throw error
    }
}

// DELETE запрос к API
// @param {string} endpoint - путь к ресурсу
// @returns {Promise<Object>}
async function apiDelete(endpoint) {
    const apiKey = getApiKey()
    if (!apiKey) {
        throw new Error("API ключ не найден. Требуется авторизация.")
    }

    const url = API_BASE_URL + endpoint + "?apikey=" + encodeURIComponent(apiKey)
    
    try {
        const response = await fetch(url, {
            method: "DELETE"
        })

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Неверный API ключ. Требуется авторизация.")
            } else if (response.status === 404) {
                throw new Error("Заявка не найдена.")
            } else if (response.status === 403) {
                throw new Error("Доступ запрещен.")
            } else {
                throw new Error(`Ошибка сервера (${response.status})`)
            }
        }

        const data = await response.json()
        
        if (data.error) {
            throw new Error(data.error)
        }

        return data
    } catch (error) {
        console.error("API DELETE Error:", error)
        throw error
    }
}

// ===== КУРСЫ =====

// Получить список всех курсов
// @returns {Promise<Array>}
async function getCourses() {
    return await apiGet("courses")
}

// Получить один курс по ID
// @param {number} courseId - ID курса
// @returns {Promise<Object>}
async function getCourse(courseId) {
    return await apiGet("courses/" + courseId)
}

// ===== РЕПЕТИТОРЫ =====

// Получить список всех репетиторов
// @returns {Promise<Array>}
async function getTutors() {
    return await apiGet("tutors")
}

// Получить одного репетитора по ID
// @param {number} tutorId - ID репетитора
// @returns {Promise<Object>}
async function getTutor(tutorId) {
    return await apiGet("tutors/" + tutorId)
}

// ===== ЗАЯВКИ =====

// Получить список заявок пользователя
// @returns {Promise<Array>}
async function getOrders() {
    return await apiGet("orders")
}

// Получить одну заявку по ID
// @param {number} orderId - ID заявки
// @returns {Promise<Object>}
async function getOrder(orderId) {
    return await apiGet("orders/" + orderId)
}

// Создать новую заявку
// @param {Object} orderData - данные заявки
// @returns {Promise<Object>}
async function createOrder(orderData) {
    return await apiPost("orders", orderData)
}

// Обновить заявку
// @param {number} orderId - ID заявки
// @param {Object} orderData - обновленные данные
// @returns {Promise<Object>}
async function updateOrder(orderId, orderData) {
    return await apiPut("orders/" + orderId, orderData)
}

// Удалить заявку
// @param {number} orderId - ID заявки
// @returns {Promise<Object>}
async function deleteOrder(orderId) {
    return await apiDelete("orders/" + orderId)
}

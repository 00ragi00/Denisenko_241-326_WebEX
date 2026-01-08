// API базовый функционал
const API_BASE_URL = "http://exam-api-courses.std-900.ist.mospolytech.ru/api/"

function getApiKey() {
    return localStorage.getItem("linguaschool-apikey")
}

function setApiKey(key) {
    localStorage.setItem("linguaschool-apikey", key)
}

function clearApiKey() {
    localStorage.removeItem("linguaschool-apikey")
}

function isAuthorized() {
    const key = getApiKey()
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return key && uuidRegex.test(key)
}

// GET - базовый запрос к API
// @param {string} endpoint - путь без базы
// @returns {Promise<Object>}
async function apiGet(endpoint) {
    const apiKey = getApiKey()
    const url = API_BASE_URL + endpoint + "?apikey=" + apiKey
    try {
        const response = await fetch(url)
        const data = await response.json()
        if (data.error) throw new Error(data.error)
        return data
    } catch (error) {
        console.error("API GET Error:", error)
        throw error
    }
}

// POST - отправка данных
// @param {string} endpoint - путь к ресурсу
// @param {Object} body - данные для отправки
// @returns {Promise<Object>}
async function apiPost(endpoint, body) {
    const apiKey = getApiKey()
    const url = API_BASE_URL + endpoint + "?apikey=" + apiKey
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
        const data = await response.json()
        if (data.error) throw new Error(data.error)
        return data
    } catch (error) {
        console.error("API POST Error:", error)
        throw error
    }
}

// PUT - обновление данных
// @param {string} endpoint - путь к ресурсу
// @param {Object} body - данные для обновления
// @returns {Promise<Object>}
async function apiPut(endpoint, body) {
    const apiKey = getApiKey()
    const url = API_BASE_URL + endpoint + "?apikey=" + apiKey
    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
        const data = await response.json()
        if (data.error) throw new Error(data.error)
        return data
    } catch (error) {
        console.error("API PUT Error:", error)
        throw error
    }
}

// DELETE - удаление данных
// @param {string} endpoint - путь к ресурсу
// @returns {Promise<Object>}
async function apiDelete(endpoint) {
    const apiKey = getApiKey()
    const url = API_BASE_URL + endpoint + "?apikey=" + apiKey
    try {
        const response = await fetch(url, { method: "DELETE" })
        const data = await response.json()
        if (data.error) throw new Error(data.error)
        return data
    } catch (error) {
        console.error("API DELETE Error:", error)
        throw error
    }
}

// Получить список курсов
async function getCourses() {
    return await apiGet("courses")
}

// Получить один курс по ID
// @param {number} courseId - ID курса
// @returns {Promise<Object>}
async function getCourse(courseId) {
    return await apiGet("courses/" + courseId)
}

// Получить список репетиторов
async function getTutors() {
    return await apiGet("tutors")
}

// Получить одного репетитора по ID
// @param {number} tutorId - ID репетитора
// @returns {Promise<Object>}
async function getTutor(tutorId) {
    return await apiGet("tutors/" + tutorId)
}

// Получить список заявок пользователя
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

/**
 * Модуль для работы с API
 * Содержит обёртки для fetch с API key
 */

// Базовый URL API + cors proxy
const API_BASE_URL = "http://exam-api-courses.std-900.ist.mospolytech.ru/api"

// 2. CORS прокси
const CORS_PROXY = "https://api.allorigins.win/raw?url="

// 3. Проверяем, где мы
const isGithubPages = window.location.hostname.includes('github.io')

// 4. Выбираем URL
const url = isGithubPages 
    ? CORS_PROXY + encodeURIComponent(fullUrl)
    : fullUrl

// Получить ключ можно по ссылке в СДО Московского Политеха
function getApiKey() {
  return localStorage.getItem("linguaschool_api_key") || ""
}

function setApiKey(key) {
  localStorage.setItem("linguaschool_api_key", key)
}

function clearApiKey() {
  localStorage.removeItem("linguaschool_api_key")
}

function isAuthorized() {
  const key = getApiKey()
  // Проверяем формат UUIDv4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return key && uuidRegex.test(key)
}

/**
 * Выполняет GET-запрос к API
 * @param {string} endpoint - Эндпоинт API
 * @returns {Promise<Object>} - Ответ сервера
 */
async function apiGet(endpoint) {
  const apiKey = getApiKey()
  const url = `${API_BASE_URL}${endpoint}?api_key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    return data
  } catch (error) {
    console.error("API GET Error:", error)
    throw error
  }
}

/**
 * Выполняет POST-запрос к API
 * @param {string} endpoint - Эндпоинт API
 * @param {Object} body - Тело запроса
 * @returns {Promise<Object>} - Ответ сервера
 */
async function apiPost(endpoint, body) {
  const apiKey = getApiKey()
  const url = `${API_BASE_URL}${endpoint}?api_key=${apiKey}`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    return data
  } catch (error) {
    console.error("API POST Error:", error)
    throw error
  }
}

/**
 * Выполняет PUT-запрос к API
 * @param {string} endpoint - Эндпоинт API
 * @param {Object} body - Тело запроса
 * @returns {Promise<Object>} - Ответ сервера
 */
async function apiPut(endpoint, body) {
  const apiKey = getApiKey()
  const url = `${API_BASE_URL}${endpoint}?api_key=${apiKey}`

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    return data
  } catch (error) {
    console.error("API PUT Error:", error)
    throw error
  }
}

/**
 * Выполняет DELETE-запрос к API
 * @param {string} endpoint - Эндпоинт API
 * @returns {Promise<Object>} - Ответ сервера
 */
async function apiDelete(endpoint) {
  const apiKey = getApiKey()
  const url = `${API_BASE_URL}${endpoint}?api_key=${apiKey}`

  try {
    const response = await fetch(url, {
      method: "DELETE",
    })

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

// === Функции для работы с курсами ===

/**
 * Получить список всех курсов
 * @returns {Promise<Array>}
 */
async function getCourses() {
  return await apiGet("/courses")
}

/**
 * Получить информацию о курсе по ID
 * @param {number} courseId
 * @returns {Promise<Object>}
 */
async function getCourse(courseId) {
  return await apiGet(`/courses/${courseId}`)
}

// === Функции для работы с репетиторами ===

/**
 * Получить список всех репетиторов
 * @returns {Promise<Array>}
 */
async function getTutors() {
  return await apiGet("/tutors")
}

/**
 * Получить информацию о репетиторе по ID
 * @param {number} tutorId
 * @returns {Promise<Object>}
 */
async function getTutor(tutorId) {
  return await apiGet(`/tutors/${tutorId}`)
}

// === Функции для работы с заявками ===

/**
 * Получить список всех заявок
 * @returns {Promise<Array>}
 */
async function getOrders() {
  return await apiGet("/orders")
}

/**
 * Получить заявку по ID
 * @param {number} orderId
 * @returns {Promise<Object>}
 */
async function getOrder(orderId) {
  return await apiGet(`/orders/${orderId}`)
}

/**
 * Создать новую заявку
 * @param {Object} orderData
 * @returns {Promise<Object>}
 */
async function createOrder(orderData) {
  return await apiPost("/orders", orderData)
}

/**
 * Обновить заявку
 * @param {number} orderId
 * @param {Object} orderData
 * @returns {Promise<Object>}
 */
async function updateOrder(orderId, orderData) {
  return await apiPut(`/orders/${orderId}`, orderData)
}

/**
 * Удалить заявку
 * @param {number} orderId
 * @returns {Promise<Object>}
 */
async function deleteOrder(orderId) {
  return await apiDelete(`/orders/${orderId}`)
}

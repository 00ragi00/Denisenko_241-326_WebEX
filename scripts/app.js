/**
 * app.js - Главный модуль приложения
 * Инициализация, обработчики UI, рендеринг
 */

// Внешние зависимости (загружаются из CDN и других скриптов)
var bootstrap = window.bootstrap
var ymaps = window.ymaps

// Функции из api.js
var getApiKey = window.getApiKey
var setApiKey = window.setApiKey
var clearApiKey = window.clearApiKey
var isAuthorized = window.isAuthorized
var getCourses = window.getCourses
var getTutors = window.getTutors
var getOrders = window.getOrders
var getOrder = window.getOrder
var getCourse = window.getCourse
var getTutor = window.getTutor
var createOrder = window.createOrder
var updateOrder = window.updateOrder
var deleteOrder = window.deleteOrder

// Функции из price.js
var calculatePrice = window.calculatePrice
var isWeekendOrHoliday = window.isWeekendOrHoliday
var checkEarlyRegistration = window.checkEarlyRegistration
var checkGroupEnrollment = window.checkGroupEnrollment
var checkIntensiveCourse = window.checkIntensiveCourse

// Глобальные переменные
var coursesData = []
var tutorsData = []
var ordersData = []
const ITEMS_PER_PAGE = 5
var currentCoursePage = 1
var currentOrdersPage = 1
var selectedTutorId = null
var yandexMap = null
var mapPlacemarks = []
var yandexSearchControl = null

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function() {
    // Инициализация Bootstrap подсказок
    initTooltips()
    
    // Обновление UI в зависимости от авторизации
    updateAuthUI()
    
    // Определение текущей страницы
    const isAccountPage = window.location.pathname.includes("account")
    if (isAccountPage) {
        initAccountPage()
    } else {
        initMainPage()
    }
    
    // Обработчики авторизации
    setupAuthHandlers()
})

// ===== Bootstrap подсказки =====
function initTooltips() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el))
}

// ===== Обновление UI авторизации =====
function updateAuthUI() {
    const authSection = document.getElementById("nav-auth-section")
    if (!authSection) return

    if (isAuthorized()) {
        authSection.innerHTML = `
            <div class="d-flex align-items-center">
                <a class="nav-link btn btn-outline-light ms-lg-2 px-3" href="account.html">
                    <i class="bi bi-person-circle me-1"></i> Профиль
                </a>
                <button class="btn btn-outline-danger ms-2 px-3" id="logoutBtn">
                    <i class="bi bi-box-arrow-right me-1"></i> Выход
                </button>
            </div>
        `
        document.getElementById("logoutBtn").addEventListener("click", handleLogout)
    } else {
        authSection.innerHTML = `
            <button class="nav-link btn btn-outline-light ms-lg-3 px-3" id="openAuthModalBtn">
                <i class="bi bi-box-arrow-in-right me-1"></i> Вход
            </button>
        `
        document.getElementById("openAuthModalBtn").addEventListener("click", function() {
            const modal = new bootstrap.Modal(document.getElementById("authModal"))
            modal.show()
        })
    }
}

// ===== Обработчики авторизации =====
function setupAuthHandlers() {
    const loginBtn = document.getElementById("loginBtn")
    if (loginBtn) loginBtn.addEventListener("click", handleLogin)

    const showAuthModalBtn = document.getElementById("showAuthModalBtn")
    if (showAuthModalBtn) {
        showAuthModalBtn.addEventListener("click", function() {
            const modal = new bootstrap.Modal(document.getElementById("authModal"))
            modal.show()
        })
    }

    const apiKeyInput = document.getElementById("apiKeyInput")
    if (apiKeyInput) {
        apiKeyInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                e.preventDefault()
                handleLogin()
            }
        })
    }
}

function handleLogin() {
    const apiKeyInput = document.getElementById("apiKeyInput")
    const apiKey = apiKeyInput.value.trim()
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(apiKey)) {
        showNotification("Некорректный API ключ. Требуется формат UUIDv4.", "danger")
        return
    }

    setApiKey(apiKey)
    const modal = bootstrap.Modal.getInstance(document.getElementById("authModal"))
    if (modal) modal.hide()
    
    updateAuthUI()
    showNotification("Авторизация успешна!", "success")
    
    const isAccountPage = window.location.pathname.includes("account")
    if (isAccountPage) initAccountPage()
}

function handleLogout() {
    clearApiKey()
    updateAuthUI()
    showNotification("Вы вышли из системы.", "info")
    
    const isAccountPage = window.location.pathname.includes("account")
    if (isAccountPage) {
        const authRequiredBlock = document.getElementById("auth-required-block")
        const ordersBlock = document.getElementById("orders-block")
        if (authRequiredBlock) authRequiredBlock.classList.remove("d-none")
        if (ordersBlock) ordersBlock.classList.add("d-none")
    }
}

// ===== Инициализация главной страницы =====
async function initMainPage() {
    try {
        const [courses, tutors] = await Promise.all([getCourses(), getTutors()])
        coursesData = courses
        tutorsData = tutors
        
        renderCourses()
        renderTutors()
        populateLanguageFilter()
        setupMainPageHandlers()
        initYandexMap()
    } catch (error) {
        showNotification(error.message, "danger")
    }
}

function populateLanguageFilter() {
    const languageSet = new Set()
    tutorsData.forEach(tutor => {
        if (tutor.languagesoffered) {
            tutor.languagesoffered.forEach(lang => {
                languageSet.add(lang)
            })
        }
    })
    
    const select = document.getElementById("filterTutorLanguage")
    languageSet.forEach(lang => {
        const option = document.createElement("option")
        option.value = lang
        option.textContent = lang
        select.appendChild(option)
    })
}

function setupMainPageHandlers() {
    document.getElementById("searchCourse").addEventListener("input", debounce(renderCourses, 300))
    document.getElementById("filterLevel").addEventListener("change", renderCourses)
    document.getElementById("filterTutorLanguage").addEventListener("change", renderTutors)
    document.getElementById("filterTutorLevel").addEventListener("change", renderTutors)
    document.getElementById("filterTutorExperience").addEventListener("input", debounce(renderTutors, 300))
    
    document.getElementById("orderDateStart").addEventListener("change", onDateStartChange)
    document.getElementById("orderTimeStart").addEventListener("change", updateOrderPrice)
    document.getElementById("orderPersons").addEventListener("input", updateOrderPrice)
    
    ["optionSupplementary", "optionPersonalized", "optionExcursions", "optionAssessment", "optionInteractive"].forEach(id => {
        document.getElementById(id).addEventListener("change", updateOrderPrice)
    })
    
    document.getElementById("submitOrder").addEventListener("click", submitCourseOrder)

    document.getElementById("tutorOrderDate").addEventListener("change", updateTutorOrderPrice)
    document.getElementById("tutorOrderTime").addEventListener("change", updateTutorOrderPrice)
    document.getElementById("tutorOrderDuration").addEventListener("input", updateTutorOrderPrice)
    document.getElementById("tutorOrderPersons").addEventListener("input", updateTutorOrderPrice)
    
    ["tutorOptSupplementary", "tutorOptPersonalized", "tutorOptExcursions", "tutorOptAssessment", "tutorOptInteractive"].forEach(id => {
        document.getElementById(id).addEventListener("change", updateTutorOrderPrice)
    })
    
    document.getElementById("submitTutorOrder").addEventListener("click", submitTutorOrder)

    const searchMapBtn = document.getElementById("searchMapBtn")
    if (searchMapBtn) searchMapBtn.addEventListener("click", searchOnMap)
    
    const mapSearchQuery = document.getElementById("mapSearchQuery")
    if (mapSearchQuery) {
        mapSearchQuery.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                e.preventDefault()
                searchOnMap()
            }
        })
    }
}

function initYandexMap() {
    const mapContainer = document.getElementById("yandex-map")
    if (!mapContainer) return

    if (typeof ymaps === "undefined") {
        console.warn("Yandex Maps API не загружена")
        mapContainer.innerHTML = `
            <div class="d-flex align-items-center justify-content-center h-100 bg-light">
                <div class="text-center">
                    <i class="bi bi-map text-muted" style="font-size: 4rem;"></i>
                    <p class="text-muted mt-3">Карты недоступны</p>
                </div>
            </div>
        `
        return
    }

    ymaps.ready(function() {
        yandexMap = new ymaps.Map(mapContainer, {
            center: [55.751574, 37.573856],
            zoom: 11,
            controls: ["zoomControl", "searchControl", "typeSelector", "fullscreenControl", "geolocationControl"]
        })

        yandexSearchControl = new ymaps.control.SearchControl({
            options: {
                provider: "yandex#search",
                results: 50,
                useMapBounds: true,
                noPlacemark: true,
                noPopup: true
            }
        })

        const mapSearchQuery = document.getElementById("mapSearchQuery")
        if (mapSearchQuery && !mapSearchQuery.value.trim()) {
            mapSearchQuery.value = "Москва"
            searchOnMap()
        }
    })
}

function clearMapPlacemarks() {
    if (yandexMap) {
        mapPlacemarks.forEach(placemark => {
            yandexMap.geoObjects.remove(placemark)
        })
        mapPlacemarks = []
    }
}

function searchOnMap() {
    if (!yandexMap || !yandexSearchControl) return

    const resultsContainer = document.getElementById("map-results")
    const queryInput = document.getElementById("mapSearchQuery")
    const userText = queryInput ? queryInput.value.trim() : ""
    const query = userText ? userText : "Москва"

    clearMapPlacemarks()
    resultsContainer.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Загрузка...</span>
            </div>
            <p class="text-muted mt-2 mb-0">Поиск...</p>
        </div>
    `

    yandexSearchControl.search(query).then(function() {
        const rawResults = yandexSearchControl.getResultsArray()
        const places = []

        rawResults.forEach(geoObject => {
            if (!geoObject) return

            const name = geoObject.properties.getName()
            const address = geoObject.properties.getDescription() || geoObject.properties.getText()
            const coords = geoObject.geometry && geoObject.geometry.getCoordinates ? geoObject.geometry.getCoordinates() : null

            if (!coords) return

            places.push({
                name: name,
                address: address,
                coords: coords,
                geoObject: geoObject
            })
        })

        const stopWords = ["вход", "выход", "кроме", "особого", "кроме", "во", "до", "по", "за", "из", "с", "к", "у", "ну"]
        const mustHave = ["школа", "центр", "английский", "language"]

        const filtered = places.filter(p => {
            const s = p.name.toLowerCase() + p.address.toLowerCase()
            if (stopWords.some(w => s.includes(w))) return false
            return mustHave.some(w => s.includes(w))
        })

        const uniquePlaces = []
        const seen = new Set()
        filtered.forEach(p => {
            const key = (p.name.toLowerCase() + p.address.toLowerCase()).trim()
            if (seen.has(key)) return
            seen.add(key)
            uniquePlaces.push(p)
        })

        if (uniquePlaces.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-search" style="font-size: 2rem;"></i>
                    <p class="mt-2 mb-0">Результаты не найдены</p>
                    <small>Попробуйте другой поисковый запрос</small>
                </div>
            `
            return
        }

        displayYandexResults(uniquePlaces)
    }).catch(function() {
        resultsContainer.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-exclamation-triangle text-warning" style="font-size: 2rem;"></i>
                <p class="mt-2 mb-0">Ошибка поиска</p>
                <small>Попробуйте позже</small>
            </div>
        `
    })
}

function displayYandexResults(places) {
    const resultsContainer = document.getElementById("map-results")
    let resultsHtml = ""
    const bounds = []

    places.forEach((place, index) => {
        const placemark = new ymaps.Placemark(place.coords, {
            balloonContentHeader: `<strong>${escapeHtml(place.name)}</strong>`,
            balloonContentBody: `<p>${escapeHtml(place.address)}</p>`,
            balloonContentFooter: `<a href="https://yandex.ru/maps?text=${encodeURIComponent(place.name + " " + place.address)}" target="_blank">Открыть на карте</a>`,
            hintContent: place.name
        }, {
            preset: "islands#blueEducationIcon"
        })

        yandexMap.geoObjects.add(placemark)
        mapPlacemarks.push(placemark)
        bounds.push(place.coords)

        resultsHtml += `
            <div class="map-result-item border-bottom p-3" data-index="${index}" style="cursor: pointer;">
                <h6 class="mb-1 text-primary">${escapeHtml(place.name)}</h6>
                <p class="mb-0 small text-muted"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(place.address)}</p>
            </div>
        `
    })

    if (bounds.length > 0) {
        yandexMap.setBounds(ymaps.util.bounds.fromPoints(bounds), {
            checkZoomRange: true,
            zoomMargin: 50
        })
    }

    resultsContainer.innerHTML = resultsHtml

    resultsContainer.querySelectorAll(".map-result-item").forEach(item => {
        item.addEventListener("click", function() {
            const index = Number.parseInt(item.dataset.index, 10)
            const placemark = mapPlacemarks[index]
            const place = places[index]

            if (placemark && place) {
                yandexMap.setCenter(place.coords, 16)
                placemark.balloon.open()
            }

            resultsContainer.querySelectorAll(".map-result-item").forEach(el => {
                el.classList.remove("bg-light")
            })
            item.classList.add("bg-light")
        })
    })
}

// ===== Функции рендеринга  =====
function renderCourses() {
    console.log("renderCourses")
}

function renderTutors() {
    console.log("renderTutors")
}

function onDateStartChange() {
    console.log("onDateStartChange")
}

function populateDateOptions() {
    console.log("populateDateOptions")
}

function populateTimeOptions() {
    console.log("populateTimeOptions")
}

function updateOrderPrice() {
    console.log("updateOrderPrice")
}

function submitCourseOrder() {
    console.log("submitCourseOrder")
}

function openCourseOrderModal() {
    console.log("openCourseOrderModal")
}

function updateTutorOrderPrice() {
    console.log("updateTutorOrderPrice")
}

function submitTutorOrder() {
    console.log("submitTutorOrder")
}

function openTutorOrderModal() {
    console.log("openTutorOrderModal")
}

// ===== Инициализация страницы аккаунта =====
async function initAccountPage() {
    const authRequiredBlock = document.getElementById("auth-required-block")
    const ordersBlock = document.getElementById("orders-block")

    if (!isAuthorized()) {
        if (authRequiredBlock) authRequiredBlock.classList.remove("d-none")
        if (ordersBlock) ordersBlock.classList.add("d-none")
        return
    }

    if (authRequiredBlock) authRequiredBlock.classList.add("d-none")
    if (ordersBlock) ordersBlock.classList.remove("d-none")

    await loadOrders()
    setupAccountPageHandlers()
}

async function loadOrders() {
    try {
        ordersData = await getOrders()
        renderOrders()
    } catch (error) {
        showNotification(error.message, "danger")
    }
}

function renderOrders() {
    console.log("renderOrders")
}

function setupAccountPageHandlers() {
    console.log("setupAccountPageHandlers")
}

// ===== Вспомогательные функции =====
function showNotification(message, type = "info") {
    const area = document.getElementById("notification-area")
    if (!area) return

    const toast = document.createElement("div")
    toast.className = `toast notification-toast d-flex align-items-center text-white bg-${type} border-0`
    toast.setAttribute("role", "alert")
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${escapeHtml(message)}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `
    area.appendChild(toast)

    const bsToast = new bootstrap.Toast(toast, { delay: 5000 })
    bsToast.show()
    toast.addEventListener("hidden.bs.toast", () => toast.remove())
}

function renderPagination(containerId, totalPages, currentPage, onPageChange) {
    const container = document.getElementById(containerId)
    if (!container) return

    const ul = container.querySelector("ul")
    ul.innerHTML = ""

    if (totalPages <= 1) return

    const prevLi = document.createElement("li")
    prevLi.className = `page-item ${currentPage <= 1 ? "disabled" : ""}`
    prevLi.innerHTML = '<a class="page-link" href="#">&laquo;</a>'
    prevLi.addEventListener("click", function(e) {
        e.preventDefault()
        if (currentPage > 1) onPageChange(currentPage - 1)
    })
    ul.appendChild(prevLi)

    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement("li")
        li.className = `page-item ${i === currentPage ? "active" : ""}`
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`
        li.addEventListener("click", function(e) {
            e.preventDefault()
            onPageChange(i)
        })
        ul.appendChild(li)
    }

    const nextLi = document.createElement("li")
    nextLi.className = `page-item ${currentPage >= totalPages ? "disabled" : ""}`
    nextLi.innerHTML = '<a class="page-link" href="#">&raquo;</a>'
    nextLi.addEventListener("click", function(e) {
        e.preventDefault()
        if (currentPage < totalPages) onPageChange(currentPage + 1)
    })
    ul.appendChild(nextLi)
}

function formatDate(date) {
    const options = { day: "numeric", month: "long", year: "numeric" }
    return date.toLocaleDateString("ru-RU", options)
}

function getLevelBadgeClass(level) {
    switch (level) {
        case "Beginner":
            return "bg-success"
        case "Intermediate":
            return "bg-warning text-dark"
        case "Advanced":
            return "bg-danger"
        default:
            return "bg-secondary"
    }
}

function escapeHtml(text) {
    if (!text) return ""
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
}

// Debounce функция
function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

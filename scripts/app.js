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

// ===== Рендеринг курсов =====
function renderCourses() {
    const searchText = document.getElementById("searchCourse").value.toLowerCase()
    const filterLevel = document.getElementById("filterLevel").value

    let filtered = coursesData.filter(course => {
        const matchesSearch = !searchText || 
            course.name.toLowerCase().includes(searchText) ||
            course.description.toLowerCase().includes(searchText)
        
        const matchesLevel = !filterLevel || course.level === filterLevel
        
        return matchesSearch && matchesLevel
    })

    currentCoursePage = 1
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
    const startIndex = (currentCoursePage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const paginated = filtered.slice(startIndex, endIndex)

    const container = document.getElementById("courses-container")
    if (paginated.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-inbox text-muted" style="font-size: 4rem;"></i>
                <h4 class="text-muted mt-3">Курсы не найдены</h4>
            </div>
        `
        renderPagination("courses-pagination", 0, 1, () => {})
        return
    }

    let html = ""
    paginated.forEach(course => {
        const levelBadgeClass = getLevelBadgeClass(course.level)
        html += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card course-card h-100 shadow-sm border-0">
                    <div class="card-body">
                        <h5 class="card-title text-primary">${escapeHtml(course.name)}</h5>
                        <p class="card-text text-muted small">${escapeHtml(course.description.substring(0, 80))}...</p>
                        <div class="mb-3">
                            <span class="badge ${levelBadgeClass}">${course.level}</span>
                        </div>
                        <p class="card-text"><strong>${course.price} руб./ч</strong></p>
                        <button class="btn btn-primary w-100" onclick="openCourseOrderModal(${course.id})">
                            <i class="bi bi-cart me-1"></i> Заказать
                        </button>
                    </div>
                </div>
            </div>
        `
    })

    container.innerHTML = html
    renderPagination("courses-pagination", totalPages, currentCoursePage, function(page) {
        currentCoursePage = page
        renderCourses()
    })
}

// ===== Рендеринг репетиторов =====
function renderTutors() {
    const filterLanguage = document.getElementById("filterTutorLanguage").value
    const filterLevel = document.getElementById("filterTutorLevel").value
    const filterExperience = Number.parseInt(document.getElementById("filterTutorExperience").value || "0", 10)

    let filtered = tutorsData.filter(tutor => {
        const matchesLanguage = !filterLanguage || 
            (tutor.languagesoffered && tutor.languagesoffered.includes(filterLanguage))
        
        const matchesLevel = !filterLevel || tutor.level === filterLevel
        
        const matchesExperience = tutor.yearsofexperience >= filterExperience
        
        return matchesLanguage && matchesLevel && matchesExperience
    })

    const container = document.getElementById("tutors-container")
    if (filtered.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="bi bi-search" style="font-size: 2rem;"></i>
                    <p class="mt-2 mb-0">Репетиторов не найдено</p>
                </td>
            </tr>
        `
        return
    }

    let html = ""
    filtered.forEach(tutor => {
        const levelBadgeClass = getLevelBadgeClass(tutor.level)
        const languagesList = tutor.languagesoffered ? tutor.languagesoffered.join(", ") : "-"
        
        html += `
            <tr class="tutor-row" onclick="selectTutor(${tutor.id})">
                <td>
                    <div class="tutor-avatar"><i class="bi bi-person-circle"></i></div>
                </td>
                <td class="fw-bold">${escapeHtml(tutor.name)}</td>
                <td><span class="badge ${levelBadgeClass}">${tutor.level}</span></td>
                <td class="text-truncate-tooltip" title="${languagesList}">${languagesList}</td>
                <td>${tutor.yearsofexperience} лет</td>
                <td class="text-success fw-bold">${tutor.hourlyrate} руб./ч</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="openTutorOrderModal(${tutor.id}, event)">
                        <i class="bi bi-plus-circle me-1"></i> Занятие
                    </button>
                </td>
            </tr>
        `
    })

    container.innerHTML = html
}

function selectTutor(tutorId) {
    selectedTutorId = tutorId
    
    const rows = document.querySelectorAll(".tutor-row")
    rows.forEach(row => row.classList.remove("selected"))
    
    const selected = document.querySelector(`.tutor-row[onclick="selectTutor(${tutorId})"]`)
    if (selected) selected.classList.add("selected")
}

// ===== Обработчики заказов курсов =====
async function openCourseOrderModal(courseId) {
    if (!isAuthorized()) {
        showNotification("Пожалуйста, авторизуйтесь для оформления заявки", "warning")
        const modal = new bootstrap.Modal(document.getElementById("authModal"))
        modal.show()
        return
    }

    try {
        const course = await getCourse(courseId)
        
        document.getElementById("orderCourseId").value = course.id
        document.getElementById("orderCourseName").value = course.name
        document.getElementById("orderTeacherName").value = course.instructorname
        document.getElementById("orderCourseFee").value = course.price
        document.getElementById("orderWeekLength").value = course.schedulefrequency
        document.getElementById("orderTotalLength").value = course.courselength

        const durationDisplay = `${course.courselength} недель по ${course.schedulefrequency} занятиям в неделю`
        document.getElementById("orderDuration").value = durationDisplay

        populateDateOptions()
        populateTimeOptions()
        updateOrderPrice()

        const modal = new bootstrap.Modal(document.getElementById("orderModal"))
        modal.show()
    } catch (error) {
        showNotification(error.message, "danger")
    }
}

async function openTutorOrderModal(tutorId, event) {
    event.stopPropagation()

    if (!isAuthorized()) {
        showNotification("Пожалуйста, авторизуйтесь для оформления заявки", "warning")
        const modal = new bootstrap.Modal(document.getElementById("authModal"))
        modal.show()
        return
    }

    try {
        const tutor = await getTutor(tutorId)
        
        document.getElementById("tutorOrderTutorId").value = tutor.id
        document.getElementById("tutorOrderName").value = tutor.name
        document.getElementById("tutorOrderLevel").value = tutor.level
        document.getElementById("tutorOrderFee").value = tutor.hourlyrate

        populateTutorTimeOptions()
        updateTutorOrderPrice()

        const modal = new bootstrap.Modal(document.getElementById("tutorOrderModal"))
        modal.show()
    } catch (error) {
        showNotification(error.message, "danger")
    }
}

function populateDateOptions() {
    const select = document.getElementById("orderDateStart")
    select.innerHTML = '<option value="">Выберите дату</option>'

    const today = new Date()
    for (let i = 0; i < 30; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split("T")[0]
        const displayStr = formatDate(date)

        const option = document.createElement("option")
        option.value = dateStr
        option.textContent = displayStr
        select.appendChild(option)
    }
}

function populateTimeOptions() {
    const select = document.getElementById("orderTimeStart")
    select.innerHTML = '<option value="">Выберите время</option>'

    const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]
    times.forEach(time => {
        const option = document.createElement("option")
        option.value = time
        option.textContent = time
        select.appendChild(option)
    })
}

function populateTutorTimeOptions() {
    const select = document.getElementById("tutorOrderTime")
    select.innerHTML = '<option value="">Выберите время</option>'

    const times = ["0900", "1000", "1100", "1200", "1300", "1400", "1500", "1600", "1700", "1800", "1900", "2000"]
    const timeLabels = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]
    
    times.forEach((time, index) => {
        const option = document.createElement("option")
        option.value = time
        option.textContent = timeLabels[index]
        select.appendChild(option)
    })
}

function onDateStartChange() {
    const dateStr = document.getElementById("orderDateStart").value
    if (dateStr) {
        const isWeekend = isWeekendOrHoliday(dateStr)
        const isEarly = checkEarlyRegistration(dateStr)

        document.getElementById("optionEarlyReg").checked = false
        document.getElementById("optionEarlyReg").disabled = !isEarly

        updateOrderPrice()
    }
}

function updateOrderPrice() {
    const dateStr = document.getElementById("orderDateStart").value
    const timeStr = document.getElementById("orderTimeStart").value
    const persons = Number.parseInt(document.getElementById("orderPersons").value || "1", 10)
    const fee = Number.parseInt(document.getElementById("orderCourseFee").value || "100", 10)
    const weekLength = Number.parseInt(document.getElementById("orderWeekLength").value || "1", 10)
    const totalLength = Number.parseInt(document.getElementById("orderTotalLength").value || "1", 10)

    const durationHours = totalLength

    const isWeekend = dateStr ? isWeekendOrHoliday(dateStr) : false
    const isEarly = dateStr ? checkEarlyRegistration(dateStr) : false
    const isGroup = checkGroupEnrollment(persons)
    const isIntensive = checkIntensiveCourse(weekLength)

    const supplementary = document.getElementById("optionSupplementary").checked
    const personalized = document.getElementById("optionPersonalized").checked
    const excursions = document.getElementById("optionExcursions").checked
    const assessment = document.getElementById("optionAssessment").checked
    const interactive = document.getElementById("optionInteractive").checked

    const result = calculatePrice({
        courseFeePerHour: fee,
        durationInHours: durationHours,
        isWeekendOrHoliday: isWeekend,
        timeStart: timeStr,
        studentsNumber: persons,
        earlyRegistration: isEarly,
        groupEnrollment: isGroup,
        intensiveCourse: isIntensive,
        supplementary: supplementary,
        personalized: personalized,
        excursions: excursions,
        assessment: assessment,
        interactive: interactive,
        totalWeeks: totalLength
    })

    document.getElementById("orderPrice").textContent = result.price + " руб."
    document.getElementById("orderPriceValue").value = result.price
    document.getElementById("priceBreakdown").innerHTML = result.breakdown.map(item => `<div>${item}</div>`).join("")

    document.getElementById("optionEarlyReg").disabled = !isEarly
    document.getElementById("optionGroupEnroll").disabled = !isGroup
    document.getElementById("optionIntensive").disabled = !isIntensive
}

async function submitCourseOrder() {
    if (!isAuthorized()) {
        showNotification("Требуется авторизация", "warning")
        return
    }

    const courseId = Number.parseInt(document.getElementById("orderCourseId").value, 10)
    const dateStr = document.getElementById("orderDateStart").value
    const timeStr = document.getElementById("orderTimeStart").value
    const persons = Number.parseInt(document.getElementById("orderPersons").value, 10)
    const price = Number.parseInt(document.getElementById("orderPriceValue").value, 10)

    if (!dateStr || !timeStr || persons < 1) {
        showNotification("Пожалуйста, заполните все обязательные поля", "warning")
        return
    }

    try {
        const orderData = {
            courseid: courseId,
            datetimestart: dateStr + "T" + timeStr,
            numberofstudents: persons,
            price: price
        }

        await createOrder(orderData)
        showNotification("Заявка успешно отправлена!", "success")

        const modal = bootstrap.Modal.getInstance(document.getElementById("orderModal"))
        if (modal) modal.hide()

        document.getElementById("orderForm").reset()
    } catch (error) {
        showNotification(error.message, "danger")
    }
}

// ===== Обработчики заказов репетиторов =====
function updateTutorOrderPrice() {
    const dateStr = document.getElementById("tutorOrderDate").value
    const timeStr = document.getElementById("tutorOrderTime").value
    const duration = Number.parseInt(document.getElementById("tutorOrderDuration").value || "1", 10)
    const persons = Number.parseInt(document.getElementById("tutorOrderPersons").value || "1", 10)
    const fee = Number.parseInt(document.getElementById("tutorOrderFee").value || "100", 10)

    const isWeekend = dateStr ? isWeekendOrHoliday(dateStr) : false
    const isEarly = dateStr ? checkEarlyRegistration(dateStr) : false
    const isGroup = checkGroupEnrollment(persons)
    const isIntensive = checkIntensiveCourse(1)

    const supplementary = document.getElementById("tutorOptSupplementary").checked
    const personalized = document.getElementById("tutorOptPersonalized").checked
    const excursions = document.getElementById("tutorOptExcursions").checked
    const assessment = document.getElementById("tutorOptAssessment").checked
    const interactive = document.getElementById("tutorOptInteractive").checked

    const result = calculatePrice({
        courseFeePerHour: fee,
        durationInHours: duration,
        isWeekendOrHoliday: isWeekend,
        timeStart: timeStr ? (timeStr.substring(0, 2) + ":" + timeStr.substring(2, 4)) : "09:00",
        studentsNumber: persons,
        earlyRegistration: isEarly,
        groupEnrollment: isGroup,
        intensiveCourse: isIntensive,
        supplementary: supplementary,
        personalized: personalized,
        excursions: excursions,
        assessment: assessment,
        interactive: interactive,
        totalWeeks: 1
    })

    document.getElementById("tutorOrderPrice").textContent = result.price + " руб."
    document.getElementById("tutorOrderPriceValue").value = result.price
    document.getElementById("tutorPriceBreakdown").innerHTML = result.breakdown.map(item => `<div>${item}</div>`).join("")

    document.getElementById("tutorOptEarlyReg").disabled = !isEarly
    document.getElementById("tutorOptGroupEnroll").disabled = !isGroup
    document.getElementById("tutorOptIntensive").disabled = !isIntensive
}

async function submitTutorOrder() {
    if (!isAuthorized()) {
        showNotification("Требуется авторизация", "warning")
        return
    }

    const tutorId = Number.parseInt(document.getElementById("tutorOrderTutorId").value, 10)
    const dateStr = document.getElementById("tutorOrderDate").value
    const timeStr = document.getElementById("tutorOrderTime").value
    const duration = Number.parseInt(document.getElementById("tutorOrderDuration").value, 10)
    const persons = Number.parseInt(document.getElementById("tutorOrderPersons").value, 10)
    const price = Number.parseInt(document.getElementById("tutorOrderPriceValue").value, 10)

    if (!dateStr || !timeStr || duration < 1 || persons < 1) {
        showNotification("Пожалуйста, заполните все обязательные поля", "warning")
        return
    }

    try {
        const timeHHMM = timeStr.substring(0, 2) + ":" + timeStr.substring(2, 4)
        const orderData = {
            tutorid: tutorId,
            datetimestart: dateStr + "T" + timeHHMM,
            durationhours: duration,
            numberofstudents: persons,
            price: price
        }

        await createOrder(orderData)
        showNotification("Заявка успешно отправлена!", "success")

        const modal = bootstrap.Modal.getInstance(document.getElementById("tutorOrderModal"))
        if (modal) modal.hide()

        document.getElementById("tutorOrderForm").reset()
    } catch (error) {
        showNotification(error.message, "danger")
    }
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

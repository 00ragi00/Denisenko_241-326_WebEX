/**
 * Главный модуль приложения
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

// Глобальные переменные для хранения данных
var coursesData = []
var tutorsData = []
var ordersData = []

// Настройки пагинации
var ITEMS_PER_PAGE = 5
var currentCoursePage = 1
var currentOrdersPage = 1

// Текущий выбранный репетитор
var selectedTutorId = null

var yandexMap = null
var mapPlacemarks = []
var yandexSearchControl = null

// === Инициализация приложения ===

document.addEventListener("DOMContentLoaded", () => {
  // Инициализация tooltips
  initTooltips()

  updateAuthUI()

  // Определяем текущую страницу
  const isAccountPage = window.location.pathname.includes("account")

  if (isAccountPage) {
    initAccountPage()
  } else {
    initMainPage()
  }

  setupAuthHandlers()
})

/**
 * Инициализация Bootstrap tooltips
 */
function initTooltips() {
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
  tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el))
}

/**
 * Обновление UI авторизации в навбаре
 */
function updateAuthUI() {
  const authSection = document.getElementById("nav-auth-section")
  if (!authSection) return

  if (isAuthorized()) {
    authSection.innerHTML = `
      <div class="d-flex align-items-center">
        <a class="nav-link btn btn-outline-light ms-lg-2 px-3" href="account.html">
          <i class="bi bi-person-circle me-1"></i>Личный кабинет
        </a>
        <button class="btn btn-outline-danger ms-2 px-3" id="logoutBtn">
          <i class="bi bi-box-arrow-right me-1"></i>Выйти
        </button>
      </div>
    `
    // Обработчик выхода
    document.getElementById("logoutBtn").addEventListener("click", handleLogout)
  } else {
    authSection.innerHTML = `
      <button class="nav-link btn btn-outline-light ms-lg-3 px-3" id="openAuthModalBtn">
        <i class="bi bi-box-arrow-in-right me-1"></i>Войти
      </button>
    `
    // Обработчик открытия модалки авторизации
    document.getElementById("openAuthModalBtn").addEventListener("click", () => {
      const modal = new bootstrap.Modal(document.getElementById("authModal"))
      modal.show()
    })
  }
}

/**
 * Установка обработчиков авторизации
 */
function setupAuthHandlers() {
  // Кнопка входа в модальном окне
  const loginBtn = document.getElementById("loginBtn")
  if (loginBtn) {
    loginBtn.addEventListener("click", handleLogin)
  }

  // Кнопка "Войти" на странице личного кабинета (для неавторизованных)
  const showAuthModalBtn = document.getElementById("showAuthModalBtn")
  if (showAuthModalBtn) {
    showAuthModalBtn.addEventListener("click", () => {
      const modal = new bootstrap.Modal(document.getElementById("authModal"))
      modal.show()
    })
  }

  // Отправка формы по Enter
  const apiKeyInput = document.getElementById("apiKeyInput")
  if (apiKeyInput) {
    apiKeyInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleLogin()
      }
    })
  }
}

/**
 * Обработчик входа
 */
function handleLogin() {
  const apiKeyInput = document.getElementById("apiKeyInput")
  const apiKey = apiKeyInput.value.trim()

  // Проверяем формат UUIDv4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(apiKey)) {
    showNotification("Неверный формат API ключа. Ключ должен быть в формате UUIDv4.", "danger")
    return
  }

  // Сохраняем ключ
  setApiKey(apiKey)

  // Закрываем модальное окно
  const modal = bootstrap.Modal.getInstance(document.getElementById("authModal"))
  if (modal) {
    modal.hide()
  }

  // Обновляем UI
  updateAuthUI()
  showNotification("Вы успешно вошли в систему!", "success")

  // Если на странице личного кабинета - перезагружаем данные
  const isAccountPage = window.location.pathname.includes("account")
  if (isAccountPage) {
    initAccountPage()
  }
}

/**
 * Обработчик выхода
 */
function handleLogout() {
  clearApiKey()
  updateAuthUI()
  showNotification("Вы вышли из системы", "info")

  // Если на странице личного кабинета - показываем блок авторизации
  const isAccountPage = window.location.pathname.includes("account")
  if (isAccountPage) {
    const authRequiredBlock = document.getElementById("auth-required-block")
    const ordersBlock = document.getElementById("orders-block")
    if (authRequiredBlock) authRequiredBlock.classList.remove("d-none")
    if (ordersBlock) ordersBlock.classList.add("d-none")
  }
}

// === Главная страница ===

/**
 * Инициализация главной страницы
 */
async function initMainPage() {
  try {
    // Загружаем данные параллельно
    const [courses, tutors] = await Promise.all([getCourses(), getTutors()])

    coursesData = courses
    tutorsData = tutors

    // Отображаем данные
    renderCourses()
    renderTutors()

    // Заполняем фильтр языков
    populateLanguageFilter()

    // Устанавливаем обработчики
    setupMainPageHandlers()

    initYandexMap()
  } catch (error) {
    showNotification("Ошибка загрузки данных: " + error.message, "danger")
  }
}

/**
 * Заполнение фильтра языков для репетиторов
 */
function populateLanguageFilter() {
  const languageSet = new Set()

  tutorsData.forEach((tutor) => {
    if (tutor.languages_offered) {
      tutor.languages_offered.forEach((lang) => languageSet.add(lang))
    }
  })

  const select = document.getElementById("filterTutorLanguage")
  languageSet.forEach((lang) => {
    const option = document.createElement("option")
    option.value = lang
    option.textContent = lang
    select.appendChild(option)
  })
}

/**
 * Установка обработчиков главной страницы
 */
function setupMainPageHandlers() {
  // Поиск курсов
  document.getElementById("searchCourse").addEventListener("input", debounce(renderCourses, 300))
  document.getElementById("filterLevel").addEventListener("change", renderCourses)

  // Фильтры репетиторов
  document.getElementById("filterTutorLanguage").addEventListener("change", renderTutors)
  document.getElementById("filterTutorLevel").addEventListener("change", renderTutors)
  document.getElementById("filterTutorExperience").addEventListener("input", debounce(renderTutors, 300))

  // Форма заказа курса
  document.getElementById("orderDateStart").addEventListener("change", onDateStartChange)
  document.getElementById("orderTimeStart").addEventListener("change", updateOrderPrice)
  document
    .getElementById("orderPersons")
    .addEventListener("input", updateOrderPrice)

  // Опции формы заказа курса
  ;["optionSupplementary", "optionPersonalized", "optionExcursions", "optionAssessment", "optionInteractive"].forEach(
    (id) => {
      document.getElementById(id).addEventListener("change", updateOrderPrice)
    },
  )

  // Отправка заказа курса
  document.getElementById("submitOrder").addEventListener("click", submitCourseOrder)

  // Форма заказа репетитора
  document.getElementById("tutorOrderDate").addEventListener("change", updateTutorOrderPrice)
  document.getElementById("tutorOrderTime").addEventListener("change", updateTutorOrderPrice)
  document.getElementById("tutorOrderDuration").addEventListener("input", updateTutorOrderPrice)
  document
    .getElementById("tutorOrderPersons")
    .addEventListener("input", updateTutorOrderPrice)

  // Опции формы заказа репетитора
  ;[
    "tutorOptSupplementary",
    "tutorOptPersonalized",
    "tutorOptExcursions",
    "tutorOptAssessment",
    "tutorOptInteractive",
  ].forEach((id) => {
    document.getElementById(id).addEventListener("change", updateTutorOrderPrice)
  })

  // Отправка заказа репетитора
  document.getElementById("submitTutorOrder").addEventListener("click", submitTutorOrder)

  const searchMapBtn = document.getElementById("searchMapBtn")
  if (searchMapBtn) {
    searchMapBtn.addEventListener("click", searchOnMap)
  }

  const mapSearchQuery = document.getElementById("mapSearchQuery")
  if (mapSearchQuery) {
    mapSearchQuery.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        searchOnMap()
      }
    })
  }
}

/**
 * Инициализация Яндекс карты
 */
function initYandexMap() {
  const mapContainer = document.getElementById("yandex-map")

  if (!mapContainer) {
    return
  }

  // Проверяем, загружен ли API Яндекс Карт
  if (typeof ymaps === "undefined") {
    console.warn("Yandex Maps API не загружен")
    mapContainer.innerHTML = `
      <div class="d-flex align-items-center justify-content-center h-100 bg-light">
        <div class="text-center">
          <i class="bi bi-map text-muted" style="font-size: 4rem;"></i>
          <p class="text-muted mt-3">Карта загружается...</p>
        </div>
      </div>
    `
    return
  }

  ymaps.ready(() => {
    // Москва - центр карты
    yandexMap = new ymaps.Map(mapContainer, {
      center: [55.751574, 37.573856],
      zoom: 11,
      controls: ["zoomControl", "searchControl", "typeSelector", "fullscreenControl", "geolocationControl"],
    })

    yandexSearchControl = new ymaps.control.SearchControl({
      options: {
        provider: "yandex#search",
        results: 50,
        useMapBounds: true,
        noPlacemark: true,
        noPopup: true,
      },
    })

    // Выполняем начальный поиск
    const mapSearchQuery = document.getElementById("mapSearchQuery")
    if (mapSearchQuery && !mapSearchQuery.value.trim()) {
      mapSearchQuery.value = "Москва"
    }
    searchOnMap()
  })
}

/**
 * Очистка меток с карты
 */
function clearMapPlacemarks() {
  if (yandexMap) {
    mapPlacemarks.forEach((placemark) => {
      yandexMap.geoObjects.remove(placemark)
    })
  }
  mapPlacemarks = []
}

/**
 * Поиск на Яндекс карте - только языковые школы
 */
function searchOnMap() {
  if (!yandexMap || !yandexSearchControl) return

  const resultsContainer = document.getElementById("map-results")
  const queryInput = document.getElementById("mapSearchQuery")
  const userText = queryInput ? queryInput.value.trim() : ""

  const query = userText ? `школа иностранных языков ${userText}` : "школа иностранных языков"

  clearMapPlacemarks()

  resultsContainer.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-muted mt-2 mb-0">Ищем языковые школы…</p>
    </div>
  `

  yandexSearchControl
    .search(query)
    .then(() => {
      const rawResults = yandexSearchControl.getResultsArray() || []
      const places = []
      rawResults.forEach((geoObject) => {
        if (!geoObject) return

        const name = geoObject.properties.get("name") || ""
        const address = geoObject.properties.get("description") || geoObject.properties.get("text") || ""
        const coords =
          geoObject.geometry && geoObject.geometry.getCoordinates ? geoObject.geometry.getCoordinates() : null

        if (!coords) return

        places.push({ name: name, address: address, coords: coords, geoObject: geoObject })
      })

      const stopWords = [
        "горнолыж",
        "лыж",
        "спорт",
        "плаван",
        "танц",
        "музык",
        "художеств",
        "автошкол",
        "школа вождения",
        "единобор",
        "фитнес",
      ]

      const mustHave = ["язык", "иностран", "english", "language", "курсы"]

      const filtered = places.filter((p) => {
        const s = `${p.name} ${p.address}`.toLowerCase()
        if (stopWords.some((w) => s.includes(w))) return false
        return mustHave.some((w) => s.includes(w))
      })

      const uniquePlaces = []
      const seen = new Set()
      filtered.forEach((p) => {
        const key = `${(p.name || "").toLowerCase()}|${(p.address || "").toLowerCase()}`
        if (seen.has(key)) return
        seen.add(key)
        uniquePlaces.push(p)
      })

      if (uniquePlaces.length === 0) {
        resultsContainer.innerHTML = `
          <div class="text-center py-5 text-muted">
            <i class="bi bi-search" style="font-size: 2rem;"></i>
            <p class="mt-2 mb-0">Языковые школы не найдены</p>
            <small>Попробуйте указать другой район</small>
          </div>
        `
        return
      }

      displayYandexResults(uniquePlaces)
    })
    .catch(() => {
      resultsContainer.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-exclamation-triangle text-warning" style="font-size: 2rem;"></i>
          <p class="mt-2 mb-0">Ошибка поиска</p>
          <small>Проверьте подключение к интернету</small>
        </div>
      `
    })
}

/**
 * Отображение результатов поиска Яндекс
 */
function displayYandexResults(places) {
  const resultsContainer = document.getElementById("map-results")
  let resultsHtml = ""
  const bounds = []

  places.forEach((place, index) => {
    // Создаём метку на карте
    const placemark = new ymaps.Placemark(
      place.coords,
      {
        balloonContentHeader: escapeHtml(place.name),
        balloonContentBody: `<p>${escapeHtml(place.address)}</p>`,
        balloonContentFooter:
          '<a href="https://yandex.ru/maps/?text=' +
          encodeURIComponent(place.name + " " + place.address) +
          '" target="_blank">Открыть в Яндекс Картах</a>',
        hintContent: place.name,
      },
      {
        preset: "islands#blueEducationIcon",
      },
    )

    yandexMap.geoObjects.add(placemark)
    mapPlacemarks.push(placemark)
    bounds.push(place.coords)

    // HTML для списка результатов
    resultsHtml += `
      <div class="map-result-item border-bottom p-3" data-index="${index}" style="cursor: pointer;">
        <h6 class="mb-1 text-primary">${escapeHtml(place.name)}</h6>
        <p class="mb-0 small text-muted"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(place.address)}</p>
      </div>
    `
  })

  // Центрируем карту на результатах
  if (bounds.length > 0) {
    yandexMap.setBounds(ymaps.util.bounds.fromPoints(bounds), {
      checkZoomRange: true,
      zoomMargin: 50,
    })
  }

  resultsContainer.innerHTML = resultsHtml

  // Добавляем обработчики клика на элементы списка
  resultsContainer.querySelectorAll(".map-result-item").forEach((item) => {
    item.addEventListener("click", () => {
      const index = Number.parseInt(item.dataset.index, 10)
      const placemark = mapPlacemarks[index]
      const place = places[index]

      if (placemark && place) {
        yandexMap.setCenter(place.coords, 16)
        placemark.balloon.open()
      }

      // Подсвечиваем выбранный элемент
      resultsContainer.querySelectorAll(".map-result-item").forEach((el) => el.classList.remove("bg-light"))
      item.classList.add("bg-light")
    })
  })
}

// === Рендеринг курсов ===

/**
 * Отображение курсов с фильтрацией и пагинацией
 */
function renderCourses() {
  const searchQuery = document.getElementById("searchCourse").value.toLowerCase()
  const levelFilter = document.getElementById("filterLevel").value

  // Фильтрация
  const filteredCourses = coursesData.filter((course) => {
    const matchesSearch =
      course.name.toLowerCase().includes(searchQuery) ||
      (course.description && course.description.toLowerCase().includes(searchQuery))
    const matchesLevel = !levelFilter || course.level === levelFilter
    return matchesSearch && matchesLevel
  })

  // Пагинация
  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE)
  currentCoursePage = Math.min(currentCoursePage, totalPages) || 1

  const startIndex = (currentCoursePage - 1) * ITEMS_PER_PAGE
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Рендеринг
  const container = document.getElementById("courses-container")

  if (paginatedCourses.length === 0) {
    container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
                <p class="text-muted mt-3">Курсы не найдены</p>
            </div>
        `
  } else {
    container.innerHTML = paginatedCourses.map((course) => createCourseCard(course)).join("")

    // Добавляем обработчики на кнопки
    container.querySelectorAll(".btn-enroll").forEach((btn) => {
      btn.addEventListener("click", () => openCourseOrderModal(Number.parseInt(btn.dataset.courseId)))
    })
  }

  // Пагинация
  renderPagination("courses-pagination", totalPages, currentCoursePage, (page) => {
    currentCoursePage = page
    renderCourses()
  })
}

/**
 * Создание карточки курса
 */
function createCourseCard(course) {
  const levelBadgeClass = getLevelBadgeClass(course.level)
  const description = course.description || "Описание курса"
  const truncatedDesc = description.length > 100 ? description.substring(0, 100) + "..." : description

  return `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card h-100 course-card shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title mb-0">${escapeHtml(course.name)}</h5>
                        <span class="badge ${levelBadgeClass}">${course.level}</span>
                    </div>
                    <p class="card-text text-muted small"
                       data-bs-toggle="tooltip"
                       title="${escapeHtml(description)}">${escapeHtml(truncatedDesc)}</p>
                    <ul class="list-unstyled small">
                        <li><i class="bi bi-person text-primary me-2"></i>${escapeHtml(course.teacher)}</li>
                        <li><i class="bi bi-clock text-primary me-2"></i>${course.total_length} нед. (${course.week_length} ч/нед.)</li>
                        <li><i class="bi bi-currency-ruble text-primary me-2"></i>${course.course_fee_per_hour} ₽/час</li>
                    </ul>
                </div>
                <div class="card-footer bg-transparent">
                    <button class="btn btn-primary w-100 btn-enroll" data-course-id="${course.id}">
                        <i class="bi bi-pencil-square me-1"></i>Подать заявку
                    </button>
                </div>
            </div>
        </div>
    `
}

// === Рендеринг репетиторов ===

/**
 * Отображение репетиторов с фильтрацией
 */
function renderTutors() {
  const languageFilter = document.getElementById("filterTutorLanguage").value
  const levelFilter = document.getElementById("filterTutorLevel").value
  const experienceFilter = Number.parseInt(document.getElementById("filterTutorExperience").value) || 0

  // Фильтрация
  const filteredTutors = tutorsData.filter((tutor) => {
    const matchesLanguage =
      !languageFilter || (tutor.languages_offered && tutor.languages_offered.includes(languageFilter))
    const matchesLevel = !levelFilter || tutor.language_level === levelFilter
    const matchesExperience = tutor.work_experience >= experienceFilter
    return matchesLanguage && matchesLevel && matchesExperience
  })

  const container = document.getElementById("tutors-container")

  if (filteredTutors.length === 0) {
    container.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-3">Репетиторы не найдены</p>
                </td>
            </tr>
        `
  } else {
    container.innerHTML = filteredTutors.map((tutor) => createTutorRow(tutor)).join("")

    // Добавляем обработчики
    container.querySelectorAll(".tutor-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        // Игнорируем клики на кнопках
        if (e.target.closest("button")) return

        const tutorId = Number.parseInt(row.dataset.tutorId)
        selectTutor(tutorId)
      })
    })

    container.querySelectorAll(".btn-tutor-order").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation()
        openTutorOrderModal(Number.parseInt(btn.dataset.tutorId))
      })
    })
  }
}

/**
 * Создание строки репетитора
 */
function createTutorRow(tutor) {
  const levelBadgeClass = getLevelBadgeClass(tutor.language_level)
  const languages = tutor.languages_offered ? tutor.languages_offered.join(", ") : "-"
  const isSelected = selectedTutorId === tutor.id

  return `
        <tr class="tutor-row ${isSelected ? "selected" : ""}" data-tutor-id="${tutor.id}">
            <td>
                <div class="tutor-avatar">
                    <i class="bi bi-person-fill"></i>
                </div>
            </td>
            <td><strong>${escapeHtml(tutor.name)}</strong></td>
            <td><span class="badge ${levelBadgeClass}">${tutor.language_level}</span></td>
            <td>${escapeHtml(languages)}</td>
            <td>${tutor.work_experience} лет</td>
            <td>${tutor.price_per_hour} ₽</td>
            <td>
                <button class="btn btn-sm btn-primary btn-tutor-order" data-tutor-id="${tutor.id}">
                    <i class="bi bi-calendar-plus me-1"></i>Записаться
                </button>
            </td>
        </tr>
    `
}

/**
 * Выбор репетитора
 */
function selectTutor(tutorId) {
  selectedTutorId = tutorId
  renderTutors()
}

// === Модальные окна заказов ===

/**
 * Открытие модального окна заказа курса
 */
function openCourseOrderModal(courseId) {
  const course = coursesData.find((c) => c.id === courseId)
  if (!course) return

  // Заполняем форму
  document.getElementById("orderCourseId").value = course.id
  document.getElementById("orderCourseName").value = course.name
  document.getElementById("orderTeacherName").value = course.teacher
  document.getElementById("orderDuration").value = `${course.total_length} нед. (${course.week_length} ч/нед.)`
  document.getElementById("orderWeekLength").value = course.week_length
  document.getElementById("orderTotalLength").value = course.total_length
  document.getElementById("orderPersons").value = 1

  // Заполняем даты
  populateDateOptions()

  // Заполняем время
  populateTimeOptions()

  // Сбрасываем опции
  document.getElementById("optionSupplementary").checked = false
  document.getElementById("optionPersonalized").checked = false
  document.getElementById("optionExcursions").checked = false
  document.getElementById("optionAssessment").checked = false
  document.getElementById("optionInteractive").checked = false

  // Обновляем цену
  updateOrderPrice()

  // Открываем модальное окно
  const modal = new bootstrap.Modal(document.getElementById("orderModal"))
  modal.show()
}

/**
 * Заполнение списка дат
 */
function populateDateOptions() {
  const dateSelect = document.getElementById("orderDateStart")
  dateSelect.innerHTML = '<option value="">Выберите дату...</option>'

  // Генерируем даты на ближайшие 90 дней
  const today = new Date()
  for (let i = 1; i <= 90; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)

    const option = document.createElement("option")
    option.value = date.toISOString().split("T")[0]
    option.textContent = formatDate(date)
    dateSelect.appendChild(option)
  }
}

/**
 * Обработчик изменения даты
 */
function onDateStartChange() {
  updateOrderPrice()
}

/**
 * Заполнение списка времени
 */
function populateTimeOptions() {
  const timeSelect = document.getElementById("orderTimeStart")
  timeSelect.innerHTML = '<option value="">Выберите время...</option>'

  const times = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
  ]

  times.forEach((time) => {
    const option = document.createElement("option")
    option.value = time
    option.textContent = time
    timeSelect.appendChild(option)
  })
}

/**
 * Обновление цены заказа курса
 */
function updateOrderPrice() {
  const courseId = document.getElementById("orderCourseId").value
  const course = coursesData.find((c) => c.id === Number.parseInt(courseId))
  if (!course) return

  const dateStart = document.getElementById("orderDateStart").value
  const timeStart = document.getElementById("orderTimeStart").value
  const persons = Number.parseInt(document.getElementById("orderPersons").value) || 1

  // Определяем общее количество часов
  const totalHours = course.week_length * course.total_length

  // Проверяем автоматические условия
  const isWeekend = dateStart ? isWeekendOrHoliday(dateStart) : false
  const earlyRegistration = dateStart ? checkEarlyRegistration(dateStart) : false
  const groupEnrollment = checkGroupEnrollment(persons)
  const intensiveCourse = checkIntensiveCourse(course.week_length)

  // Обновляем чекбоксы автоматических скидок/надбавок
  document.getElementById("optionEarlyReg").checked = earlyRegistration
  document.getElementById("optionGroupEnroll").checked = groupEnrollment
  document.getElementById("optionIntensive").checked = intensiveCourse

  // Получаем дополнительные опции
  const supplementary = document.getElementById("optionSupplementary").checked
  const personalized = document.getElementById("optionPersonalized").checked
  const excursions = document.getElementById("optionExcursions").checked
  const assessment = document.getElementById("optionAssessment").checked
  const interactive = document.getElementById("optionInteractive").checked

  // Рассчитываем цену
  const result = calculatePrice({
    courseFeePerHour: course.course_fee_per_hour,
    durationInHours: totalHours,
    isWeekendOrHoliday: isWeekend,
    timeStart: timeStart || "12:00",
    studentsNumber: persons,
    earlyRegistration: earlyRegistration,
    groupEnrollment: groupEnrollment,
    intensiveCourse: intensiveCourse,
    supplementary: supplementary,
    personalized: personalized,
    excursions: excursions,
    assessment: assessment,
    interactive: interactive,
    totalWeeks: course.total_length,
  })

  // Обновляем отображение
  document.getElementById("orderPrice").textContent = `${result.price.toLocaleString("ru-RU")} ₽`
  document.getElementById("orderPriceValue").value = result.price
  document.getElementById("priceBreakdown").innerHTML = result.breakdown.join("<br>")
}

/**
 * Отправка заказа курса
 */
async function submitCourseOrder() {
  if (!isAuthorized()) {
    showNotification("Для оформления заявки необходимо войти в систему", "warning")
    const modal = new bootstrap.Modal(document.getElementById("authModal"))
    modal.show()
    return
  }

  const courseId = document.getElementById("orderCourseId").value
  const dateStart = document.getElementById("orderDateStart").value
  const timeStart = document.getElementById("orderTimeStart").value
  const persons = document.getElementById("orderPersons").value
  const price = document.getElementById("orderPriceValue").value

  const course = coursesData.find((c) => c.id === Number.parseInt(courseId))

  if (!dateStart || !timeStart) {
    showNotification("Заполните все обязательные поля", "warning")
    return
  }

  // Собираем опции
  const options = []
  if (document.getElementById("optionEarlyReg").checked) options.push("earlyRegistration")
  if (document.getElementById("optionGroupEnroll").checked) options.push("groupEnrollment")
  if (document.getElementById("optionIntensive").checked) options.push("intensiveCourse")
  if (document.getElementById("optionSupplementary").checked) options.push("supplementary")
  if (document.getElementById("optionPersonalized").checked) options.push("personalized")
  if (document.getElementById("optionExcursions").checked) options.push("excursions")
  if (document.getElementById("optionAssessment").checked) options.push("assessment")
  if (document.getElementById("optionInteractive").checked) options.push("interactive")

  const orderData = {
    course_id: Number.parseInt(courseId),
    date_start: dateStart,
    time_start: timeStart,
    duration: course ? course.week_length * course.total_length : 1,
    persons: Number.parseInt(persons),
    price: Number.parseInt(price),
    options: options.join(","),
  }

  try {
    await createOrder(orderData)
    showNotification("Заявка успешно создана!", "success")

    // Закрываем модальное окно
    const modal = bootstrap.Modal.getInstance(document.getElementById("orderModal"))
    modal.hide()
  } catch (error) {
    showNotification("Ошибка создания заявки: " + error.message, "danger")
  }
}

/**
 * Открытие модального окна заказа репетитора
 */
function openTutorOrderModal(tutorId) {
  const tutor = tutorsData.find((t) => t.id === tutorId)
  if (!tutor) return

  // Заполняем форму
  document.getElementById("tutorOrderTutorId").value = tutor.id
  document.getElementById("tutorOrderName").value = tutor.name
  document.getElementById("tutorOrderLevel").value = tutor.language_level
  document.getElementById("tutorOrderFee").value = tutor.price_per_hour
  document.getElementById("tutorOrderDuration").value = 1
  document.getElementById("tutorOrderPersons").value = 1

  // Устанавливаем минимальную дату (завтра)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  document.getElementById("tutorOrderDate").min = tomorrow.toISOString().split("T")[0]
  document.getElementById("tutorOrderDate").value = ""

  // Сбрасываем опции
  document.getElementById("tutorOptSupplementary").checked = false
  document.getElementById("tutorOptPersonalized").checked = false
  document.getElementById("tutorOptExcursions").checked = false
  document.getElementById("tutorOptAssessment").checked = false
  document.getElementById("tutorOptInteractive").checked = false

  // Обновляем цену
  updateTutorOrderPrice()

  // Открываем модальное окно
  const modal = new bootstrap.Modal(document.getElementById("tutorOrderModal"))
  modal.show()
}

/**
 * Обновление цены заказа репетитора
 */
function updateTutorOrderPrice() {
  const tutorId = document.getElementById("tutorOrderTutorId").value
  const tutor = tutorsData.find((t) => t.id === Number.parseInt(tutorId))
  if (!tutor) return

  const dateStr = document.getElementById("tutorOrderDate").value
  const timeStart = document.getElementById("tutorOrderTime").value
  const duration = Number.parseInt(document.getElementById("tutorOrderDuration").value) || 1
  const persons = Number.parseInt(document.getElementById("tutorOrderPersons").value) || 1

  // Проверяем автоматические условия
  const isWeekend = dateStr ? isWeekendOrHoliday(dateStr) : false
  const earlyRegistration = dateStr ? checkEarlyRegistration(dateStr) : false
  const groupEnrollment = checkGroupEnrollment(persons)
  const intensiveCourse = false // Для репетитора не применяется

  // Обновляем чекбоксы
  document.getElementById("tutorOptEarlyReg").checked = earlyRegistration
  document.getElementById("tutorOptGroupEnroll").checked = groupEnrollment
  document.getElementById("tutorOptIntensive").checked = intensiveCourse

  // Получаем дополнительные опции
  const supplementary = document.getElementById("tutorOptSupplementary").checked
  const personalized = document.getElementById("tutorOptPersonalized").checked
  const excursions = document.getElementById("tutorOptExcursions").checked
  const assessment = document.getElementById("tutorOptAssessment").checked
  const interactive = document.getElementById("tutorOptInteractive").checked

  // Рассчитываем цену
  const result = calculatePrice({
    courseFeePerHour: tutor.price_per_hour,
    durationInHours: duration,
    isWeekendOrHoliday: isWeekend,
    timeStart: timeStart || "12:00",
    studentsNumber: persons,
    earlyRegistration: earlyRegistration,
    groupEnrollment: groupEnrollment,
    intensiveCourse: intensiveCourse,
    supplementary: supplementary,
    personalized: personalized,
    excursions: excursions,
    assessment: assessment,
    interactive: interactive,
    totalWeeks: 1,
  })

  // Обновляем отображение
  document.getElementById("tutorOrderPrice").textContent = `${result.price.toLocaleString("ru-RU")} ₽`
  document.getElementById("tutorOrderPriceValue").value = result.price
  document.getElementById("tutorPriceBreakdown").innerHTML = result.breakdown.join("<br>")
}

/**
 * Отправка заказа репетитора
 */
async function submitTutorOrder() {
  if (!isAuthorized()) {
    showNotification("Для оформления заявки необходимо войти в систему", "warning")
    const modal = new bootstrap.Modal(document.getElementById("authModal"))
    modal.show()
    return
  }

  const tutorId = document.getElementById("tutorOrderTutorId").value
  const dateStart = document.getElementById("tutorOrderDate").value
  const timeStart = document.getElementById("tutorOrderTime").value
  const duration = document.getElementById("tutorOrderDuration").value
  const persons = document.getElementById("tutorOrderPersons").value
  const price = document.getElementById("tutorOrderPriceValue").value

  if (!dateStart || !timeStart) {
    showNotification("Заполните все обязательные поля", "warning")
    return
  }

  // Собираем опции
  const options = []
  if (document.getElementById("tutorOptEarlyReg").checked) options.push("earlyRegistration")
  if (document.getElementById("tutorOptGroupEnroll").checked) options.push("groupEnrollment")
  if (document.getElementById("tutorOptSupplementary").checked) options.push("supplementary")
  if (document.getElementById("tutorOptPersonalized").checked) options.push("personalized")
  if (document.getElementById("tutorOptExcursions").checked) options.push("excursions")
  if (document.getElementById("tutorOptAssessment").checked) options.push("assessment")
  if (document.getElementById("tutorOptInteractive").checked) options.push("interactive")

  const orderData = {
    tutor_id: Number.parseInt(tutorId),
    date_start: dateStart,
    time_start: timeStart,
    duration: Number.parseInt(duration),
    persons: Number.parseInt(persons),
    price: Number.parseInt(price),
    options: options.join(","),
  }

  try {
    await createOrder(orderData)
    showNotification("Заявка успешно создана!", "success")

    // Закрываем модальное окно
    const modal = bootstrap.Modal.getInstance(document.getElementById("tutorOrderModal"))
    modal.hide()
  } catch (error) {
    showNotification("Ошибка создания заявки: " + error.message, "danger")
  }
}

// === Страница личного кабинета ===

/**
 * Инициализация страницы личного кабинета
 */
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

/**
 * Загрузка списка заявок
 */
async function loadOrders() {
  try {
    ordersData = await getOrders()
    renderOrders()
  } catch (error) {
    showNotification("Ошибка загрузки заявок: " + error.message, "danger")
  }
}

/**
 * Отображение заявок с пагинацией
 */
function renderOrders() {
  const container = document.getElementById("orders-container")
  const emptyOrders = document.getElementById("empty-orders")

  if (ordersData.length === 0) {
    container.innerHTML = ""
    emptyOrders.classList.remove("d-none")
    document.getElementById("orders-pagination").querySelector("ul").innerHTML = ""
    return
  }

  emptyOrders.classList.add("d-none")

  // Пагинация
  const totalPages = Math.ceil(ordersData.length / ITEMS_PER_PAGE)
  currentOrdersPage = Math.min(currentOrdersPage, totalPages) || 1

  const startIndex = (currentOrdersPage - 1) * ITEMS_PER_PAGE
  const paginatedOrders = ordersData.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  container.innerHTML = paginatedOrders.map((order) => createOrderRow(order)).join("")

  // Добавляем обработчики
  container.querySelectorAll(".btn-view-order").forEach((btn) => {
    btn.addEventListener("click", () => viewOrderDetails(Number.parseInt(btn.dataset.orderId)))
  })

  container.querySelectorAll(".btn-edit-order").forEach((btn) => {
    btn.addEventListener("click", () => openEditOrderModal(Number.parseInt(btn.dataset.orderId)))
  })

  container.querySelectorAll(".btn-delete-order").forEach((btn) => {
    btn.addEventListener("click", () => confirmDeleteOrder(Number.parseInt(btn.dataset.orderId)))
  })

  // Пагинация
  renderPagination("orders-pagination", totalPages, currentOrdersPage, (page) => {
    currentOrdersPage = page
    renderOrders()
  })
}

/**
 * Создание строки заявки
 */
function createOrderRow(order) {
  const name = order.course_id ? `Курс #${order.course_id}` : `Репетитор #${order.tutor_id}`
  const dateStr = order.date_start ? formatDate(new Date(order.date_start)) : "-"

  return `
        <tr>
            <td>${order.id}</td>
            <td>${escapeHtml(name)}</td>
            <td>${dateStr}</td>
            <td>${order.price ? order.price.toLocaleString("ru-RU") + " ₽" : "-"}</td>
            <td>
                <div class="btn-group btn-group-sm action-buttons">
                    <button class="btn btn-outline-info btn-view-order" data-order-id="${order.id}" title="Просмотр">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-warning btn-edit-order" data-order-id="${order.id}" title="Редактировать">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-delete-order" data-order-id="${order.id}" title="Удалить">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `
}

/**
 * Просмотр подробностей заявки
 */
async function viewOrderDetails(orderId) {
  try {
    const order = await getOrder(orderId)
    const content = document.getElementById("orderDetailsContent")

    let detailsHtml = `
            <dl class="row mb-0">
                <dt class="col-sm-4">ID заявки:</dt>
                <dd class="col-sm-8">${order.id}</dd>
                
                <dt class="col-sm-4">Тип:</dt>
                <dd class="col-sm-8">${order.course_id ? "Курс" : "Репетитор"}</dd>
                
                <dt class="col-sm-4">${order.course_id ? "ID курса" : "ID репетитора"}:</dt>
                <dd class="col-sm-8">${order.course_id || order.tutor_id}</dd>
                
                <dt class="col-sm-4">Дата начала:</dt>
                <dd class="col-sm-8">${order.date_start ? formatDate(new Date(order.date_start)) : "-"}</dd>
                
                <dt class="col-sm-4">Время:</dt>
                <dd class="col-sm-8">${order.time_start || "-"}</dd>
                
                <dt class="col-sm-4">Продолжительность:</dt>
                <dd class="col-sm-8">${order.duration || "-"} ч.</dd>
                
                <dt class="col-sm-4">Кол-во студентов:</dt>
                <dd class="col-sm-8">${order.persons || 1}</dd>
                
                <dt class="col-sm-4">Стоимость:</dt>
                <dd class="col-sm-8">${order.price ? order.price.toLocaleString("ru-RU") + " ₽" : "-"}</dd>
        `

    if (order.options) {
      detailsHtml += `
                <dt class="col-sm-4">Опции:</dt>
                <dd class="col-sm-8">${formatOptions(order.options)}</dd>
            `
    }

    detailsHtml += `</dl>`

    content.innerHTML = detailsHtml

    const modal = new bootstrap.Modal(document.getElementById("orderDetailsModal"))
    modal.show()
  } catch (error) {
    showNotification("Ошибка загрузки заявки: " + error.message, "danger")
  }
}

/**
 * Форматирование опций заказа
 */
function formatOptions(optionsStr) {
  const optionLabels = {
    earlyRegistration: '<span class="discount-badge">Ранняя регистрация -10%</span>',
    groupEnrollment: '<span class="discount-badge">Групповая запись -15%</span>',
    intensiveCourse: '<span class="surcharge-badge">Интенсивный курс +20%</span>',
    supplementary: '<span class="surcharge-badge">Доп. материалы</span>',
    personalized: '<span class="surcharge-badge">Индивид. занятия</span>',
    excursions: '<span class="surcharge-badge">Экскурсии +25%</span>',
    assessment: '<span class="surcharge-badge">Оценка уровня</span>',
    interactive: '<span class="surcharge-badge">Интерактив. платформа +50%</span>',
  }

  if (!optionsStr) return "-"

  return optionsStr
    .split(",")
    .map((opt) => optionLabels[opt.trim()] || opt)
    .join(" ")
}

/**
 * Установка обработчиков страницы личного кабинета
 */
function setupAccountPageHandlers() {
  // Подтверждение удаления
  const confirmDeleteBtn = document.getElementById("confirmDeleteOrder")
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", executeDeleteOrder)
  }

  // Сохранение изменений
  const saveEditBtn = document.getElementById("saveEditOrder")
  if (saveEditBtn) {
    saveEditBtn.addEventListener("click", saveOrderChanges)
  }
}

/**
 * Подтверждение удаления заявки
 */
function confirmDeleteOrder(orderId) {
  document.getElementById("deleteOrderId").value = orderId
  const modal = new bootstrap.Modal(document.getElementById("deleteOrderModal"))
  modal.show()
}

/**
 * Выполнение удаления заявки
 */
async function executeDeleteOrder() {
  const orderId = document.getElementById("deleteOrderId").value

  try {
    await deleteOrder(orderId)
    showNotification("Заявка удалена", "success")

    // Закрываем модальное окно
    const modal = bootstrap.Modal.getInstance(document.getElementById("deleteOrderModal"))
    modal.hide()

    // Перезагружаем список
    await loadOrders()
  } catch (error) {
    showNotification("Ошибка удаления: " + error.message, "danger")
  }
}

/**
 * Открытие модального окна редактирования заявки
 */
async function openEditOrderModal(orderId) {
  try {
    const order = await getOrder(orderId)

    // Определяем тип заказа
    const isCourse = !!order.course_id

    // Заполняем скрытые поля
    document.getElementById("editOrderId").value = order.id
    document.getElementById("editOrderType").value = isCourse ? "course" : "tutor"
    document.getElementById("editCourseId").value = order.course_id || ""
    document.getElementById("editTutorId").value = order.tutor_id || ""

    // Заполняем видимые поля
    document.getElementById("editOrderName").value = isCourse
      ? `Курс #${order.course_id}`
      : `Репетитор #${order.tutor_id}`
    document.getElementById("editOrderTeacher").value = "-"

    // Заполняем даты
    populateEditDateOptions(order.date_start)

    // Заполняем время
    populateEditTimeOptions(order.time_start)

    // Продолжительность
    document.getElementById("editDuration").value = order.duration ? `${order.duration} ч.` : "-"
    document.getElementById("editDurationHours").value = order.duration || 1

    // Студенты
    document.getElementById("editPersons").value = order.persons || 1

    // Опции
    const options = order.options ? order.options.split(",") : []
    document.getElementById("editOptEarlyReg").checked = options.includes("earlyRegistration")
    document.getElementById("editOptGroupEnroll").checked = options.includes("groupEnrollment")
    document.getElementById("editOptIntensive").checked = options.includes("intensiveCourse")
    document.getElementById("editOptSupplementary").checked = options.includes("supplementary")
    document.getElementById("editOptPersonalized").checked = options.includes("personalized")
    document.getElementById("editOptExcursions").checked = options.includes("excursions")
    document.getElementById("editOptAssessment").checked = options.includes("assessment")
    document.getElementById("editOptInteractive").checked = options.includes("interactive")

    // Стоимость
    document.getElementById("editOrderPrice").textContent = order.price
      ? `${order.price.toLocaleString("ru-RU")} ₽`
      : "0 ₽"
    document.getElementById("editOrderPriceValue").value = order.price || 0

    // Добавляем обработчики для пересчёта цены
    setupEditFormHandlers()

    const modal = new bootstrap.Modal(document.getElementById("editOrderModal"))
    modal.show()
  } catch (error) {
    showNotification("Ошибка загрузки заявки: " + error.message, "danger")
  }
}

/**
 * Заполнение списка дат в форме редактирования
 */
function populateEditDateOptions(selectedDate) {
  const dateSelect = document.getElementById("editDateStart")
  dateSelect.innerHTML = '<option value="">Выберите дату...</option>'

  const today = new Date()
  for (let i = 1; i <= 90; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)

    const option = document.createElement("option")
    const dateValue = date.toISOString().split("T")[0]
    option.value = dateValue
    option.textContent = formatDate(date)

    if (selectedDate && dateValue === selectedDate.split("T")[0]) {
      option.selected = true
    }

    dateSelect.appendChild(option)
  }
}

/**
 * Заполнение списка времени в форме редактирования
 */
function populateEditTimeOptions(selectedTime) {
  const timeSelect = document.getElementById("editTimeStart")
  timeSelect.innerHTML = '<option value="">Выберите время...</option>'

  const times = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
  ]

  times.forEach((time) => {
    const option = document.createElement("option")
    option.value = time
    option.textContent = time

    if (selectedTime && time === selectedTime) {
      option.selected = true
    }

    timeSelect.appendChild(option)
  })
}

/**
 * Настройка обработчиков формы редактирования
 */
function setupEditFormHandlers() {
  const elements = [
    "editDateStart",
    "editTimeStart",
    "editPersons",
    "editOptSupplementary",
    "editOptPersonalized",
    "editOptExcursions",
    "editOptAssessment",
    "editOptInteractive",
  ]

  elements.forEach((id) => {
    const el = document.getElementById(id)
    if (el) {
      el.removeEventListener("change", updateEditOrderPrice)
      el.addEventListener("change", updateEditOrderPrice)
    }
  })
}

/**
 * Обновление цены в форме редактирования
 */
function updateEditOrderPrice() {
  const dateStart = document.getElementById("editDateStart").value
  const timeStart = document.getElementById("editTimeStart").value
  const persons = Number.parseInt(document.getElementById("editPersons").value) || 1
  const duration = Number.parseInt(document.getElementById("editDurationHours").value) || 1

  // Базовая цена (приблизительно)
  const baseFee = 200

  const isWeekend = dateStart ? isWeekendOrHoliday(dateStart) : false
  const earlyRegistration = dateStart ? checkEarlyRegistration(dateStart) : false
  const groupEnrollment = checkGroupEnrollment(persons)

  document.getElementById("editOptEarlyReg").checked = earlyRegistration
  document.getElementById("editOptGroupEnroll").checked = groupEnrollment

  const supplementary = document.getElementById("editOptSupplementary").checked
  const personalized = document.getElementById("editOptPersonalized").checked
  const excursions = document.getElementById("editOptExcursions").checked
  const assessment = document.getElementById("editOptAssessment").checked
  const interactive = document.getElementById("editOptInteractive").checked

  const result = calculatePrice({
    courseFeePerHour: baseFee,
    durationInHours: duration,
    isWeekendOrHoliday: isWeekend,
    timeStart: timeStart || "12:00",
    studentsNumber: persons,
    earlyRegistration: earlyRegistration,
    groupEnrollment: groupEnrollment,
    intensiveCourse: false,
    supplementary: supplementary,
    personalized: personalized,
    excursions: excursions,
    assessment: assessment,
    interactive: interactive,
    totalWeeks: 1,
  })

  document.getElementById("editOrderPrice").textContent = `${result.price.toLocaleString("ru-RU")} ₽`
  document.getElementById("editOrderPriceValue").value = result.price
  document.getElementById("editPriceBreakdown").innerHTML = result.breakdown.join("<br>")
}

/**
 * Сохранение изменений заявки
 */
async function saveOrderChanges() {
  const orderId = document.getElementById("editOrderId").value
  const orderType = document.getElementById("editOrderType").value
  const dateStart = document.getElementById("editDateStart").value
  const timeStart = document.getElementById("editTimeStart").value
  const persons = document.getElementById("editPersons").value
  const price = document.getElementById("editOrderPriceValue").value
  const duration = document.getElementById("editDurationHours").value

  if (!dateStart || !timeStart) {
    showNotification("Заполните все обязательные поля", "warning")
    return
  }

  // Собираем опции
  const options = []
  if (document.getElementById("editOptEarlyReg").checked) options.push("earlyRegistration")
  if (document.getElementById("editOptGroupEnroll").checked) options.push("groupEnrollment")
  if (document.getElementById("editOptIntensive").checked) options.push("intensiveCourse")
  if (document.getElementById("editOptSupplementary").checked) options.push("supplementary")
  if (document.getElementById("editOptPersonalized").checked) options.push("personalized")
  if (document.getElementById("editOptExcursions").checked) options.push("excursions")
  if (document.getElementById("editOptAssessment").checked) options.push("assessment")
  if (document.getElementById("editOptInteractive").checked) options.push("interactive")

  const orderData = {
    date_start: dateStart,
    time_start: timeStart,
    duration: Number.parseInt(duration),
    persons: Number.parseInt(persons),
    price: Number.parseInt(price),
    options: options.join(","),
  }

  // Добавляем ID курса или репетитора
  if (orderType === "course") {
    orderData.course_id = Number.parseInt(document.getElementById("editCourseId").value)
  } else {
    orderData.tutor_id = Number.parseInt(document.getElementById("editTutorId").value)
  }

  try {
    await updateOrder(orderId, orderData)
    showNotification("Заявка обновлена!", "success")

    // Закрываем модальное окно
    const modal = bootstrap.Modal.getInstance(document.getElementById("editOrderModal"))
    modal.hide()

    // Перезагружаем список
    await loadOrders()
  } catch (error) {
    showNotification("Ошибка обновления: " + error.message, "danger")
  }
}

// === Вспомогательные функции ===

/**
 * Получение класса badge для уровня
 */
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

/**
 * Форматирование даты
 */
function formatDate(date) {
  const options = { day: "numeric", month: "long", year: "numeric" }
  return date.toLocaleDateString("ru-RU", options)
}

/**
 * Экранирование HTML
 */
function escapeHtml(text) {
  if (!text) return ""
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

/**
 * Debounce функция
 */
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

/**
 * Отображение уведомления
 */
function showNotification(message, type = "info") {
  const area = document.getElementById("notification-area")
  if (!area) return

  const id = "toast-" + Date.now()
  const bgClass =
    type === "danger"
      ? "bg-danger"
      : type === "success"
        ? "bg-success"
        : type === "warning"
          ? "bg-warning text-dark"
          : "bg-info"

  const toastHtml = `
        <div id="${id}" class="toast notification-toast ${bgClass} text-white" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-body d-flex align-items-center">
                <i class="bi ${type === "success" ? "bi-check-circle" : type === "danger" ? "bi-x-circle" : type === "warning" ? "bi-exclamation-triangle" : "bi-info-circle"} me-2 fs-5"></i>
                <span>${escapeHtml(message)}</span>
                <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="toast" aria-label="Закрыть"></button>
            </div>
        </div>
    `

  area.insertAdjacentHTML("beforeend", toastHtml)

  const toastEl = document.getElementById(id)
  const toast = new bootstrap.Toast(toastEl, { delay: 5000 })
  toast.show()

  // Удаляем элемент после скрытия
  toastEl.addEventListener("hidden.bs.toast", () => {
    toastEl.remove()
  })
}

/**
 * Отображение пагинации
 */
function renderPagination(containerId, totalPages, currentPage, onPageChange) {
  const container = document.getElementById(containerId)
  if (!container) return

  const ul = container.querySelector("ul")
  if (!ul) return

  if (totalPages <= 1) {
    ul.innerHTML = ""
    return
  }

  let html = ""

  // Кнопка "Назад"
  html += `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `

  // Страницы
  for (let i = 1; i <= totalPages; i++) {
    html += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `
  }

  // Кнопка "Вперёд"
  html += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `

  ul.innerHTML = html

  // Обработчики
  ul.querySelectorAll(".page-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      const page = Number.parseInt(link.dataset.page)
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        onPageChange(page)
      }
    })
  })
}

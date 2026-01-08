// Проверка выходного дня или праздника
function isWeekendOrHoliday(dateStr) {
    const date = new Date(dateStr + "T00:00:00")
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6
}

// Проверка раннего бронирования (более чем за 30 дней)
function checkEarlyRegistration(dateStr) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lessonDate = new Date(dateStr + "T00:00:00")
    const daysBeforeLesson = Math.floor((lessonDate - today) / (1000 * 60 * 60 * 24))
    return daysBeforeLesson > 30
}

// Проверка группового обучения (более 1 человека)
function checkGroupEnrollment(persons) {
    return persons > 1
}

// Проверка интенсивного курса (более 2 занятий в неделю)
function checkIntensiveCourse(weekLength) {
    return weekLength > 2
}

// Расчет стоимости с учетом всех скидок и надбавок
// @param {Object} params - параметры расчета
// @returns {Object} {price, breakdown}
function calculatePrice(params) {
    const {
        courseFeePerHour = 100,
        durationInHours = 1,
        isWeekendOrHoliday = false,
        timeStart = "09:00",
        studentsNumber = 1,
        earlyRegistration = false,
        groupEnrollment = false,
        intensiveCourse = false,
        supplementary = false,
        personalized = false,
        excursions = false,
        assessment = false,
        interactive = false,
        totalWeeks = 1
    } = params

    let basePrice = courseFeePerHour * durationInHours
    let breakdown = []

    breakdown.push(`Базовая цена: ${basePrice} руб.`)

    // Выходной день +30%
    if (isWeekendOrHoliday) {
        const surcharge = Math.round(basePrice * 0.3)
        basePrice += surcharge
        breakdown.push(`Выходной день +30%: +${surcharge} руб.`)
    }

    // Время после 18:00 +25%
    if (timeStart && timeStart >= "18:00") {
        const surcharge = Math.round(basePrice * 0.25)
        basePrice += surcharge
        breakdown.push(`Позднее время +25%: +${surcharge} руб.`)
    }

    // Раннее бронирование -10%
    if (earlyRegistration) {
        const discount = Math.round(basePrice * 0.1)
        basePrice -= discount
        breakdown.push(`Раннее бронирование -10%: -${discount} руб.`)
    }

    // Групповое обучение -15%
    if (groupEnrollment) {
        const discount = Math.round(basePrice * 0.15)
        basePrice -= discount
        breakdown.push(`Групповое обучение -15%: -${discount} руб.`)
    }

    // Интенсивный курс +20%
    if (intensiveCourse) {
        const surcharge = Math.round(basePrice * 0.2)
        basePrice += surcharge
        breakdown.push(`Интенсивный курс +20%: +${surcharge} руб.`)
    }

    // Дополнительные услуги
    let servicesTotal = 0
    if (supplementary) {
        servicesTotal += 2000
        breakdown.push(`Дополнительные материалы: +2000 руб.`)
    }
    if (personalized) {
        servicesTotal += 1500
        breakdown.push(`Персонализированный подход: +1500 руб.`)
    }
    if (excursions) {
        servicesTotal += 2500
        breakdown.push(`Экскурсии: +2500 руб.`)
    }
    if (assessment) {
        servicesTotal += 300
        breakdown.push(`Тестирование: +300 руб.`)
    }
    if (interactive) {
        servicesTotal += 500
        breakdown.push(`Интерактивные задания: +500 руб.`)
    }

    basePrice += servicesTotal

    const finalPrice = Math.round(basePrice)
    breakdown.push(`Итого: ${finalPrice} руб.`)

    return {
        price: finalPrice,
        breakdown: breakdown
    }
}

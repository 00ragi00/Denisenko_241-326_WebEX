/**
 * Модуль расчёта стоимости заказа
 * Содержит чистую функцию для вычисления цены по правилам из ТЗ
 */

/**
 * Рассчитывает стоимость заказа на курс
 * @param {Object} params - Параметры заказа
 * @param {number} params.courseFeePerHour - Стоимость за час
 * @param {number} params.durationInHours - Продолжительность в часах
 * @param {boolean} params.isWeekendOrHoliday - Выходной/праздник
 * @param {string} params.timeStart - Время начала (формат HH:MM)
 * @param {number} params.studentsNumber - Количество студентов
 * @param {boolean} params.earlyRegistration - Ранняя регистрация
 * @param {boolean} params.groupEnrollment - Групповая запись
 * @param {boolean} params.intensiveCourse - Интенсивный курс
 * @param {boolean} params.supplementary - Доп. материалы
 * @param {boolean} params.personalized - Индивид. занятия
 * @param {boolean} params.excursions - Экскурсии
 * @param {boolean} params.assessment - Оценка уровня
 * @param {boolean} params.interactive - Интерактивная платформа
 * @param {number} params.totalWeeks - Общая продолжительность курса в неделях (для personalized)
 * @returns {Object} - Объект с ценой и деталями расчёта
 */
function calculatePrice(params) {
  const {
    courseFeePerHour = 0,
    durationInHours = 0,
    isWeekendOrHoliday = false,
    timeStart = "12:00",
    studentsNumber = 1,
    earlyRegistration = false,
    groupEnrollment = false,
    intensiveCourse = false,
    supplementary = false,
    personalized = false,
    excursions = false,
    assessment = false,
    interactive = false,
    totalWeeks = 1,
  } = params

  const breakdown = []

  // Базовая стоимость
  const basePrice = courseFeePerHour * durationInHours
  breakdown.push(`Базовая: ${courseFeePerHour} × ${durationInHours} ч = ${basePrice} ₽`)

  // Коэффициент выходного/праздника
  const weekendMultiplier = isWeekendOrHoliday ? 1.5 : 1
  const priceAfterWeekend = basePrice * weekendMultiplier
  if (isWeekendOrHoliday) {
    breakdown.push(`Выходной/праздник: ×1.5 = ${priceAfterWeekend} ₽`)
  }

  // Надбавки за время
  const hour = Number.parseInt(timeStart.split(":")[0], 10)
  let morningSurcharge = 0
  let eveningSurcharge = 0

  // Утренняя надбавка: 09:00 - 11:59 (до 12:00)
  if (hour >= 9 && hour < 12) {
    morningSurcharge = 400
    breakdown.push(`Утренняя надбавка: +${morningSurcharge} ₽`)
  }

  // Вечерняя надбавка: 18:00 - 20:59 (до 21:00)
  if (hour >= 18 && hour <= 20) {
    eveningSurcharge = 1000
    breakdown.push(`Вечерняя надбавка: +${eveningSurcharge} ₽`)
  }

  // Базовая стоимость с надбавками (до умножения на студентов)
  const priceWithSurcharges = priceAfterWeekend + morningSurcharge + eveningSurcharge

  // Умножаем на количество студентов
  const priceForStudents = priceWithSurcharges * studentsNumber
  if (studentsNumber > 1) {
    breakdown.push(`× ${studentsNumber} студентов = ${priceForStudents} ₽`)
  }

  // Применяем скидки/надбавки (взаимоисключающие: только одна из earlyRegistration/groupEnrollment/intensiveCourse)
  let discountApplied = ""
  let discountMultiplier = 1

  if (earlyRegistration) {
    discountMultiplier = 0.9 // -10%
    discountApplied = "Ранняя регистрация: -10%"
  } else if (groupEnrollment) {
    discountMultiplier = 0.85 // -15%
    discountApplied = "Групповая запись: -15%"
  } else if (intensiveCourse) {
    discountMultiplier = 1.2 // +20%
    discountApplied = "Интенсивный курс: +20%"
  }

  const priceAfterDiscount = priceForStudents * discountMultiplier
  if (discountApplied) {
    breakdown.push(`${discountApplied} = ${Math.round(priceAfterDiscount)} ₽`)
  }

  // Дополнительные опции (могут сочетаться)
  let additionalCost = 0

  // Доп. материалы: +2000 за каждого студента
  if (supplementary) {
    const suppCost = 2000 * studentsNumber
    additionalCost += suppCost
    breakdown.push(`Доп. материалы: +${suppCost} ₽`)
  }

  // Индивид. занятия: +1500 за каждую неделю
  if (personalized) {
    const persCost = 1500 * totalWeeks
    additionalCost += persCost
    breakdown.push(`Индивид. занятия: +${persCost} ₽`)
  }

  // Оценка уровня: +300
  if (assessment) {
    additionalCost += 300
    breakdown.push(`Оценка уровня: +300 ₽`)
  }

  const priceWithAdditional = priceAfterDiscount + additionalCost

  // Процентные опции (excursions, interactive)
  let percentageMultiplier = 1

  // Экскурсии: +25%
  if (excursions) {
    percentageMultiplier *= 1.25
    breakdown.push(`Экскурсии: +25%`)
  }

  // Интерактивная платформа: +50%
  if (interactive) {
    percentageMultiplier *= 1.5
    breakdown.push(`Интерактив. платформа: +50%`)
  }

  const finalPrice = Math.round(priceWithAdditional * percentageMultiplier)

  return {
    price: finalPrice,
    breakdown: breakdown,
  }
}

/**
 * Проверяет, является ли дата выходным или праздником
 * @param {string} dateStr - Дата в формате YYYY-MM-DD
 * @returns {boolean}
 */
function isWeekendOrHoliday(dateStr) {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()

  // Суббота (6) или воскресенье (0)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true
  }

  // Список праздничных дней России (примерный)
  const holidays = [
    "01-01",
    "01-02",
    "01-03",
    "01-04",
    "01-05",
    "01-06",
    "01-07",
    "01-08", // Новогодние
    "02-23", // День защитника Отечества
    "03-08", // Международный женский день
    "05-01", // Праздник Весны и Труда
    "05-09", // День Победы
    "06-12", // День России
    "11-04", // День народного единства
  ]

  const monthDay = dateStr.substring(5) // MM-DD
  return holidays.includes(monthDay)
}

/**
 * Проверяет, применяется ли скидка за раннюю регистрацию
 * @param {string} dateStart - Дата начала курса
 * @returns {boolean}
 */
function checkEarlyRegistration(dateStart) {
  const today = new Date()
  const startDate = new Date(dateStart)
  const diffTime = startDate - today
  const diffDays = diffTime / (1000 * 60 * 60 * 24)

  // Не менее 30 дней до начала
  return diffDays >= 30
}

/**
 * Проверяет, применяется ли скидка за групповую запись
 * @param {number} persons - Количество студентов
 * @returns {boolean}
 */
function checkGroupEnrollment(persons) {
  return persons >= 5
}

/**
 * Проверяет, применяется ли надбавка за интенсивный курс
 * @param {number} weekLength - Часов в неделю
 * @returns {boolean}
 */
function checkIntensiveCourse(weekLength) {
  return weekLength >= 5
}

// Тестовые примеры вызова (для проверки корректности)
/*
// Пример 1: Базовый расчёт
console.log(calculatePrice({
    courseFeePerHour: 200,
    durationInHours: 16,
    isWeekendOrHoliday: false,
    timeStart: '14:00',
    studentsNumber: 1
}));
// Ожидается: 200 * 16 * 1 = 3200 ₽

// Пример 2: С выходным и утренней надбавкой
console.log(calculatePrice({
    courseFeePerHour: 200,
    durationInHours: 16,
    isWeekendOrHoliday: true,
    timeStart: '10:00',
    studentsNumber: 2
}));
// Ожидается: ((200 * 16 * 1.5) + 400) * 2 = (4800 + 400) * 2 = 10400 ₽

// Пример 3: С ранней регистрацией
console.log(calculatePrice({
    courseFeePerHour: 200,
    durationInHours: 16,
    isWeekendOrHoliday: false,
    timeStart: '14:00',
    studentsNumber: 1,
    earlyRegistration: true
}));
// Ожидается: 3200 * 0.9 = 2880 ₽

// Пример 4: Полный набор опций
console.log(calculatePrice({
    courseFeePerHour: 200,
    durationInHours: 16,
    isWeekendOrHoliday: false,
    timeStart: '14:00',
    studentsNumber: 5,
    groupEnrollment: true,
    supplementary: true,
    personalized: true,
    excursions: true,
    assessment: true,
    interactive: true,
    totalWeeks: 8
}));
*/

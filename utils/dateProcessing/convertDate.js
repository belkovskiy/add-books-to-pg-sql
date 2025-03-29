const formatDate = (dateStr) => {
  const months = {
    'января': '01',
    'февраля': '02',
    'марта': '03',
    'апреля': '04',
    'мая': '05',
    'июня': '06',
    'июля': '07',
    'августа': '08',
    'сентбря': '09',
    'октября': '10',
    'ноября': '11',
    'декабря': '12'
  }

  const dateForReport = {
    'id': '',
    'title': ''
  }

  if (!dateStr && !typeof dateStr === 'string') return 'error';

  const monthsTestExp = Object.keys(months).join('|');

  const dateStringregExp =
    new RegExp(`^.* с \\d{1,2} (${monthsTestExp}) \\d{4} г\. по \\d{1,2} (${monthsTestExp}) \\d{4} г\..*$`);

  if (!dateStringregExp.test(dateStr)) return 'error'
  dateStr = dateStr.split(' с ')[1];
  console.log(dateStr);

  const [startDate, endDate] =
    dateStr.replace(/г./g, '').split(' по ');

  const convertDateForTitle = (date, forId = false) => {
    const [day, month, year] = date.split(' ');
    if (forId) {
      return (`${day.padStart(2, '0')}.${months[month] || '01'}.${year}`)
        .replace(/[.]/g, '-');
    } else {
      return `${day.padStart(2, '0')}.${months[month] || '01'}.${year}`;
    }
  }
  dateForReport.id =
    convertDateForTitle(startDate, true)
    + '-'
    + convertDateForTitle(endDate, true);
  dateForReport.title =
    convertDateForTitle(startDate)
    + '-'
    + convertDateForTitle(endDate);
  return dateForReport;
}

console.log(formatDate('апва с 1 января 2023 г. по 31 марта 2023 г. апапвп'));

console.log(formatDate('KLKJcc,m,dl04985043985 с 1 января 2023 г. по 31 марта 2023 г.пппупкп'));

console.log(formatDate('___--0-03432akldlkasjdllKLJLlkjkllДлодлоацщушгЩШГЩГЩ с 1 апреля 2022 г. по 30 июня 2022 г. пакпкпку'));

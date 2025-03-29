const camelToKebab = (str) => {
  const bookMetaData = {};
  let prefix = str.slice(0, 2);
  // console.log(prefix);
  // console.log(str[2]);
  let resultStr = '';
  if (str[2] === str[2].toUpperCase() && prefix !== 'ru') {
    str = str.slice(2);
    bookMetaData.languageId = prefix + '-' + prefix;
    switch(prefix) {
      case 'en':
        bookMetaData.languageId = prefix + '-us';
        break;
      case 'zh':
        bookMetaData.languageId = prefix + '-cn';
        break;
      default:
        bookMetaData.languageId = prefix + '-' + prefix;
    }
  } else {
    bookMetaData.languageId = 'ru-ru';
  }

  for (let i = 0; i < str.length; i++) {
    if (str[i] === str[i].toUpperCase() && i !== 0) {
      resultStr += '-';
      resultStr += str[i].toLowerCase();
    } else {
      resultStr += str[i];
    }

  }
  str = '';
  resultStr = resultStr.toLowerCase();
  bookMetaData.bookId = resultStr;
  // console.log(resultStr);
  // console.log(bookMetaData);
  return bookMetaData;
};

// camelToKebab('enSoulAndMisteries');
// camelToKebab('earthIsThinkingPlanet');
// camelToKebab('enCreatingMan');
// camelToKebab('itSoulAndMisteries');
// camelToKebab('ptHighterMindOpens');
// camelToKebab('ptSoulAndMisteries');
// camelToKebab('csHigherWorldsMisteries');
module.exports = camelToKebab;

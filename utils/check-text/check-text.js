const Typo = require('typo-js');
const fs = require('fs');
const path = require('path');

// Загрузка словарей
const affPath = path.join(__dirname, 'ru_RU.aff');
const dicPath = path.join(__dirname, 'ru_RU.dic');

const dictionary = new Typo('ru_RU', fs.readFileSync(affPath, 'utf-8'), fs.readFileSync(dicPath, 'utf-8'));

function checkAndHighlightText(text) {
  const words = text.split(/(\s+|\p{P}+)/u);

  const highlightedWords = words.map((word) => {
    if (/^\s+$/.test(word) || /^\p{P}+$/u.test(word)) {
      return word;
    }

    if (!dictionary.check(word)) {
      const suggestions = dictionary.suggest(word);
      const correctedWord = suggestions[0] || word;
      console.log(correctedWord);
      return `<span style="color: red; text-decoration: underline;">${correctedWord}</span>`;
    }

    return word;
  });

  return highlightedWords.join('');
}

// Пример использования
const inputText = "Финансовыйотчет за периодс 01октября по 20 октября.Примечание: создан авторомЦентром.";
const highlightedText = checkAndHighlightText(inputText);

console.log(highlightedText);













// const hunspell = require('hunspell-spellchecker');
// const fs = require('fs');
// const path = require('path');

// // Загрузка словарей для русского языка
// const affPath = path.join(__dirname, 'ru_RU.aff');
// const dicPath = path.join(__dirname, 'ru_RU.dic');

// const spellchecker = new hunspell();
// spellchecker.use({
//   aff: fs.readFileSync(affPath),
//   dic: fs.readFileSync(dicPath),
// });

// function checkAndCorrectText(text) {
//   const words = text.split(/(\s+|\p{P}+)/u);

//   console.log(words);

//   const correctedWords = words.map((word) => {
//     if (/^\s+$/.test(word) || /^\p{P}+$/u.test(word)) {
//       // console.log(word);
//       return word;
//     }
//     console.log(word);
//     console.log(spellchecker.check('литовцем'));
//     if (!spellchecker.check(word)) {
//       const suggestions = spellchecker.suggest(word);
//       // console.log(suggestions);
//       return suggestions[0] || word; // Исправляем слово или оставляем как есть
//     }

//     return word;
//   });

//   return correctedWords.join('');
// }

// // Пример использования
// const inputText = "Финансовыйотчет за периодс 01октября по 20 октября.Примечание: создан авторомЦентром.";
// const correctedText = checkAndCorrectText(inputText);

// console.log(correctedText);



















///****************************************** */
// const { SpellCheck } = require('node-nlp');

// const spellcheck = new SpellCheck();

// (async () => {
//   await spellcheck.add('ru'); // Добавляем русский язык

//   const inputText = "Финансовыйотчет за периодс 01октября по 20 октября.Примечание: создан авторомЦентром.";
//   const correctedText = await spellcheck.check(inputText, 'ru');

//   console.log(correctedText);
// })();
//**************************************************
//  */
// const checkText = (text) => {
//   const regExp = /\d/;

//   if (text.match(/[а-яА-Я][А-Яа-я]/)) {
//     console.log("Error");
//   }
//   console.log(text);
// }


//text.match(/[а-яА-Я][A-Za-z]/) || text.match(/[A-Za-z][а-яА-Я]/)
// checkText("ReturntoForever!!!");

// checkText('Слипшиеся слова');
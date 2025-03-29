require('dotenv').config();
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

const uuidv4 = require('uuid').v4;
const stableStringify = require('json-stable-stringify');

const cliProgress = require('cli-progress');

const camelToKebab = require('./utils/books/camel-to-kebab.js');

const allBooksDir = './data2/books/';


const barCurrent = new cliProgress.SingleBar({
  format: 'Current: {bar} {percentage}% | {value}/{total} strings',
}, cliProgress.Presets.shades_classic);

const barTotal = new cliProgress.SingleBar({
  format: 'Total: {bar} {percentage}% | {value}/{total} strings',
}, cliProgress.Presets.shades_classic);

let cliCurrentCounter = 0;
let cliTotalCounter = 0;

const getHead = (str) => {
  let num = str.match(/\d+/);

  if (num > 0) {
    return parseInt(str.match(/\d+/)[0], 10);
  } else {
    return null;
  }
};

const defineIsDictionary = (fileName) => {
  return (
    fileName
      .toLowerCase()
      .includes('xdict')
  ) ? true : false;
}

// function generateHash2(data) {
//   const serialized = JSON.stringify(JSON.parse(data), replacer);
//   return crypto
//     .createHash('sha256')
//     .update(serialized)
//     .digest('hex');
// };

// function replacer(key, value) {
//   if (value instanceof Buffer) {
//     return value.toString('base64');
//   }
// }

function generateHash(data) {
  return crypto
    .createHash('sha256')
    .update((data))
    .digest('hex');
};

function isValidJson(data) {
  return (typeof data === 'object');
};

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: 5432,
  ssl: true
});

// ///////////

const grdmsPath = '';

//////////////
async function migrateData() {

  const booksDir = await fs.readdir(allBooksDir, { withFileTypes: true });

  const processdBooks = [];
  const failedBooks = [];


  try {

    cliTotalCounter = booksDir.length;
    barTotal.start(cliTotalCounter, 0);

    for (const bookDir of booksDir) {
      if (!bookDir.isDirectory()) continue;


      const bookName = bookDir.name;
      const bookPath = path.join(allBooksDir, bookName);

      // console.log(bookName);

      const { bookId, languageId } = camelToKebab(bookName);

      try {
        const files = await fs.readdir(bookPath);


        cliCurrentCounter = files.length;
        barCurrent.start(cliCurrentCounter, 0);


        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const filePath = path.join(bookPath, file);

          try {

            const rawData = await fs.readFile(filePath, 'utf-8');
            // console.log(typeof rawData);
            // const jsonData = JSON.stringify(JSON.parse(rawData));

            const jsonData = stableStringify(JSON.parse(rawData));

            const fileName = path.basename(filePath);

            // console.log(stableStringify(JSON.parse(rawData)));

            // console.log(fileName);
            // console.log(rawData);
            // console.log(jsonData);

            // JSON.stringify(JSON.parse('[\r\n  {\r\n    \"text\": \"Dictionary! Hello World!!!\"\r\n  }\r\n]'))

            // if (!isValidJson(jsonData)) {
            //   throw new Error('Json Data is Not Valid!');
            // }

            const client = await pool.connect();
            const moduleId = uuidv4();

            const head = getHead(fileName);
            const isDictionary = defineIsDictionary(fileName);

            try {
              await client.query('BEGIN');
              // console.log(moduleId);
              // console.log(bookId);
              // console.log(languageId);
              // console.log(head);
              // console.log(isDictionary);
              // console.log();
              const hashedContent = generateHash(jsonData);
              // console.log(hashedContent);
              const { rows } = await client.query(`
                INSERT INTO books_temp
                (id, book_id, language_id, head, is_dictionary, content)
                VALUES ($1, $2, $3, $4, $5, $6::jsonb)
                RETURNING *
                `,
                [
                  moduleId,
                  bookId,
                  languageId,
                  head,
                  isDictionary,
                  jsonData
                ]);

              // console.log(rows[0].content);
              // console.log(JSON.stringify(rows[0].content));

              // console.log(stableStringify(rows[0].content));

              if (generateHash(stableStringify(rows[0].content)) !== hashedContent) {
                throw new Error('Content Error!');
              }


              // if (generateHash(JSON.stringify(rows[0].content)) !== hashedContent) {
              //   throw new Error('Content Error!');
              // }

              await client.query('COMMIT');
              processdBooks.push({
                bookId,
                languageId,
                head,
                isDictionary
              });


              barCurrent.increment();


            } catch (error) {
              await client.query('ROLLBACK');
              console.error(error);
              throw error;
            } finally {
              client.release();
            }

          } catch (error) {
            failedBooks.push({
              bookId,
              languageId,

            });
            console.error('Error Processing', error);
          }
        }


        barCurrent.stop();
        barTotal.increment();



      } catch (error) {
        failedBooks.push({
          bookName,
          error: `Directory Error ${error.message}`
        });
        console.error(error);
      }
    }


    barTotal.stop();


    return { processdBooks, failedBooks };
  } catch (error) {

    console.error(error);
    return { processdBooks, failedBooks };

  }







  //Fields: id ([PK]uuid), bookId, languageId, head (1-999 || null), isDictionary (true/false), content (json)



  // try {
  //  

  // } catch (error) {
  //   console.error(error);
  // }
}

// camelToKebab('zhSoulAndMisteries');
// camelToKebab('enSoulAndMisteries');
// camelToKebab('earthIsThinkingPlanet');
// camelToKebab('enCreatingMan');
// camelToKebab('itSoulAndMisteries');
// camelToKebab('ptHighterMindOpens');
// camelToKebab('ptSoulAndMisteries');
// camelToKebab('csHigherWorldsMisteries');

// console.log(getHead('csHigherWorldsMisteries09.json'));
// console.log(getHead('csSoulAndMisteries02.json'));
// console.log(getHead('freedomAndInevitability04.json'));
// console.log(getHead('creatingSoulXDict.json'));

// console.log(getHead('csHigherWorldsMisteries19.json'));
// console.log(getHead('csSoulAndMisteries22.json'));
// console.log(getHead('freedomAndInevitability04'));
// console.log(getHead('creatingSoulXDict'));

migrateData().then(({ processdBooks, failedBooks }) => {
  console.log('Processed Complete!');
  console.log(`Success: ${processdBooks.length}`);
  console.log(`Failed: ${failedBooks.length}`);

  if (failedBooks.length > 0) {
    console.table(failedBooks, ['bookId', 'languageId', 'head', 'isDictionary']);
  }
}).catch(console.error);





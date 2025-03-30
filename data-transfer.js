require('dotenv').config();
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

const uuidv4 = require('uuid').v4;
const stableStringify = require('json-stable-stringify');

const cliProgress = require('cli-progress');

const camelToKebab = require('./utils/books/camel-to-kebab.js');

const allBooksDir = './data2/books/';

const restoreCursor = () => {
  process.stdout.write('\x1B[?25h');
}

process.on('SIGINT', () => {
  restoreCursor();
  console.log('\nTerminated!');
  multiBar.stop();
  process.exit();
})
process.on('exit', () => {
  restoreCursor();
  // multiBar.stop();
  console.log("\nExit!");
});

const multiBar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true,
  format: ' {bar} | {filename} | {value}/{total}',
  stopOnComplete: true,
  forceRedraw: true
}, cliProgress.Presets.shades_grey);



// const barCurrent = new cliProgress.SingleBar({
//   format: 'Current: {bar} {percentage}% | {value}/{total} Book Files',
// }, cliProgress.Presets.shades_classic);

// const barTotal = new cliProgress.SingleBar({
//   format: 'Total: {bar} {percentage}% | {value}/{total} Books',
// }, cliProgress.Presets.shades_classic);

let cliCurrentCounter = 0;
let cliTotalCounter = 0;

let startTime = null;
let stopTime = null;

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

async function checkExisting(bookId, languageId, head, isDictionary, content) {
  const query = `
  SELECT 1 FROM books_json
  WHERE book_id = $1
    AND language_id = $2
    AND head IS NOT DISTINCT FROM $3
    AND is_dictionary = $4
    AND content = $5::jsonb
  LIMIT 1
  `;

  const result = await pool.query(query, [
    bookId,
    languageId,
    head,
    isDictionary,
    content
  ]);

  return result.rowCount > 0;
}

async function migrateData() {

  const booksDir = await fs.readdir(allBooksDir, { withFileTypes: true });

  const processedBooks = [];
  const failedBooks = [];


  try {

    cliTotalCounter = booksDir.length;
    const totalProgress = multiBar.create(cliTotalCounter, 0);

    // barTotal.start(cliTotalCounter, 0);

    for (const bookDir of booksDir) {
      if (!bookDir.isDirectory()) continue;


      const bookName = bookDir.name;
      const bookPath = path.join(allBooksDir, bookName);

      // console.log(`Записывается книга: ${bookName}! Всего книг для записи: ${cliTotalCounter}`);
      // cliTotalCounter--;

      totalProgress.update({ filename: `Книга: ${bookName}` });

      const { bookId, languageId } = camelToKebab(bookName);

      try {
        const files = await fs.readdir(bookPath);


        cliCurrentCounter = files.length;

        const currentProgress = multiBar.create(cliCurrentCounter, 0);

        // barCurrent.start(cliCurrentCounter, 0);


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



            // if (!isValidJson(jsonData)) {
            //   throw new Error('Json Data is Not Valid!');
            // }

            const client = await pool.connect();
            const moduleId = uuidv4();

            const head = getHead(fileName);
            const isDictionary = defineIsDictionary(fileName);

            try {
              await client.query('BEGIN');

              const hashedContent = generateHash(jsonData);

              const exists = await checkExisting(
                bookId,
                languageId,
                head,
                isDictionary,
                jsonData
              );

              if (!exists) {
                const { rows } = await client.query(`
                  INSERT INTO books_json
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

                // console.log()
                currentProgress.update({ filename: `Файл книги: ${fileName}` });
                // console.log(`Записывается файл книги: ${fileName}`);

                // if (generateHash(JSON.stringify(rows[0].content)) !== hashedContent) {
                //   throw new Error('Content Error!');
                // }

                await client.query('COMMIT');
                processedBooks.push({
                  bookId,
                  languageId,
                  head,
                  isDictionary
                });

                // console.log(`Записывается книга: ${bookName}! Всего книг для записи: ${cliTotalCounter}`);
                // cliCurrentCounter--;
                // console.log(`Книга: ${bookName}/ Записан файл: Осталось файлов данной книги ${cliCurrentCounter}`);

                currentProgress.increment();


                // barCurrent.increment();
                // console.log('Current Log!');



              } else {
                currentProgress.update({ filename: 'Глава и/или словарь уже в БД!' });

                // console.log(`\nГлава и/или словарь ${bookId} уже существует в БД!`);

                failedBooks.push({
                  bookId,
                  languageId,

                });
              }


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
        // cliTotalCounter--;
        multiBar.remove(currentProgress);
        totalProgress.increment();
        // barCurrent.stop();
        // barTotal.increment(1);



      } catch (error) {
        failedBooks.push({
          bookName,
          error: `Directory Error ${error.message}`
        });
        console.error(error);
      }
    }

    multiBar.stop();
    // barTotal.stop();


    return { processedBooks, failedBooks };
  } catch (error) {

    console.error(error);
    return { processedBooks, failedBooks };

  }
}

console.time('migrateData');

// startTime = Date.now();
migrateData().then(({ processedBooks, failedBooks }) => {
  // stopTime = Date.now();
  console.timeEnd('migrateData');
  console.log('\nProcessed Complete!');
  console.log(`\nSuccess: ${processedBooks.length}`);
  console.log(`\nFailed: ${failedBooks.length}`);

  // console.log(new Date(stopTime - startTime).getMinutes());
  if (failedBooks.length > 0) {
    console.table(failedBooks, ['bookId', 'languageId', 'head', 'isDictionary']);
  }
  
}).catch(console.error);






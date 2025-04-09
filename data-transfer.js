require('dotenv').config();
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

const uuidv4 = require('uuid').v4;
const stableStringify = require('json-stable-stringify');

const cliProgress = require('cli-progress');

const camelToKebab = require('./utils/books/camel-to-kebab.js');

const allBooksDir = './data2/books/';

const TARGET_TABLE_NAME = 'books2';

const restoreCursor = () => {
  process.stdout.write('\x1B[?25h');
}

process.on('SIGINT', () => {
  restoreCursor();
  console.log('\nTerminated!\n');
  multiBar.stop();
  process.exit();
})
process.on('exit', () => {
  restoreCursor();
  console.log("\nSuccessfully Exit!\n");
});

const multiBar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true,
  format: ' {bar} | {filename} | {value}/{total}',
  stopOnComplete: true,
  forceRedraw: true
}, cliProgress.Presets.shades_grey);

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

function generateHash(data) {
  return crypto
    .createHash('sha256')
    .update((data))
    .digest('hex');
};

function isValidJson(data) {    
  return (typeof data === 'object' || Array.isArray(data));
};

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: 5432,
});

async function checkExisting(bookId, languageId, head, isDictionary, content) {
  const query = `
  SELECT 1 FROM ${TARGET_TABLE_NAME}
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

const bookProps = {
  bookId: null,
  languageId: null,
  head: null,
  isDictionary: false
}
const processedBooks = [];
const failedBooks = [];

async function migrateData() {
  const booksDir = await fs.readdir(allBooksDir, { withFileTypes: true });

  try {
    multiBar.log('\nПроцесс обработки книг .....\n');

    cliTotalCounter = booksDir.length;
    const totalProgress = multiBar.create(cliTotalCounter, 0);

    for (const bookDir of booksDir) {
      if (!bookDir.isDirectory()) continue;
      const bookName = bookDir.name;
      const bookPath = path.join(allBooksDir, bookName);

      totalProgress.update({ filename: `Книга: ${bookName}` });

      const { bookId, languageId } = camelToKebab(bookName);

      try {
        const files = await fs.readdir(bookPath);

        cliCurrentCounter = files.length;

        const currentProgress = multiBar.create(cliCurrentCounter, 0);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const filePath = path.join(bookPath, file);

          try {
            const rawData = await fs.readFile(filePath, 'utf-8');

            const jsonData = stableStringify(JSON.parse(rawData));

            const fileName = path.basename(filePath);


            if (!isValidJson(JSON.parse(rawData))) {
              throw new Error('Json Data is Not Valid!');
            }

            const client = await pool.connect();
            const moduleId = uuidv4();

            const head = getHead(fileName);
            const isDictionary = defineIsDictionary(fileName);

            bookProps.bookId = bookId;
            bookProps.languageId = languageId;
            bookProps.head = head;
            bookProps.isDictionary = isDictionary;

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
                  INSERT INTO ${TARGET_TABLE_NAME}
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

                if (generateHash(stableStringify(rows[0].content)) !== hashedContent) {
                  throw new Error('Content Error!');
                }

                currentProgress.update({ filename: `Файл книги: ${fileName}` });

                await client.query('COMMIT');
                processedBooks.push({
                  ...bookProps
                });
                currentProgress.increment();
              } else {
                currentProgress.update({ filename: 'Глава и/или словарь уже существует в БД!' });
                failedBooks.push({
                  ...bookProps
                });
              }
            } catch (error) {
              await client.query('ROLLBACK');
              multiBar.log(error, '\n');
              throw error;
            } finally {
              client.release();
            }
          } catch (error) {
            failedBooks.push({
              ...bookProps
            });
            multiBar.log('Error Processing', error, '\n');
          }
        }

        multiBar.remove(currentProgress);
        totalProgress.increment();

      } catch (error) {
        failedBooks.push({
          bookName,
          error: `Directory Error ${error.message}`
        });
        multiBar.log(error, '\n');
      }
    }
    multiBar.stop();
    return { processedBooks, failedBooks };
  } catch (error) {
    console.error(error);
    return { processedBooks, failedBooks };
  }
}

console.time('migrateData');
migrateData().then(({ processedBooks, failedBooks }) => {
  console.log('Время выполнения функции: ');
  console.timeEnd('migrateData');
  console.log('\nПроцесс обработки файлов книг завершен!');
  console.log(`\nВсего успешно записанных файлов: ${processedBooks.length}`);
  console.log(`\nОшибок : ${failedBooks.length}`);
  if (failedBooks.length > 0) {
    console.log('НЕ записанные, или уже имеющиеся в БД части Книг: ');
    console.table(failedBooks, ['bookId', 'languageId', 'head', 'isDictionary']);
  }
  if (processedBooks.length > 0) {
    console.log('Успешно записанные в БД части Книг: ');
    console.table(processedBooks, ['bookId', 'languageId', 'head', 'isDictionary']);
  }
})
  .catch(console.error)
  .finally(() => pool.end());
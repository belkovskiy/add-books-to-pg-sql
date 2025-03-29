require('dotenv').config();

const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: 5432,
});

const selectNewsQuery = `SELECT * FROM public.news`;

const newsPath = __dirname + '/files/news/';

async function getAllTableValues(table) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT * FROM ${table};`
    );
    console.log(result.rows);

    const newsData = result.rows;
    const contentData = newsData.map(item => item.content);
    const writeResult = fs.writeFileSync(newsPath + 'news.json', JSON.stringify(contentData, null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    client.release();
  }
}



async function getAllTableNewsFields(table) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT id, title, created, content, key_words FROM ${table};`
    );
    // console.log(result.rows);

    const newsData = result.rows;
    const contentData = newsData.map(item => item);
    const writeResult = fs.writeFileSync(newsPath + 'news.json', JSON.stringify(contentData, null, 2));
    console.log(writeResult);

  } catch (error) {
    console.error(error);
  } finally {
    client.release();
  }
}

// getAllTableValues('public.news');
getAllTableNewsFields('public.news');

console.log(__dirname + '/files/news/');
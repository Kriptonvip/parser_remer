import fs from 'fs/promises';
import axios from 'axios';
import cheerio from 'cheerio';
import { dataBlades } from './data.js';

async function readUrlsFromFile(filename) {
  try {
    const data = await fs.readFile(filename, 'utf-8');
    return data.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error reading URLs from file:', error);
    return [];
  }
}

async function fetchHtml(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching the HTML from ${url}:`, error);
    return null;
  }
}

async function parseAndSave(url) {
  const html = await fetchHtml(url);

  if (!html) {
    console.error(`Could not fetch HTML content from ${url}.`);
    return [];
  }
  const $ = cheerio.load(html);
  const products = [];
  const productName = $('h1').text();
  $('ul.product-options li').each((index, element) => {
    const input = $(element).find('input.product-options');
    const label = $(element).find('label');
    const articul = input.attr('value');
    const price = input.attr('data-price');
    const availability = label.hasClass('product-options-disabled') ? 'Нет в наличии' : 'В наличии';
    const description = label.text().trim();
    if(dataBlades[articul] === undefined) {
      return;
    };
    products.push({
      Name:`${productName}`,
      articulTTsport: articul,
      'offer id': dataBlades[articul],
      price: price.split(' ')[0],
      Наличие: availability,
      Описание: description,
      Склад:'TTСпорт',
      Cсылка: url,
    });
  });

  return products;
}

async function main() {
  const urls = await readUrlsFromFile('blades1.txt');
  const allProducts = [];
  let count = 0;
  for (const url of urls) {
    const products = await parseAndSave(url);
    count++;
    console.log(`Product ${count} parse done!`)
    allProducts.push(...products);
  }

  const csvFilename = `products_combined_blades.csv`;
  const csvContent = `Name;articulTTsport;offer id;price;Наличие;Модификация;Склад;Ссылка\n${allProducts.map(p => Object.values(p).join(';')).join('\n')}`;

  await fs.writeFile(csvFilename, csvContent, 'utf-8');

  console.log(`Data successfully parsed and saved to the file ${csvFilename}`);
}

await main();

import fs from 'fs/promises';
import axios from 'axios';
import cheerio from 'cheerio';
import path from 'path';
import rus_to_latin from './translit.js';
import pdfjsLib from 'pdfjs-dist';
import downloadAndConvertPDFToImages  from './pdf2img.js';
import uploadFileToFTP from './imgLoadAndGetPath.js'

async function appendLinksToFile(links, filename) {
  try {
    await fs.appendFile(filename, links.join('\n') + '\n', 'utf-8');
    console.log(`Адреса успешно добавлены к файлу: ${filename}`);
  } catch (error) {
    console.error(`Ошибка при добавлении адресов к файлу: ${error.message}`);
  }
}
async function getPDFFileName(pdfUrl) {
  // Извлекаем имя PDF-файла из URL
  const urlParts = pdfUrl.split('/');
  return urlParts[urlParts.length - 1];
}

async function readUrlsFromFile(filename) {
  try {
    const data = await fs.readFile(filename, 'utf-8');
    return data.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error reading URLs from file:', error);
    return [];
  }
}
const  downloadDirectory = './downloaded_images';


async function fetchHtml(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching the HTML from ${url}:`, error);
    return null;
  }
}


async function parseAndSave(url, prodUrls, prodNames) {
  const isProductVariant = !url.includes('?');
  const cleanUrl = isProductVariant ? url : url.split('?')[0];
  const isVariant = url.includes('?') && prodUrls.has(cleanUrl); // проверяем есть ли в prodUrls url
  const isProduct = !isProductVariant && !isVariant;
  const prodType = isProduct ? 'product' : isProductVariant ? 'product_variant' : isVariant ? 'variant' : false;
  prodUrls.has(cleanUrl) ? console.log(cleanUrl + ' already has in prodUrls Set') : prodUrls.add(cleanUrl); //если нет то добавляем.
  
  const html = await fetchHtml(url);

  
  if (!html) {
    console.error(`Could not fetch HTML content from ${url}.`);
    return [];
  }
  const $ = cheerio.load(html);
  const products = [];

//Функция для собирания адресов всех артикулов.
const colorVariantLinks = [];
const colorVariantElements = $('[itemprop="offers"] [itemprop="url"]');
if (colorVariantElements.length === 0) {
  colorVariantLinks.push[url]
}
colorVariantElements.each((index, element) => {
  const url = $(element).attr('href');
  if (url) {
    colorVariantLinks.push(`https://remer.shop${url}`);
  }
});
await appendLinksToFile(colorVariantLinks, './links/verkhnie_dushiAll.txt');
async function parseColorVariants() {
  for (const url of colorVariantLinks) {
    const product = await parseAndSave(url);
    allProducts.push(product);
  }
}

// const modifiedLinks = colorVariantLinks.map((url) => `${url}?oid=${oid}`);

// Выводим модифицированные URL-адреса
console.log('colorVariantLinks:', colorVariantLinks);

  return products;
}

async function main() {
  const urls = await readUrlsFromFile('./links/verkhnie_dushi.txt');
  const allProducts = [];
  const prodUrls = new Set();
  const prodNames = new Set();
  let count = 0;
  for (const url of urls) {
    const products = await parseAndSave(url, prodUrls, prodNames);
    count++;
    console.log(`Product ${count} parse done!`)
    if(products.length !== 0) {
      allProducts.push(...products)
      if(products[0][ "Тип строки"] === 'product'){
        const productsRepeat = await parseAndSave(url, prodUrls, prodNames);
        allProducts.push(...productsRepeat);
      }
    }
  }
  // const csvFilename = `./links/dushevye-sistemy.csv`;
  // const csvContent = `${allProducts.map(p => Object.values(p).join(';')).join('\n')}`;

}

await main();

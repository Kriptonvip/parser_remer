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
// Найдите элемент <img> и получите значение атрибута "src"
const imgVariant = 'https://remer.shop' + $('#thumb-photo-0 img').attr('data-src');
const imgProductVariant = 'https://remer.shop' + $('#big-photo-0 a').attr('href');
// Вывести URL изображения в консоль
  const productName = $('h1').text()
  const artikulName = $('.js-replace-article:first').text().trim();
  if(prodNames.has(productName) && prodNames.has(artikulName)) {
    console.log(productName + ' ALREADY has in productName Set')
    return products;
  } else {
    prodNames.add(productName) //если нет то добавляем.
    prodNames.add(artikulName) //если нет то добавляем.
  }


  const descriptionText = $('#desc').find('.content').text().trim();
  const images = [];
  const otherImages = [];
  const brandName = $('ul.breadcrumbs li:nth-last-child(2) a').text().trim();
  const urlName = rus_to_latin(productName)
  // const isVariant = prodUrls.includes(urlProd);//определяем тип строки для продукта.

// Найти элемент с классом "price__new-val" и получить текст из него
const priceText = $('.price__new-val:first').text();

// Очистить текст от нерелевантных символов и преобразовать в число
const price = parseFloat(priceText.replace(/\s+/g, '').replace('₽', '').replace(',', '.'));



// Найти вкладку "Характеристики" по её ID "char"
const characteristicsTab = $('#char');
const characteristics = {};
// Найти все строки характеристик
const characteristicRows = characteristicsTab.find('.char');
const characteristicsBlock = $('.properties');

if (characteristicsTab.length < 1) {
  const characteristicElements = characteristicsBlock.find('.properties__item');

  // Перебрать каждый элемент характеристики и извлечь название и значение
  characteristicElements.each((index, element) => {
    const name = $(element).find('.properties__title').text().trim();
    const value = $(element).find('.properties__value').text().trim();
    characteristics[name] = value;
  });
} else {
  // Создать объект для хранения характеристик
  
  // Перебрать каждую строку характеристики и извлечь название и значение
  characteristicRows.each((index, element) => {
    const name = $(element).find('.char_name span').text().trim();
    const value = $(element).find('.char_value span').text().trim();
    characteristics[name] = value;
  });
// Вывести характеристики в консоль
//console.log(characteristics);
}

const brand = 'REMER';

const imageElements = $('.gallery-slider-thumb__container img');

// Массив для хранения URL-адресов изображений
const imageUrls = [];

// Перебрать каждый элемент с картинкой и получить URL-адрес из атрибута "data-src" или "src"
// console.log(imageElements);
imageElements.each((index, element) => {
  const imageUrl = $(element).attr('data-src') || $(element).attr('src');
  if (imageUrl) {
    imageUrls.push(`https://remer.shop${imageUrl}`);
  }
});
//console.log('imageUrls',imageUrls)
// Создать директорию для сохранения изображений (если её нет)
const pdfLink = $('#docs .doc-list-inner__name').attr('href');
const isPdfExist = pdfLink !== undefined;
let imagePath = '';
const pdfPath = isPdfExist ? '<a href="https://santehnika-salon.ru/instructions/' + await getPDFFileName(pdfLink) + '">Инструкция</a>' : '';

//console.log(pdfPath);
if(isPdfExist) {
 
  console.log("вывод переменной pdfLink", pdfLink);
  const urlpdf = 'https://remer.shop' + pdfLink
imagePath += await downloadAndConvertPDFToImages(urlpdf, downloadDirectory);
await uploadFileToFTP('./temp_images/' + await getPDFFileName(pdfLink));

const imgPathOnFtp = await uploadFileToFTP('./temp_images/' + imagePath)

console.log('uploadFileToFTP',  imgPathOnFtp);
}
const imagePdfUrl = 'https://santehnika-salon.ru/wa-data/public/site/upload/images/' + imagePath;
//console.log('imagePdfUrl', imagePdfUrl);


try {
  await fs.access(downloadDirectory);
} catch (error) {
  if (error.code === 'ENOENT') {
    // Если директория не существует, создайте её
    try {
      await fs.mkdir(downloadDirectory);
      console.log(`Директория ${downloadDirectory} успешно создана.`);
    } catch (mkdirError) {
      console.error(`Ошибка при создании директории ${downloadDirectory}:`, mkdirError);
    }
  } else {
    console.error(`Ошибка при проверке существования директории ${downloadDirectory}:`, error);
  }
}
const colorElement = $('.sku-props__js-size');
const color = colorElement.text().trim();



// //Функция для собирания адресов всех артикулов.
// const colorVariantLinks = [];
// const colorVariantElements = $('[itemprop="offers"] [itemprop="url"]');
// if (colorVariantElements.length === 0) {
//   colorVariantLinks.push[url]
// }
// colorVariantElements.each((index, element) => {
//   const url = $(element).attr('href');
//   if (url) {
//     colorVariantLinks.push(`https://remer.shop${url}`);
//   }
// });
// await appendLinksToFile(colorVariantLinks, 'colorVariantLinks.txt');
// async function parseColorVariants() {
//   for (const url of colorVariantLinks) {
//     const product = await parseAndSave(url);
//     allProducts.push(product);
//   }
// }

// // const modifiedLinks = colorVariantLinks.map((url) => `${url}?oid=${oid}`);

// Выводим модифицированные URL-адреса
// console.log('colorVariantLinks:', colorVariantLinks);



const prodObj = {
  "Тип строки": prodType, 
  "Наименование": isVariant ? `${productName}-${artikulName}`: productName,
  "Наименование артикула": isVariant ? `${productName}-${artikulName}`: '',
  "Код артикула": isVariant ? `${artikulName}`: '',
  "Валюта": 'RUB',
  "ID артикула": '', // id артикула выдается при загрузке
  "Цена": isVariant || isProductVariant ? price : '',
  "Доступен для заказа": isProduct ? '' : 1,
  "Видимость на витрине": isProduct ? '' : 1,
  "Зачеркнутая цена": isProduct ? '' : 0,
  "Закупочная цена": isProduct ? '' : 0,
  "В наличии": '',
  "ID товара": '',
  "Краткое описание": '',
  "Описание": isVariant ? '' : `"${descriptionText}"`,
  "Наклейка": '',
  "Статус": 1,
  "Выбор вариантов товара": isProductVariant ? 1 : 2,
  "Тип товаров": 'Смеситель для биде',
  "Теги": '',
  "Облагается налогом": '',
  "Заголовок": '',
  "META Keywords": '',
  "META Description": '',
  "Ссылка на витрину": isProductVariant ? urlName + artikulName : urlName,
  "Адрес видео на Rutube, YouTube или Vimeo": '',
  "Вес": 2,
  "Материал": isVariant ? '' : characteristics["Материал"],
  "Длина": '',
  "Ширина": '',
  "Высота": '',
  "Покрытие": '',
  "Цвет": isVariant ? `<{${color}}>` : isProduct ? '<{}>' : color,
  "Коллекция": isVariant ? '' : characteristics["Коллекция"],
  "Вес с упаковкой": 2,
  "Производство": isVariant ? '' : characteristics["Страна производитель"],
  "Комплектация": '',
  "Дизайн": '',
  "Производитель": isVariant ? '' : brand,
  "Тип монтажа":isVariant ? '' : characteristics["Монтаж"],
  "Артикул Производителя": artikulName,
  "Управление": isVariant ? '' : characteristics["Тип смесителя"],
  "Назначение": 'для биде',
  "дополнительные материалы": '',
  "Излив": '',
  "Тип подводки": '',
  "Система экономии расхода воды": '',
  "Аэратор": '',
  "Длина излива": '',
  "Форма излива": '',
  "Механизм": '',
  "Форма": '',
  "Стандарт подводки": '',
  "Система против известковых отложений": '',
  "Ручной душ": '',
  "Высота излива": '',
  "Гарантия": '',
  "Термостат": '',
  "Размер верхнего душа": '',
  "Размер ручного душа": '',
  "Исполнение шланга": '',
  "Исполнение верхнего душа": '',
  "Исполнение ручного душа": '',
  "Верхний душ": '',
  "Количество режимов потока ручного душа": '',
  "Количество режимов потока верхнего душа": '',
  "Система ToccoFreddo": '',
  "Система Telescopico": '',
  "Система Gioco": '',
  "Длина шланга": '',
  "Защита от перекручивания": '',
  "Высота от": '',
  "Высота до": '',
  "Гибкий шланг": '',
  "Внутренняя часть": '',
  "Встраиваемая система": '',
  "Повортный излив": '',
  "Система ConAria": '',
  "Метод крепления": '',
  "Количество уровней": '',
  "Цвет крышки": '',
  "Перелив": '',
  "Система клик-клак": '',
  "Глубина": '',
  "Поверхность стекла": '',
  "Наличие держателя": '',
  "Система MultiControllo": '',
  "Объем": '',
  "Высота упаковки": '',
  "Длина упаковки": '',
  "Ширина упаковки": '',
  "Инструкция": ((isProduct || isProductVariant) && isPdfExist) ? pdfPath : '',
  "Возможность подключения фильтра": '',
  "Монтажное отверстие, мм": '',
  "Выдвижной/гибкий излив": '',
  "Подводка": '',
  "Картридж": '',
  "максимальная толщина столешницы": '',
  "Изображения товаров": isVariant ? imgVariant : isProductVariant ? imgProductVariant : '',
  "Описания изображений товаров": '',
  "Изображения товаров 0": '',
  "Описания изображений товаров 0": '',
  "Изображения товаров 1": '',
  "Описания изображений товаров 1": '',
  "Изображения товаров 2": '',
  "Описания изображений товаров 2": '',
  "Изображения товаров 3": '',
  "Описания изображений товаров 3": '',
  "Изображения товаров 4": '',
  "Описания изображений товаров 4": '',
  "Изображения товаров 5": '',
  "Описания изображений товаров 5": '',
  "Изображения товаров 6": '',
  "Описания изображений товаров 6": '',
}

if (isProduct || isProductVariant) {
  for (let i = 1; i < imageUrls.length; i++) {
    const item = imageUrls[i];
    prodObj[`Изображения товаров ${i}`] = item;
    prodObj[`Описания изображений товаров ${i}`] = '';
  }
  isPdfExist ? (prodObj[`Описания изображений товаров 6`] = '', prodObj[`Изображения товаров 6`] = imagePdfUrl) : '';
}
    products.push(prodObj);
  return products;
}

async function main() {
  const urls = await readUrlsFromFile('./links/smesitel_dlya_bideAll.txt');
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
  const csvFilename = `./result/smesiteli_dlya_bide.csv`;
  const csvContent = `${Object.keys(allProducts[0]).join(';')}\n${allProducts.map(p => Object.values(p).join(';')).join('\n')}`;

  await fs.writeFile(csvFilename, csvContent, 'utf-8');

  console.log(`Data successfully parsed and saved to the file ${csvFilename}`);
}

await main();

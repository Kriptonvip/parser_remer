import fs from 'fs/promises';
import axios from 'axios';
import cheerio from 'cheerio';
import { dataBlades } from './data.js';
import rus_to_latin from './translit.js';

async function readUrlsFromFile(filename) {
  try {
    const data = await fs.readFile(filename, 'utf-8');
    return data.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error reading URLs from file:', error);
    return [];
  }
}
function getModifiedModification(modification) {
  switch (modification) {
    case 'AN':
      return 'Анатомическая (AN)';
    case 'CS':
      return 'Китайское перо (CS)';
    case 'CV':
      return 'Коническая (CV)';
    case 'ST':
      return 'Прямая (ST)';
    case 'FL':
      return 'Расклешенная (FL)';
    case 'JP':
      return 'Японское перо (JP)';
      case 'PEN JP':
        return 'Японское перо (JP)';
    default:
      return modification; // Если нет соответствия, вернуть исходное значение
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
  const productDescription =  $('.product-desc p').html() ? $('.product-desc p').html().replace(/<br>/g, '\n').replace(/(<b>|<\/b>)/g,'').replace(/"/g, ' ') : '';
  const imageElements = $('.images.product li figure.medium');
  const images = [];
  const otherImages = [];
  const brandName = $('ul.breadcrumbs li:nth-last-child(2) a').text().trim();

  imageElements.each((index, element) => {
    const src = `https://www.ttshop.ru/${$(element).attr('data-src')}`;
    if (src.startsWith('https://www.ttshop.ru/https://youtu.be/')) {
      return; // Исключаем ссылки на YouTube
    }
    if (index === 0) {
      images.push(src);
    } else {
      otherImages.push(src);
    }
  });

  const productImages = images.join(', ');
  const additionalImages = otherImages.join(' ');
 

  $('ul.product-options li').each((index, element) => {
    const input = $(element).find('input.product-options');
    const label = $(element).find('label');
    const articul = input.attr('value');
    const price = Number(input.attr('data-price').split(' ')[0]);
    const availability = label.hasClass('product-options-disabled') ? 'Нет в наличии' : 'В наличии';
    const description = label.text().trim().replace(/;/g, ' ').trim();
    const modification = label.text().trim();
    if(dataBlades[articul]) {
      return;
    };
    const isBut = brandName ===  'Butterfly' ? true : false; 
    
    products.push({
      '№': '',
      'Артикул*': `${rus_to_latin(productName)}_${rus_to_latin(modification)}`,
      "Название товара": productName,
      "Цена, руб.*": price,
      "Цена до скидки": price,
      "НДС, %*": "Не облагается",
      "Включить продвижение": "Нет", 
      "Ozon ID": "",
      "Штрихкод (Серийный номер / EAN)":"",
      "Вес в упаковке, г*": '200',
      "Ширина упаковки, мм*": '150',
      "Высота упаковки, мм*": '10',
      "Длина упаковки, мм*": '150',
      'Ссылка на главное фото*': productImages,
      'Ссылки на дополнительные фото': additionalImages,
      'Ссылки на фото 360':'',
      'Артикул фото':'',
      'Категория':brandName,
      'Название модели (для объединения в одну карточку)*': productName,
      'Цвет товара':'',
      'Размер накладки':'',
      'Вид ручки ракетки для настольного тенниса': getModifiedModification(modification),
      'Целевая аудитория*':'"Взрослая;Детская"',
      'Тип*':'Основание ракетки для настольного тенниса',
      'Вид спорта':"Настольный теннис",
      'Rich-контент JSON':'',
      'Количество слоев дерева':'',
      'ТН ВЭД коды ЕАЭС':'',
      'Название серии':'',
      'Аннотация':`"${productDescription}"`,
      Наличие: availability,
      Модификация: modification,
      Склад: 'TTСпорт',
      Cсылка: url,
      articulTTsport: articul,
    });
  });

  return products;
}

async function main() {
  const urls = await readUrlsFromFile('clothes.txt');
  const allProducts = [];
  let count = 0;
  let firstProd = await parseAndSave(urls[0]);
  let firstStr =  Object.keys(firstProd[0]).join(';')
  console.log(firstStr);
  for (const url of urls) {
    const products = await parseAndSave(url);
    count++;
    console.log(`Product ${count} parse done!`)
    allProducts.push(...products);
  }

  const csvFilename = `products_combined_ClothesOzon.csv`;
  const csvContent = `${firstStr}\n${allProducts.map(p => Object.values(p).join(';')).join('\n')}`;

  await fs.writeFile(csvFilename, csvContent, 'utf-8');

  console.log(`Data successfully parsed and saved to the file ${csvFilename}`);
}

await main();

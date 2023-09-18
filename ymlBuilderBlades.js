import fs from 'fs/promises';
import builder from 'xmlbuilder';
import csvParser from 'csv-parser'; // Use csv-parser package
import fsSync from 'fs';
import { btObj, directPrice, butBlades, dataBlades} from './data.js';

// Чтение CSV-файла
const csvData = await fs.readFile('products_combined_blades.csv', 'utf-8');

// Преобразование CSV в объекты
const records = [];
await new Promise((resolve, reject) => {
  fsSync.createReadStream('products_combined_blades.csv')
    .pipe(csvParser({ separator: ';' })) // Use csv-parser with separator option
    .on('data', (row) => {
      records.push(row);
    })
    .on('end', resolve)
    .on('error', reject);
});

// Создание XML
const xml = builder.create('yml_catalog');
const shop = xml.ele('shop');
const offers = shop.ele('offers');


records.forEach(record => {
  const isButBlade = butBlades.hasOwnProperty(record['articulTTsport']);
  const isBlade = dataBlades.hasOwnProperty(record['articulTTsport']);
  const isButRubber = btObj.hasOwnProperty(record['articulTTsport']);
  const isDirectPrice = directPrice.hasOwnProperty(record['articulTTsport']);
  const price = Math.floor(record['price'] * 0.75/0.725 + 324/0.725)

  //const correctPrice =  isButRubber ? record['price'] * btObj[record['articulTTsport']][1]: price;
  
  const correctPrice = (ttSportArt) => {
	  if (isButRubber) return record['price'] * btObj[record['articulTTsport']][1];
  	  if (isButBlade) return  Math.floor((record['price'] * 0.8 + 290) / 0.725);
  	  if (isBlade) return  Math.floor((record['price'] * 0.75 + 290) / 0.725);
	  if (isDirectPrice) {
		  return directPrice[record['articulTTsport']][1];
	  }
	  return price;
  };
  
  const offer = offers.ele('offer', { id: record['offer id'] });
  offer.ele('price', {}, correctPrice());
  offer.ele('oldprice', {}, correctPrice());
  offer.ele('min_price', {}, correctPrice());
  const outlets = offer.ele('outlets');
  
  const instockValue = record['Наличие'] === 'В наличии' ? '10' : '0';
  const warehouseNameValue = record['Склад'];
  
  outlets.ele('outlet', {
    instock: instockValue,
    warehouse_name: warehouseNameValue
  });
});
const xmlString = xml.end({ pretty: true });

// Запись в XML-файл
await fs.writeFile('outputAllBlades.xml', xmlString, 'utf-8');
console.log('XML successfully generated.');
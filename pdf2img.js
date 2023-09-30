import fs from 'fs/promises';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import path from 'path';

async function getPDFFileName(pdfUrl) {
  // Извлекаем имя PDF-файла из URL
  const urlParts = pdfUrl.split('/');
  return urlParts[urlParts.length - 1];
}

async function downloadAndConvertPDFToImages(pdfUrl) {
  try {
    // Создаем временный каталог для изображений
    const tempDir = './temp_images'; // Замените на ваш путь
    await fs.mkdir(tempDir, { recursive: true });

    // Скачиваем PDF по заданной ссылке
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    const pdfBuffer = await response.buffer();

    // Определяем имя PDF-файла из URL
    const pdfFileName = await getPDFFileName(pdfUrl);

    // Определяем путь к временному PDF-файлу
    const pdfFilePath = `${tempDir}/${pdfFileName}`;

    // Сохраняем PDF во временный файл
    await fs.writeFile(pdfFilePath, pdfBuffer);

    // Команда для конвертации PDF в изображения
    const pdfNameWithoutExtension = path.basename(pdfFileName, path.extname(pdfFileName));
    const convertCommand = `pdftoppm -jpeg ${pdfFilePath} ${tempDir}/${pdfNameWithoutExtension}`;

    // Выполняем команду
    await new Promise((resolve, reject) => {
      exec(convertCommand, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          reject(new Error(stderr));
          return;
        }
        resolve();
      });
    });

    // Получаем список изображений
    const imageFiles = await fs.readdir(tempDir);
    const imagePaths = imageFiles.map((file) => `${tempDir}/${file}`);

    console.log('Изображения сохранены в:', imagePaths);

    // Опционально, можно удалить временный каталог после использования
    // await fs.rmdir(tempDir, { recursive: true });

    return imagePaths;
  } catch (error) {
    console.error('Произошла ошибка:', error);
  }
}

export default downloadAndConvertPDFToImages;

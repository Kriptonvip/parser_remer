import axios from 'axios';
import fs from 'fs';
import decompress from 'decompress';
import ftp from 'basic-ftp';
import path from 'path';
import rusToLatin from './translit.js';



async function uploadFileToFTP(localFilePath) {
const remoteDir = localFilePath.endsWith('pdf') ? '/santehnika-salon.ru/htdocs/www/instructions/': '/santehnika-salon.ru/htdocs/www/wa-data/public/site/upload/images/'
const ftpHost = 'ftp79.hostland.ru';
const ftpUser = 'host1846652';
const ftpPass = 'wqmhFXnRVN';
try{
    const client = new ftp.Client();
    await client.access({
      host: ftpHost,
      user: ftpUser,
      password: ftpPass,
      secure: false,
    });

    await client.ensureDir(remoteDir);
    const remoteFileName = path.basename(localFilePath);
    const remoteFilePath = path.join(remoteDir, remoteFileName);

    await client.uploadFrom(localFilePath, remoteFilePath);
    client.close();

    return `https://${ftpHost}${remoteFilePath}`;
  } catch (error) {
    console.error('Error uploading file to FTP:', error);
    throw error;
  }
}

export default uploadFileToFTP;

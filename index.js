import puppeteer from "puppeteer-extra";
import { DEFAULT_INTERCEPT_RESOLUTION_PRIORITY } from "puppeteer";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import logger from "./logger.js";
import fs from 'fs';
import path from 'path';

const backupDir = './backup';
const backupTo = { "PDF": true, "HTML": true };

const username = "your_username";
const maxPage = 1;

const articles = [];

puppeteer.use(
  AdblockerPlugin({
    interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY
  })
);

async function main() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
    logger.info("Backup directory created.");
  } else {
    logger.info("Backup directory already exists.");
  }
  if (backupTo.PDF) {
    const pdfBackupDir = path.join(backupDir, 'pdf');
    if (!fs.existsSync(pdfBackupDir)) {
      fs.mkdirSync(pdfBackupDir);
      logger.info("PDF backup directory created.");
    } else {
      logger.info("PDF backup directory already exists.");
    }
  }
  if (backupTo.HTML) {
    const htmlBackupDir = path.join(backupDir, 'html');
    if (!fs.existsSync(htmlBackupDir)) {
      fs.mkdirSync(htmlBackupDir);
      logger.info("HTML backup directory created.");
    } else {
      logger.info("HTML backup directory already exists.");
    }
  }

  logger.info("Start browser...");
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--window-position=1620,0']
  });
  logger.success("Browser opened.");

  const page = await browser.newPage();

  logger.info("Starting get page...");

  for (let i = 1; i <= maxPage; i++) {
    await page.goto(`https://${username}.pixnet.net/blog/${i}`, { waitUntil: 'load', timeout: 0 });
    logger.success(`https://${username}.pixnet.net/blog/${i}`);

    const articleUrls = await page.evaluate(() => {  // Execute in browser /////
      const urls = [];
      document.querySelectorAll(".more > a").forEach((item, index) => {
        urls[index] = item.href;
      });
      return urls;
    }); // End execute in browser //////////////////////////////////////////////

    logger.info(`Find ${articleUrls.length} articles:`);
    articleUrls.forEach((url, index) => {
      logger.info(`${(index + 1).toString().padStart(2, ' ')}: ${url}`);
    });

    articles.push(...articleUrls);
  }

  logger.info("End find articles.");
  logger.info("Start get articles...");

  for (let i = 0; i < articles.length; i++) {
    await page.goto(articles[i], { waitUntil: 'load', timeout: 0 });
    logger.success(`Opened ${articles[i]}`);
    logger.info(`Title: ${(await page.title()).split("－")[0]}`);
    const title = (await page.title()).split("－")[0].replace(/[\\/:*?"<>|]/g, "");

    logger.info(`Get content...`);
    const content = await page.evaluate(() => {  // Execute in browser /////////
      function getOuterHTMLWithComputedStyles(selector) {
        const element = document.querySelector(selector);

        if (!element) {
          console.error(`找不到符合選擇器 "${selector}" 的元素。`);
          return null;
        }

        const computedStyle = window.getComputedStyle(element);
        let styleString = "";
        for (let i = 0; i < computedStyle.length; i++) {
          const property = computedStyle[i];
          styleString += `${property}: ${computedStyle.getPropertyValue(property)}; `;
        }

        const clonedElement = element.cloneNode(true);
        clonedElement.setAttribute("style", styleString);

        return clonedElement.outerHTML;
      }

      function PrintElem(elem) {
        let data = "";

        data += '<html><head><title>' + document.title + '</title>'
        data += '</head><body >';
        data += '<h1>' + document.title + '</h1>';


        for (item of elem) {
          data += getOuterHTMLWithComputedStyles(item);
        }

        data += '</body></html>';

        return data
      }

      elem = ["#article-box > div > ul", "#article-content-inner"]
      return PrintElem(elem)

    });  // End execute in browser /////////////////////////////////////////////

    if (backupTo.HTML) {
      const htmlFilePath = path.join(backupDir, 'html',
        `${(i + 1).toString().padStart(3, '0')}. ${title}.html`);
      fs.writeFileSync(htmlFilePath, content);
      logger.success(`HTML saved for ${articles[i]}`);
    }

    if (backupTo.PDF) {
      const newPage = await browser.newPage();
      await newPage.setContent(content, { waitUntil: 'networkidle0' });
      logger.success(`Content loaded in new page for ${title}`);
      await newPage.pdf({
        path: path.join(backupDir, 'pdf',
          `${(i + 1).toString().padStart(3, '0')}. ${title}.pdf`)
      });

      logger.success(`PDF saved for ${title}`);

      await newPage.close();
    }
  }

  logger.success("End get articles.");
  logger.info("Close browser...");
  await browser.close();
  logger.success("Browser closed.");

  logger.success("All done.");
}

main();
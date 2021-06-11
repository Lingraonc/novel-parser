import cherio from "cherio";
import chalk from "chalk";
import { slugify } from "transliteration";

import { arrayFromLength } from "./helpers/common";
import { PuppeteerHandler } from "./helpers/puppeteer";
import queue from "async/queue";
import { mergeNovelsUrls, saveNovelList } from "./handlers/fileManager";

export const baseUrl = "https://novelfull.com";
const concurrency = 5;
const startTime = new Date();

export const p = new PuppeteerHandler();
export const taskQueue = queue(async (task, completed) => {
  try {
    await task();
    console.log(
      chalk.bold.magenta(
        "Task completed, tasks left: " + taskQueue.length() + "\n"
      )
    );
    completed();
  } catch (err) {
    throw err;
  }
}, concurrency);

taskQueue.drain(function () {
  const endTime = new Date();
  console.log(
    chalk.green.bold(
      `🎉  All items completed [${(endTime - startTime) / 1000}s]\n`
    )
  );
  mergeNovelsUrls();
  p.closeBrowser();
  process.exit();
});

const getGenresLinks = async (url) => {
  try {
    const pageContent = await p.getPageContent(url);
    const $ = cherio.load(pageContent);
    const genresItems = [];
    $(".dropdown-menu.multi-column li a").each((i, header) => {
      const url = $(header).attr("href");
      const title = $(header).text();
      genresItems.push({
        title,
        url: baseUrl + url,
        code: slugify(title),
      });
    });
    return genresItems;
  } catch (err) {
    console.log(chalk.red("An error has occured \n"));
    console.log(err);
  }
};

(async function main() {
  mergeNovelsUrls();
})();

const getGenresPages = async (url) => {
  try {
    const pageContent = await p.getPageContent(url);
    const $ = cherio.load(pageContent);
    let lastPageNumber = 1;
    $(".pagination .last a").each((i, header) => {
      const link = new URL(baseUrl + $(header).attr("href"));
      lastPageNumber = parseInt(link.searchParams.get("page"));
    });
    return lastPageNumber;
  } catch (err) {
    return 1;
  }
};

const getGenres = async (url) => {
  const genrePages = await getGenresPages(url);
  await arrayFromLength(genrePages).forEach(async (i) => {
    try {
      await getNovels(`${url}?page=${i}`);
      console.log(
        chalk.green.bold(`Completed getting data from page ${i} in url ${url}:`)
      );
    } catch (e) {
      console.log(err);
      throw new Error(`🚫 Error getting data from page ${i} in url ${url}:`);
    }
  });
};

const getNovels = async (url) => {
  try {
    const pageContent = await p.getPageContent(url);
    const $ = cherio.load(pageContent);
    const novelsItems = [];

    $(".truyen-title a").each((i, header) => {
      const url = $(header).attr("href");
      const title = $(header).text();

      novelsItems.push({
        title,
        url: baseUrl + url,
        code: slugify(title),
      });
    });
    await saveNovelList(novelsItems);
  } catch (err) {
    console.log(chalk.red("An error has occured \n"));
    console.log(err);
  }
};

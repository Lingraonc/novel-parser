import cherio from "cherio";
import chalk from "chalk";
import slugify from "slugify";

import { arrayFromLength } from "./helpers/common";
import { PuppeteerHandler } from "./helpers/puppeteer";
import queue from "async/queue";
import { mergeNovelsUrls, saveNovelList } from "./handlers/fileManager";
import { getNovels } from "./getNovels";

export const baseUrl = "https://novelfull.com";
const concurrency = 2;
const startTime = new Date();

export const p = new PuppeteerHandler();
const taskQueue = queue(async (task, done) => {
  try {
    await task();
    console.log(
      chalk.bold.magenta(
        "Get novel url task completed, tasks left: " + taskQueue.length() + "\n"
      )
    );
    done();
  } catch (err) {
    throw err;
  }
}, concurrency);

taskQueue.drain(async () => {
  const endTime = new Date();
  console.log(
    chalk.green.bold(
      `🎉  All novels urls downloaded [${(endTime - startTime) / 1000}s]\n`
    )
  );
  await setTimeout(async () => {
    await mergeNovelsUrls();
  }, 10000);
  await setTimeout(async () => {
    await getNovels();
  }, 20000);
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
  const genres = await getGenresLinks(baseUrl);
  await arrayFromLength(genres.length).forEach((i) => {
    taskQueue.push(
      () => getGenres(genres[i - 1].url),
      (err) => {
        if (err) {
          console.log(err);
          throw new Error(
            "🚫 Error getting data from genre:" + genres[i - 1].title
          );
        }
        console.log(
          chalk.green.bold(
            `Completed getting data from genre ${genres[i - 1].title}`
          )
        );
      }
    );
  });
})();

const getGenresPages = async (url) => {
  try {
    const pageContent = await p.getPageContent(url);
    return getLastPage(pageContent);
  } catch (err) {
    throw new Error(err);
  }
};

export const getLastPage = (pageContent) => {
  try {
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
      await getNovelsUrlsData(`${url}?page=${i}`);
      console.log(
        chalk.green.bold(`Completed getting data from page ${i} in url ${url}:`)
      );
    } catch (e) {
      console.log(err);
      throw new Error(`🚫 Error getting data from page ${i} in url ${url}:`);
    }
  });
};

const getNovelsUrlsData = async (url) => {
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

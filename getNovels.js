import cherio from "cherio";
import chalk from "chalk";
import { slugify } from "transliteration";

import { arrayFromLength } from "./helpers/common";
import { PuppeteerHandler } from "./helpers/puppeteer";
import queue from "async/queue";
import {
  getNovelsUrlsList,
  mergeNovelsUrls,
  saveNovelChapter,
  saveNovelData,
  saveNovelList,
} from "./handlers/fileManager";
import { getLastPage } from "./getNovelsUrls";

export const baseUrl = "https://novelfull.com";
const concurrency = 5;
const startTime = new Date();

export const p = new PuppeteerHandler();
const taskQueue = queue(async (task, done) => {
  try {
    await task();
    console.log(
      chalk.bold.magenta(
        "Get novel task completed, tasks left: " + taskQueue.length() + "\n"
      )
    );
    done();
  } catch (err) {
    throw err;
  }
}, concurrency);

taskQueue.drain(() => {
  const endTime = new Date();
  console.log(
    chalk.green.bold(
      `🎉  All novels successful loaded [${(endTime - startTime) / 1000}s]\n`
    )
  );
  p.closeBrowser();
  process.exit();
});

export const getNovels = async () => {
  const novelsUrls = await getNovelsUrlsList();
  console.log(novelsUrls);
  arrayFromLength(novelsUrls.length).forEach((i) => {
    taskQueue.push(
      () => getNovelsData(novelsUrls[i - 1].url),
      (err) => {
        if (err) {
          console.log(err);
          throw new Error(
            "🚫 Error getting data from novel:" + novelsUrls[i - 1].title
          );
        }
        console.log(
          chalk.green.bold(
            `Completed getting data from novel ${novelsUrls[i - 1].title}`
          )
        );
      }
    );
  });
};

const getNovelsData = async (url) => {
  try {
    const pageContent = await p.getPageContent(url);
    const $ = cherio.load(pageContent);
    const novelsItems = { title: "", slug: "", genres: [], chapters: [] };
    let maxChapterPage = getLastPage(pageContent);
    let firstChapterUrl = "";

    $(".col-info-desc h3.title").each((i, header) => {
      const title = $(header).text();
      novelsItems.title = title;
      novelsItems.slug = slugify(title);
    });

    $(".col-info-desc .info div:nth-child(3) a").each((i, header) => {
      const title = $(header).text();
      novelsItems.genres.push(title);
    });
    $(
      "#list-chapter .row .col-xs-12:first-child .list-chapter:first-child li:first-child a"
    ).each((i, header) => {
      firstChapterUrl = baseUrl + $(header).attr("href");
    });
    novelsItems.chapters = await getChaptersUrls(firstChapterUrl);
    await saveNovelData(novelsItems);
    for await (const chapterData of novelsItems.chapters) {
      await getChapter(novelsItems.slug, chapterData);
    }
  } catch (err) {
    console.log(chalk.red("An error has occured \n"));
    console.log(err);
  }
};

const getChaptersUrls = async (url) => {
  try {
    const pageContent = await p.getChaptersUrls(url);
    const $ = cherio.load(pageContent);
    const chapters = [];
    $(".form-control.chapter_jump option").each((i, header) => {
      const url = $(header).val();
      const title = $(header).text();
      chapters.push({
        url: baseUrl + url,
        title,
        slug: slugify(title),
      });
    });
    return chapters;
  } catch (err) {
    console.log(chalk.red("An error has occured \n"));
    console.log(err);
  }
};

const getChapter = async (novelSlug, { url, title, slug }) => {
  try {
    const pageContent = await p.getPageContent(url);
    const $ = cherio.load(pageContent);
    const chapterData = { title, content: "", slug };

    $("#chapter-content p").each((i, header) => {
      chapterData.content += $.html(header);
    });
    await saveNovelChapter(novelSlug, chapterData);
  } catch (err) {
    console.log(chalk.red("An error has occured \n"));
    console.log(err);
  }
};

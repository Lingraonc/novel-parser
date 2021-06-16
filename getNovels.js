import cherio from "cherio";
import chalk from "chalk";
import slugify from "slugify";

import { arrayFromLength } from "./helpers/common";
import { PuppeteerHandler } from "./helpers/puppeteer";
import queue from "async/queue";
import { getNovelsUrlsList, saveNovelData } from "./handlers/fileManager";

export const baseUrl = "https://novelfull.com";
const concurrency = 8;
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
    const novelsItems = {
      title: "",
      slug: "",
      coverImg: "",
      description: "",
      genres: [],
      chaptersUrls: [],
      chapters: [],
      chaptersSlugs: [],
    };

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

    $(".books .book img").each((i, header) => {
      novelsItems.coverImg = baseUrl + $(header).attr("src");
    });

    $(".desc-text p").each((i, header) => {
      novelsItems.description += $.html(header);
    });

    $(
      "#list-chapter .row .col-xs-12:first-child .list-chapter:first-child li:first-child a"
    ).each((i, header) => {
      firstChapterUrl = baseUrl + $(header).attr("href");
    });
    novelsItems.chaptersUrls = await getChaptersUrls(firstChapterUrl);
    for await (const chapterData of novelsItems.chaptersUrls) {
      const chapterContent = await getChapter(novelsItems.slug, chapterData);
      novelsItems.chapters.push(chapterContent);
      novelsItems.chaptersSlugs.push({
        slug: chapterData.slug,
        order: novelsItems.chaptersSlugs.length,
      });
    }
    await saveNovelData(novelsItems);
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
    $(".chapter-nav")
      .first()
      .find(".form-control.chapter_jump option")
      .each((i, header) => {
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
    return chapterData;
  } catch (err) {
    console.log(chalk.red("An error has occured \n"));
    console.log(err);
  }
};

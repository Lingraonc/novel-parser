import path from "path";
import { promises as fs } from "fs";
import chalk from "chalk";
import { removeDuplicatesUrls } from "../helpers/common";

export async function saveNovel(data) {
  const { code } = data;
  const fileName = `${code}.json`;
  const savePath = path.join(__dirname, "..", "data", fileName);

  return new Promise((resolve, reject) => {
    fs.writeFile(savePath, JSON.stringify(data, null, 4), (err) => {
      if (err) {
        return reject(err);
      }

      console.log(
        chalk.blue("File was saved successfully: ") +
          chalk.blue.bold(fileName) +
          "\n"
      );

      resolve();
    });
  });
}

export async function saveNovelList(dataToSave) {
  const fileName = dataToSave[0].code + Date.now().toString() + ".json";
  const savePath = path.join(__dirname, "..", "novelsPages", fileName);

  return new Promise(async (resolve, reject) => {
    try {
      await fs.writeFile(savePath, JSON.stringify(dataToSave, null, 2));
      console.log(
        chalk.blue("File was saved successfully: ") +
          chalk.blue.bold(dataToSave[0].title) +
          "\n"
      );
      resolve();
    } catch (err) {
      return reject(err);
    }
  });
}

export const mergeNovelsUrls = async () => {
  try {
    const folderPath = path.join(__dirname, "..", "novelsPages");
    let folderFiles = await getNovelsFilesList();
    while (folderFiles.length > 1) {
      folderFiles = await fs.readdir(folderPath);
      if (folderFiles.length > 1) {
        const firstFilePath = `${folderPath}/${folderFiles[0]}`;
        const secondFilePath = `${folderPath}/${folderFiles[1]}`;
        const firstFile = JSON.parse(await fs.readFile(firstFilePath, "utf8"));
        const secondFile = JSON.parse(
          await fs.readFile(secondFilePath, "utf-8")
        );
        const newFileData = firstFile.concat(secondFile);
        await fs.unlink(secondFilePath);
        await fs.writeFile(
          firstFilePath,
          JSON.stringify(removeDuplicatesUrls(newFileData), null, 2)
        );
      }
    }
    console.log(chalk.green.bold(`🎉  Novels urls merged successful`));
  } catch (err) {
    throw new Error(err);
  }
};

const getNovelsFilesList = async () => {
  try {
    const folderPath = path.join(__dirname, "..", "novelsPages");
    return await fs.readdir(folderPath);
  } catch (err) {
    throw new Error(err);
  }
};

export const getNovelsUrlsList = async () => {
  try {
    const novelsUrlsFiles = await getNovelsFilesList();
    const filePath = path.join(
      __dirname,
      "..",
      "novelsPages",
      novelsUrlsFiles[0]
    );
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (err) {
    throw new Error(err);
  }
};

export const saveNovelData = async (novelData) => {
  const folderPath = path.join(__dirname, "..", "data", novelData.slug);
  try {
    (await fs.stat(folderPath)).isDirectory();
  } catch (e) {
    await fs.mkdir(folderPath);
  }
  try {
    await fs.writeFile(
      `${folderPath}/novelData.json`,
      JSON.stringify(novelData, null, 2)
    );
    await fs.mkdir(`${folderPath}/chapters`);
    console.log(chalk.blue(`Data saved for novel ${novelData.title}`));
  } catch (err) {
    throw new Error(err);
  }
};

export const saveNovelChapter = async (novelSlug, chapterData) => {
  const chapterPath = path.join(__dirname, "..", "data", novelSlug, "chapters");
  try {
    (await fs.stat(chapterPath)).isDirectory();
  } catch (e) {
    await fs.mkdir(chapterPath);
  }
  try {
    await fs.writeFile(
      `${chapterPath}/${chapterData.slug}.json`,
      JSON.stringify(chapterData, null, 2)
    );
    console.log(
      chalk.blue(`Chapter ${chapterData.slug} saved for novel ${novelSlug}`)
    );
  } catch (err) {
    throw new Error(err);
  }
};

export const getNovelsCount = async () => {
  const novelsPath = path.join(__dirname, "..", "data");
  return (await fs.readdir(novelsPath)).length;
};

export const loadNovelsData = async (novelIndex) => {
  const novelsPath = path.join(__dirname, "..", "data");
  let folderFiles = await fs.readdir(novelsPath);
  if (folderFiles.length > 1) {
    return JSON.parse(
      await fs.readFile(
        `${novelsPath}/${folderFiles[novelIndex]}/novelData.json`,
        "utf8"
      )
    );
  } else {
    throw new Error(chalk.red("Novels folders not found"));
  }
};

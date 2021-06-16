import firebase from "firebase";
import chalk from "chalk";

export const saveNovelContent = async ({
  title,
  genres,
  slug,
  description,
  chaptersSlugs,
  coverImg,
}) => {
  try {
    return await firebase
      .database()
      .ref("novels/" + slug.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, ""))
      .set({
        title,
        genres,
        description,
        coverImg,
        chaptersSlugs,
      });
  } catch (err) {
    throw new Error(err);
  }
};

export const saveChaptersData = async (novelData) => {
  try {
    const { title, slug } = novelData;
    for await (const chapterData of novelData.chapters) {
      await firebase
        .database()
        .ref(
          `chapters/${slug.replace(
            /[&\/\\#,+()$~%.'":*?<>{}]/g,
            ""
          )}/${chapterData.slug.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, "")}`
        )
        .set({
          title: chapterData.title,
          content: chapterData.content,
        });
      console.log(
        chalk.green(
          `Chapter ${chapterData.title} from novel ${title} successful saved!`
        )
      );
    }
  } catch (err) {
    throw new Error(err);
  }
};

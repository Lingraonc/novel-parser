export const arrayFromLength = (number) => {
  return Array.from(new Array(number).keys()).map((k) => k + 1);
};

export const removeDuplicatesUrls = (arrayWithDuplicates) => {
  return arrayWithDuplicates.filter(
    (thing, index, self) =>
      index === self.findIndex((t) => t.title === thing.title)
  );
};

export function normalizeModelName(array) {
  let listModels = [];
  array.forEach((name) => {
    name = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    if (!listModels.includes(name)) {
      listModels.push(name);
    }
  });

  return listModels;
}

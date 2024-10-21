import { query } from ".";


export const queries = [
  ""
  , " "
  , "   "
  , "conxtime"
  , "bunawait"
  , "awaitBun"
  , "awaitbun"
  , "awaitbUn"
  , "awaitBUn"
  , "result"
  , "result=[["
  , "cnostla"
  , "contxxxælå"
  , "Mathmin()"
  , "cimkeymapset"
  , "vimkeymapset"
  , "refactiriong"
  , "refactoring"
  , ":refactoring"
  , ":refactoringinginging"
  , ";;"
  , "æøå"
  , query
];

export const files = [
  "data/test.txt"
  , "data/test2.txt"
  , "data/test3.txt"
]

export const getLines = async (file: string): Promise<string[]> => {
  return await Bun.file(file)
    .text()
    .then((x) => x.split("\n"));
};

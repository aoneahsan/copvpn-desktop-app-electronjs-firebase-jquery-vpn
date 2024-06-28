import { writeFileSync } from 'fs-extra';
import { logFile } from 'src/constants';
import { lookup } from 'ps-node';

export const log = (message: string, alsoWiteToConsole = false) => {
  if (alsoWiteToConsole) {
    console.log(message);
  }
  writeFileSync(logFile, message + '\n\r');
};

export const getPidByName = (name: string) => {
  var foundPid = 0;
  lookup(
    {
      command: name,
    },
    function (err, resultList) {
      if (err) {
        throw new Error(err.message);
      }
      if (resultList) {
        if (resultList[0]) foundPid = resultList[0].pid;
      }
    }
  );
  return foundPid;
};

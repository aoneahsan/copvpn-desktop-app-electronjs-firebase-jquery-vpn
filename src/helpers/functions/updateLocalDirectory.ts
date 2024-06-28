import { log } from '..';

export const updateLocalDirectory = () => {
  console.log('Call: updateLocalDirectory()');
  log('platform: ' + process.platform, true);

  useSocket();
  checkCLI();
};

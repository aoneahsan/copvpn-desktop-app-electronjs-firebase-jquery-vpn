import { statSync, unlinkSync } from 'fs-extra';
import { socketFile } from 'src/constants';
import { createServer } from './createServer';

export const useSocket = () => {
  try {
    statSync(socketFile, { throwIfNoEntry: true });

    unlinkSync(socketFile);

    return createServer(socketFile);
  } catch (error) {
    return createServer(socketFile);
  }
};

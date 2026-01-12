import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';

const globalForMastra = globalThis as unknown as { mastra: Mastra | undefined };

export const mastra =
  globalForMastra.mastra ??
  new Mastra({
    logger: new PinoLogger({ name: 'GTD', level: 'info' }),
  });

globalForMastra.mastra = mastra;

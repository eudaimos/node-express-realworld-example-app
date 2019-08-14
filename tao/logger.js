const TAO = require('@tao.js/core').default;

let logOn = true;
const logger = console;
TAO.addInterceptHandler({}, (tao, data) => {
  if (logOn) {
    logger.groupCollapsed(`☯{${tao.t}, ${tao.a}, ${tao.o}}:`);
    logger.info(`${tao.t}:\n`, data[tao.t]);
    logger.info(`${tao.a}:\n`, data[tao.a]);
    logger.info(`${tao.o}:\n`, data[tao.o]);
    logger.groupEnd();
  }
});

TAO.addInlineHandler({ t: 'app', a: 'update' }, (tao, data) => {
  const { update } = data;
  if (update.logOn != null) {
    logOn = update.logOn;
  }
});

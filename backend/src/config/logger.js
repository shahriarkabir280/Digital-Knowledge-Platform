const format = (level, message, meta) => {
  const base = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  return JSON.stringify(base);
};

const logger = {
  info(message, meta = {}) {
    console.log(format("info", message, meta));
  },
  error(message, meta = {}) {
    console.error(format("error", message, meta));
  },
};

module.exports = logger;

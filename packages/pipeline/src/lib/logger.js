const log = (stage, msg, data = {}) => {
  console.log(JSON.stringify({ ts: new Date().toISOString(), stage, msg, ...data }));
};
module.exports = { log };

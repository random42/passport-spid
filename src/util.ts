export const array = (x) => (Array.isArray(x) ? x : [x]);
export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

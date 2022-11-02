export const isISODateTimeUTC = (s: string): boolean => {
  const regex = /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(\.\d+)?Z$/;
  return regex.test(s) && !isNaN(Date.parse(s));
};

const getRandomOTP = (n) => String(Math.floor(Math.random() * (10 ** n))).padStart(n, '0');
export { getRandomOTP };
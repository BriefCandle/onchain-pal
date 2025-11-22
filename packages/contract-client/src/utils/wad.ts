export function fromWad(value: number | bigint, decimals = 18) {
  return Number(value.toString()) / 10 ** decimals;
}

export function fromWadPrecision(value: number | bigint, decimals = 18) {
  // count the number of decimal places and put a dot on the right place
  // if the number is smaller than 18, put in zeroes
  const str = value.toString();
  const decimalIndex = str.length - decimals;
  if (decimalIndex <= 0) {
    return `0.${"0".repeat(-decimalIndex)}${str}`;
  } else {
    return `${str.slice(0, decimalIndex)}.${str.slice(decimalIndex)}`;
  }
}

export function toWadPrecision(value: string, decimals = 18) {
  // remove the dot and put in zeroes until the number is 18 digits long
  const [whole, decimal] = value.split(".");
  return BigInt(whole + (decimal ?? "").padEnd(decimals, "0"));
}

export function toWad(value: number | bigint, decimals = 18) {
  return BigInt(Math.floor(Number(value) * 10 ** decimals));
}

export function truncateWadToDecimals(
  value: bigint,
  decimals: number = 18,
  floats: number = 0
): string {
  const str = value.toString();
  const decimalIndex = str.length - decimals;

  let result: string;
  if (decimalIndex <= 0) {
    result = `0.${"0".repeat(-decimalIndex)}${str}`;
  } else {
    result = `${str.slice(0, decimalIndex)}.${str.slice(decimalIndex)}`;
  }

  // Truncate to the specified number of decimal places
  const dotIndex = result.indexOf(".");
  if (dotIndex !== -1) {
    result = result.slice(0, dotIndex + floats + 1);
  }

  return result;
}

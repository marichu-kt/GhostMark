export type PasswordGeneratorMode = "password" | "passphrase";
export type PasswordQuality = "weak" | "fair" | "good" | "excellent";
export type PassphraseCase = "lower" | "upper" | "title";

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  extendedAscii: boolean;
}

export interface PassphraseGeneratorOptions {
  wordCount: number;
  separator: string;
  wordCase: PassphraseCase;
}

const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%^&*_-+=?";
const EXTENDED_ASCII = "¡¢£¥§©®±µ¿";

const PASSPHRASE_WORDS = [
  "amber",
  "anchor",
  "atlas",
  "brisk",
  "cedar",
  "cipher",
  "coral",
  "delta",
  "ember",
  "fable",
  "falcon",
  "harbor",
  "indigo",
  "juniper",
  "keystone",
  "lantern",
  "marble",
  "matrix",
  "nebula",
  "onyx",
  "orbit",
  "prairie",
  "quartz",
  "raven",
  "signal",
  "silver",
  "summit",
  "tundra",
  "velvet",
  "vector",
  "willow",
  "zenith",
];

export const DEFAULT_PASSWORD_GENERATOR_OPTIONS: PasswordGeneratorOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  extendedAscii: false,
};

export const DEFAULT_PASSPHRASE_GENERATOR_OPTIONS: PassphraseGeneratorOptions = {
  wordCount: 5,
  separator: "-",
  wordCase: "lower",
};

function getRandomIndex(maxExclusive: number): number {
  const bytes = new Uint32Array(1);
  globalThis.crypto.getRandomValues(bytes);
  return bytes[0] % maxExclusive;
}

function pickFrom(characters: string): string {
  return characters[getRandomIndex(characters.length)];
}

function shuffleCharacters(characters: string[]): string[] {
  return characters
    .map((character) => ({ character, sort: getRandomIndex(1_000_000) }))
    .sort((left, right) => left.sort - right.sort)
    .map((item) => item.character);
}

function titleCase(word: string): string {
  return `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`;
}

export function getPasswordCharacterPools(options: PasswordGeneratorOptions): string[] {
  return [
    options.uppercase ? UPPERCASE : "",
    options.lowercase ? LOWERCASE : "",
    options.numbers ? NUMBERS : "",
    options.symbols ? SYMBOLS : "",
    options.extendedAscii ? EXTENDED_ASCII : "",
  ].filter(Boolean);
}

export function generatePassword(options: PasswordGeneratorOptions = DEFAULT_PASSWORD_GENERATOR_OPTIONS): string {
  const pools = getPasswordCharacterPools(options);
  const length = Math.max(12, Math.min(64, Math.round(options.length)));

  if (pools.length === 0) {
    return generatePassword(DEFAULT_PASSWORD_GENERATOR_OPTIONS);
  }

  const requiredCharacters = pools.map((pool) => pickFrom(pool));
  const allCharacters = pools.join("");
  const remainingCharacters = Array.from({ length: Math.max(0, length - requiredCharacters.length) }, () =>
    pickFrom(allCharacters),
  );

  return shuffleCharacters([...requiredCharacters, ...remainingCharacters]).join("");
}

export function generatePassphrase(
  options: PassphraseGeneratorOptions = DEFAULT_PASSPHRASE_GENERATOR_OPTIONS,
): string {
  const wordCount = Math.max(4, Math.min(8, Math.round(options.wordCount)));
  const separator = options.separator || "-";
  const words = Array.from({ length: wordCount }, () => PASSPHRASE_WORDS[getRandomIndex(PASSPHRASE_WORDS.length)]);
  const casedWords = words.map((word) => {
    if (options.wordCase === "upper") {
      return word.toUpperCase();
    }

    if (options.wordCase === "title") {
      return titleCase(word);
    }

    return word.toLowerCase();
  });

  return casedWords.join(separator);
}

export function getPasswordQuality(password: string): PasswordQuality {
  const value = password.trim();
  const lowerValue = value.toLowerCase();

  if (!value || value.length < 12 || /^(.)\1+$/.test(value) || /^(123456789|987654321|qwerty|password)/.test(lowerValue)) {
    return "weak";
  }

  let score = 0;
  score += value.length >= 12 ? 1 : 0;
  score += value.length >= 16 ? 1 : 0;
  score += value.length >= 24 ? 1 : 0;
  score += /[a-z]/.test(value) ? 1 : 0;
  score += /[A-Z]/.test(value) ? 1 : 0;
  score += /\d/.test(value) ? 1 : 0;
  score += /[^A-Za-z0-9]/.test(value) ? 1 : 0;
  score += value.split(/[\s_-]+/).filter((word) => word.length >= 3).length >= 4 ? 1 : 0;

  if (score >= 7) {
    return "excellent";
  }

  if (score >= 5) {
    return "good";
  }

  if (score >= 3) {
    return "fair";
  }

  return "weak";
}

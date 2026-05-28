import { describe, expect, it } from "vitest";
import { dictionaries } from "./i18n";
import { languages } from "./languages";

describe("language registry", () => {
  it("has a dictionary for every registered language", () => {
    for (const language of languages) {
      expect(dictionaries[language.code]).toBeDefined();
    }
  });

  it("marks Arabic, Urdu, and Hebrew as RTL", () => {
    const directions = Object.fromEntries(languages.map((language) => [language.code, language.direction]));

    expect(directions.ar).toBe("rtl");
    expect(directions.ur).toBe("rtl");
    expect(directions.he).toBe("rtl");
  });
});

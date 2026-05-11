type DictionaryData = Record<string, string[]>;

class DictionaryLoader {
  private static instance: DictionaryLoader;
  private dictionary: DictionaryData | null = null;

  private constructor() {}

  public static getInstance(): DictionaryLoader {
    if (!DictionaryLoader.instance) {
      DictionaryLoader.instance = new DictionaryLoader();
    }
    return DictionaryLoader.instance;
  }

  public async load(): Promise<DictionaryData> {
    if (this.dictionary) return this.dictionary;

    try {
      const response = await fetch('/dictionary.json');
      this.dictionary = await response.json();
      return this.dictionary!;
    } catch (error) {
      console.error('Failed to load dictionary:', error);
      return {};
    }
  }

  public getWordsByLength(length: number): string[] {
    if (!this.dictionary) return [];
    return this.dictionary[length.toString()] || [];
  }
}

export const dictionaryLoader = DictionaryLoader.getInstance();

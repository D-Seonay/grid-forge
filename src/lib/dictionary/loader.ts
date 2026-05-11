import fs from 'fs';
import path from 'path';

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

  public async getDictionary(): Promise<DictionaryData> {
    if (this.dictionary) {
      return this.dictionary;
    }

    const filePath = path.join(process.cwd(), 'src', 'data', 'dictionary.json');
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      this.dictionary = JSON.parse(data);
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

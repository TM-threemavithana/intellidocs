import { Injectable, Logger } from '@nestjs/common';
import Tesseract from 'tesseract.js';

@Injectable()
export class TesseractService {
  private readonly logger = new Logger(TesseractService.name);

  async recognize(buffer: Buffer, lang = 'eng') {
    try {
      this.logger.debug(`Starting OCR with lang=${lang}, bytes=${buffer.length}`);
      const worker = Tesseract.createWorker({
        // you can configure logger here if needed
      });
      await worker.load();
      await worker.loadLanguage(lang);
      await worker.initialize(lang);
      const { data } = await worker.recognize(buffer);
      await worker.terminate();
      return {
        text: data.text,
        confidence: data.confidence,
        words: data.words,
        lines: data.lines,
      };
    } catch (err) {
      this.logger.error('Tesseract recognition failed', err as any);
      throw err;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';

@Injectable()
export class TesseractService {
  private readonly logger = new Logger(TesseractService.name);

  async recognize(buffer: Buffer, lang = 'eng') {
    let worker: Tesseract.Worker | undefined;
    try {
      this.logger.debug(`Starting OCR with lang=${lang}, bytes=${buffer.length}`);
      worker = await Tesseract.createWorker(lang);
      const { data } = await worker.recognize(buffer);
      return {
        text: data.text,
        confidence: data.confidence,
        words: data.words,
        lines: data.lines,
      };
    } catch (err) {
      this.logger.error('Tesseract recognition failed', err as any);
      throw err;
    } finally {
      if (worker) {
        await worker.terminate();
      }
    }
  }
}

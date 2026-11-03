import { Controller, Post, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TesseractService } from './tesseract.service';

@Controller('ocr')
export class OcrController {
  constructor(private readonly tesseract: TesseractService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 52428800) } }))
  async upload(@UploadedFile() file: Express.Multer.File, @Body('lang') lang?: string) {
    if (!file) {
      return { error: 'No file uploaded' };
    }
    const language = lang || 'eng';
    const result = await this.tesseract.recognize(file.buffer, language);
    return {
      fileName: file.originalname,
      size: file.size,
      result,
    };
  }
}

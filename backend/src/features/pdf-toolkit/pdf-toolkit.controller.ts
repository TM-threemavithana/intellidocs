import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Body,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PdfToolkitService } from './pdf-toolkit.service';

@Controller('pdf-toolkit')
export class PdfToolkitController {
  constructor(private readonly pdfToolkitService: PdfToolkitService) {}

  /**
   * Merges uploaded PDF documents.
   * POST /pdf-toolkit/merge
   */
  @Post('merge')
  @UseInterceptors(FilesInterceptor('files'))
  async mergePdfs(
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    if (!files || files.length < 2) {
      throw new BadRequestException('At least two PDF files are required for merging');
    }

    // Verify all files are PDFs
    files.forEach((file) => {
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException(`Invalid file type: ${file.originalname}. Only PDFs are allowed.`);
      }
    });

    const pdfBuffers = files.map((file) => file.buffer);
    const mergedBuffer = await this.pdfToolkitService.mergePdfs(pdfBuffers);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="merged_document.pdf"',
      'Content-Length': mergedBuffer.length,
    });

    res.end(mergedBuffer);
  }

  /**
   * Splits a PDF document based on page ranges.
   * POST /pdf-toolkit/split
   */
  @Post('split')
  @UseInterceptors(FileInterceptor('file'))
  async splitPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('ranges') rangesStr: string,
    @Res() res: Response,
  ) {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Uploaded file must be a PDF');
    }
    if (!rangesStr) {
      throw new BadRequestException('Page ranges configuration is required');
    }

    let ranges: { start: number; end: number }[];
    try {
      ranges = JSON.parse(rangesStr);
      if (!Array.isArray(ranges) || ranges.length === 0) {
        throw new Error();
      }
    } catch {
      throw new BadRequestException('Ranges must be a valid JSON array of {start, end}');
    }

    const splitDocs = await this.pdfToolkitService.splitPdf(file.buffer, ranges);

    if (splitDocs.length === 1) {
      // Single range, return single PDF directly
      const singleDoc = splitDocs[0];
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${singleDoc.filename}"`,
        'Content-Length': singleDoc.buffer.length,
      });
      res.end(singleDoc.buffer);
    } else {
      // Multiple ranges, zip them and return zip
      const zipBuffer = await this.pdfToolkitService.createZipArchive(splitDocs);
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="split_documents.zip"',
        'Content-Length': zipBuffer.length,
      });
      res.end(zipBuffer);
    }
  }

  /**
   * Converts uploaded PNG/JPEG images into a single PDF.
   * POST /pdf-toolkit/convert
   */
  @Post('convert')
  @UseInterceptors(FilesInterceptor('files'))
  async convertImagesToPdf(
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file is required for conversion');
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    files.forEach((file) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(`Unsupported file type: ${file.mimetype}. Only PNG and JPEG are allowed.`);
      }
    });

    const images = files.map((file) => ({
      buffer: file.buffer,
      mimetype: file.mimetype,
    }));

    const pdfBuffer = await this.pdfToolkitService.convertImagesToPdf(images);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="converted_images.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}

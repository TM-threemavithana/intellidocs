import { Module } from '@nestjs/common';
import { PdfToolkitService } from './pdf-toolkit.service';
import { PdfToolkitController } from './pdf-toolkit.controller';

@Module({
  controllers: [PdfToolkitController],
  providers: [PdfToolkitService],
  exports: [PdfToolkitService],
})
export class PdfToolkitModule {}

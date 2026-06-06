import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiDetectorController } from './ai-detector.controller';
import { AiDetectorService } from './ai-detector.service';

@Module({
  imports: [ConfigModule],
  controllers: [AiDetectorController],
  providers: [AiDetectorService],
  exports: [AiDetectorService],
})
export class AiDetectorModule {}

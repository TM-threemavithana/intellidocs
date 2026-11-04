import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiDetectorController } from './ai-detector.controller';
import { AiDetectorService } from './ai-detector.service';
import { DatabaseModule } from '../../core/database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [AiDetectorController],
  providers: [AiDetectorService],
  exports: [AiDetectorService],
})
export class AiDetectorModule {}

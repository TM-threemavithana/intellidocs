import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CachingService } from './caching.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CachingService],
  exports: [CachingService],
})
export class CachingModule {}

import { Controller, Post, Get } from '@nestjs/common';
import { RagEvalService } from './rag-eval.service';

@Controller('rag/evaluate')
export class RagEvalController {
  constructor(private readonly ragEvalService: RagEvalService) {}

  /**
   * Triggers a local RAGAS evaluation run.
   * POST /rag/evaluate
   */
  @Post()
  async runEvaluation() {
    const report = await this.ragEvalService.runEvaluation();
    return {
      success: true,
      data: report,
    };
  }

  /**
   * Retrieves history of evaluation benchmarks.
   * GET /rag/evaluate/results
   */
  @Get('results')
  async getResults() {
    const history = this.ragEvalService.getHistory();
    return {
      success: true,
      data: history,
    };
  }
}

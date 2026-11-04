import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RAGService } from './rag.service';
import * as fs from 'fs';
import * as path from 'path';

export interface EvaluationRecord {
  id: string;
  timestamp: string;
  faithfulness: number; // 0 to 100
  relevance: number; // 0 to 100
  recall: number; // 0 to 100
  precision: number; // 0 to 100
  averageScore: number;
  testCasesCount: number;
  details: {
    question: string;
    generatedAnswer: string;
    groundTruth: string;
    faithfulness: number;
    relevance: number;
    recall: number;
    precision: number;
    reasoning: string;
  }[];
}

@Injectable()
export class RagEvalService implements OnModuleInit {
  private readonly logger = new Logger(RagEvalService.name);
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;
  private readonly historyFilePath: string;
  private evaluationHistory: EvaluationRecord[] = [];

  // Ground Truth benchmark Q&A dataset (MOK-02 remediation: 5 diverse benchmark questions)
  private readonly benchmarkDataset = [
    {
      question: 'What is document chunking in RAG pipelines?',
      groundTruth:
        'Document chunking is the process of breaking down large documents into smaller semantic text segments or chunks to fit inside LLM context limits and improve search retrieval accuracy.',
    },
    {
      question: 'What is the purpose of vector embeddings in semantic search?',
      groundTruth:
        'Vector embeddings convert text into high-dimensional numerical vectors that capture semantic meaning, allowing similarity search based on conceptual closeness rather than exact keyword matches.',
    },
    {
      question: 'How does optical character recognition (OCR) assist document processing?',
      groundTruth:
        'OCR extracts machine-readable textual data from scanned paper documents, PDF images, and photos, making previously unstructured image content searchable and indexable.',
    },
    {
      question: 'What is hybrid search in information retrieval?',
      groundTruth:
        'Hybrid search combines dense vector retrieval (semantic search) with sparse lexical retrieval (keyword search like BM25) to provide both semantic understanding and exact keyword precision.',
    },
    {
      question: 'Why are source citations critical in enterprise RAG systems?',
      groundTruth:
        'Source citations provide provenance and traceability, enabling users to verify answers against original document sources and significantly reducing the risk of unchecked hallucinations.',
    },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly ragService: RAGService,
  ) {
    this.ollamaUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL') || 'llama2:latest';
    this.historyFilePath = path.resolve(process.cwd(), 'data', 'rag-evaluation-history.json');
  }

  onModuleInit() {
    this.loadHistoryFromDisk();
  }

  private loadHistoryFromDisk(): void {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const fileContent = fs.readFileSync(this.historyFilePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed)) {
          this.evaluationHistory = parsed;
          this.logger.log(`Loaded ${this.evaluationHistory.length} evaluation records from disk.`);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to read evaluation history from ${this.historyFilePath}: ${err.message}`);
    }
  }

  private saveHistoryToDisk(): void {
    try {
      const dir = path.dirname(this.historyFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.historyFilePath, JSON.stringify(this.evaluationHistory, null, 2), 'utf-8');
    } catch (err) {
      this.logger.error(`Failed to save evaluation history to disk: ${err.message}`);
    }
  }

  /**
   * Helper to query Ollama for RAGAS metric ratings.
   * If LLM is unreachable or errors, returns an honest 0 score (no fabricated score).
   */
  private async queryMetric(prompt: string): Promise<{ score: number; reasoning: string }> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          stream: false,
          options: {
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API returned HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      const llmOutput = responseData.response || '';

      const jsonStart = llmOutput.indexOf('{');
      const jsonEnd = llmOutput.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1 || jsonStart > jsonEnd) {
        throw new Error('LLM output did not contain a valid JSON structure');
      }

      const jsonStr = llmOutput.substring(jsonStart, jsonEnd + 1);
      const result = JSON.parse(jsonStr);

      const parsedScore = Number(result.score);
      const score = Number.isFinite(parsedScore) ? Math.max(0, Math.min(100, Math.round(parsedScore))) : 0;

      return {
        score,
        reasoning: result.reasoning || 'Evaluated successfully by judge model.',
      };
    } catch (error) {
      this.logger.error(`Ollama evaluation failed: ${error.message}`);
      // Honest failure: 0 score instead of fabricated 75
      return {
        score: 0,
        reasoning: `Evaluation failed: ${error.message}. Ollama model was unavailable or did not output structured rating.`,
      };
    }
  }

  /**
   * Evaluates Faithfulness
   */
  private async evaluateFaithfulness(answer: string, context: string): Promise<{ score: number; reasoning: string }> {
    if (!context || !answer) {
      return { score: 0, reasoning: 'Insufficient context or answer to evaluate faithfulness.' };
    }

    const prompt = `You are an impartial RAG evaluator. Check if the generated answer is faithful to the context (contains ONLY statements supported by the context).
    
Context:
${context}

Answer:
${answer}

Return a valid JSON object ONLY with numeric score (0 to 100) and reasoning:
{"score": 85, "reasoning": "Explanation here"}`;
    return this.queryMetric(prompt);
  }

  /**
   * Evaluates Answer Relevance
   */
  private async evaluateRelevance(question: string, answer: string): Promise<{ score: number; reasoning: string }> {
    if (!answer) {
      return { score: 0, reasoning: 'No answer was generated for this question.' };
    }

    const prompt = `You are an impartial RAG evaluator. Rate how relevant, complete, and directly responsive the answer is to the question.
    
Question:
${question}

Answer:
${answer}

Return a valid JSON object ONLY with numeric score (0 to 100) and reasoning:
{"score": 90, "reasoning": "Explanation here"}`;
    return this.queryMetric(prompt);
  }

  /**
   * Evaluates Context Recall
   */
  private async evaluateRecall(groundTruth: string, context: string): Promise<{ score: number; reasoning: string }> {
    if (!context) {
      return { score: 0, reasoning: 'No context was retrieved to match against ground truth.' };
    }

    const prompt = `You are an impartial RAG evaluator. Check if the retrieved context contains the facts in the ground truth expected answer.
    
Ground Truth Expected Answer:
${groundTruth}

Retrieved Context:
${context}

Return a valid JSON object ONLY with numeric score (0 to 100) and reasoning:
{"score": 85, "reasoning": "Explanation here"}`;
    return this.queryMetric(prompt);
  }

  /**
   * Evaluates Context Precision
   */
  private async evaluatePrecision(question: string, context: string): Promise<{ score: number; reasoning: string }> {
    if (!context) {
      return { score: 0, reasoning: 'No context was retrieved to measure precision.' };
    }

    const prompt = `You are an impartial RAG evaluator. Check if the retrieved context chunks are precise, focused, and free from irrelevant noise for this question.
    
Question:
${question}

Retrieved Context:
${context}

Return a valid JSON object ONLY with numeric score (0 to 100) and reasoning:
{"score": 80, "reasoning": "Explanation here"}`;
    return this.queryMetric(prompt);
  }

  /**
   * Run full RAGAS evaluation
   */
  async runEvaluation(userId?: string): Promise<EvaluationRecord> {
    this.logger.log(`Triggering local RAGAS evaluation benchmark (${this.benchmarkDataset.length} test cases)`);

    const details = [];
    let sumFaithfulness = 0;
    let sumRelevance = 0;
    let sumRecall = 0;
    let sumPrecision = 0;

    for (const testCase of this.benchmarkDataset) {
      this.logger.log(`Evaluating Question: "${testCase.question}"`);

      let answer = '';
      let contextUsed = '';

      try {
        // Query RAG pipeline using authenticated user scope or system benchmark scope
        const ragRes = await this.ragService.ask(testCase.question, undefined, 5, undefined, userId || 'system-benchmark');
        answer = ragRes.answer;
        contextUsed = ragRes.contextUsed || '';
      } catch (err) {
        this.logger.error(`RAG pipeline query failed for question "${testCase.question}": ${err.message}`);
        answer = '';
        contextUsed = '';
      }

      // Run judge model evaluations
      const fMetric = await this.evaluateFaithfulness(answer, contextUsed);
      const rMetric = await this.evaluateRelevance(testCase.question, answer);
      const recMetric = await this.evaluateRecall(testCase.groundTruth, contextUsed);
      const pMetric = await this.evaluatePrecision(testCase.question, contextUsed);

      sumFaithfulness += fMetric.score;
      sumRelevance += rMetric.score;
      sumRecall += recMetric.score;
      sumPrecision += pMetric.score;

      details.push({
        question: testCase.question,
        generatedAnswer: answer || '[No response generated]',
        groundTruth: testCase.groundTruth,
        faithfulness: fMetric.score,
        relevance: rMetric.score,
        recall: recMetric.score,
        precision: pMetric.score,
        reasoning: `Faithfulness: ${fMetric.reasoning}\nRelevance: ${rMetric.reasoning}\nRecall: ${recMetric.reasoning}\nPrecision: ${pMetric.reasoning}`,
      });
    }

    const testCasesCount = this.benchmarkDataset.length;
    const avgF = Math.round(sumFaithfulness / testCasesCount);
    const avgRel = Math.round(sumRelevance / testCasesCount);
    const avgRec = Math.round(sumRecall / testCasesCount);
    const avgP = Math.round(sumPrecision / testCasesCount);
    const averageScore = Math.round((avgF + avgRel + avgRec + avgP) / 4);

    const record: EvaluationRecord = {
      id: `eval-${Date.now()}`,
      timestamp: new Date().toISOString(),
      faithfulness: avgF,
      relevance: avgRel,
      recall: avgRec,
      precision: avgP,
      averageScore,
      testCasesCount,
      details,
    };

    // Store record in memory and persist to disk
    this.evaluationHistory.unshift(record);

    if (this.evaluationHistory.length > 50) {
      this.evaluationHistory.pop();
    }

    this.saveHistoryToDisk();

    this.logger.log(`RAGAS Evaluation complete. Avg Score: ${averageScore}% across ${testCasesCount} test cases`);
    return record;
  }

  /**
   * Retrieves all evaluation runs.
   */
  getHistory(): EvaluationRecord[] {
    return this.evaluationHistory;
  }
}

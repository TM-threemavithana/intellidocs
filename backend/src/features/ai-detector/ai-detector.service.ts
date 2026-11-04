import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import * as crypto from 'crypto';

export interface SentenceAnalysis {
  text: string;
  aiProbability: number; // 0 to 100
  reason: string;
}

export interface DetectionResult {
  score: number; // Overall AI Likelihood (0 to 100)
  perplexity: number; // Lexical entropy proxy (0 to 100)
  burstiness: number; // Sentence length variation index (0 to 100)
  readability: number; // Flesch Readability index
  sentences: SentenceAnalysis[];
  report: string;
}

@Injectable()
export class AiDetectorService {
  private readonly logger = new Logger(AiDetectorService.name);
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.ollamaUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL') || 'llama2:latest';
  }

  /**
   * Tokenizes text into sentences.
   */
  private splitSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Tokenizes sentence into words.
   */
  private splitWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 0);
  }

  /**
   * Estimate syllables in a word (needed for Flesch Readability)
   */
  private countSyllablesInWord(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const vowels = word.match(/[aeiouy]{1,2}/g);
    return vowels ? vowels.length : 1;
  }

  /**
   * Calculates Flesch Reading Ease score
   */
  private calculateReadability(words: string[], sentencesCount: number): number {
    if (words.length === 0 || sentencesCount === 0) return 0;

    let totalSyllables = 0;
    for (const word of words) {
      totalSyllables += this.countSyllablesInWord(word);
    }

    const avgSentenceLength = words.length / sentencesCount;
    const avgSyllablesPerWord = totalSyllables / words.length;

    // Flesch Reading Ease formula
    const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculates burstiness index (normalized variance of sentence lengths)
   * High score = high variation in sentence length (typical human).
   * Low score = uniform sentence length (often AI).
   */
  private calculateBurstiness(sentences: string[]): { burstiness: number; rawVariance: number } {
    if (sentences.length <= 1) {
      return { burstiness: 50, rawVariance: 0 };
    }

    const lengths = sentences.map((s) => this.splitWords(s).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;

    if (mean === 0) return { burstiness: 50, rawVariance: 0 };

    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean; // Coefficient of Variation

    const burstinessScore = Math.min(100, Math.max(0, Math.round(cv * 120)));

    return {
      burstiness: burstinessScore,
      rawVariance: variance,
    };
  }

  /**
   * Calculates Shannon Entropy of words as a proxy for Lexical Diversity
   */
  private calculateEntropy(words: string[]): number {
    if (words.length === 0) return 0;

    const frequencies: Record<string, number> = {};
    for (const word of words) {
      frequencies[word] = (frequencies[word] || 0) + 1;
    }

    let entropy = 0;
    const total = words.length;

    for (const word in frequencies) {
      const p = frequencies[word] / total;
      entropy -= p * Math.log2(p);
    }

    const scaledEntropy = Math.min(100, Math.max(0, Math.round((entropy / 8) * 100)));
    return scaledEntropy;
  }

  /**
   * Analyze text for AI patterns using hybrid stats + Ollama model audit.
   */
  async analyzeText(text: string, userId?: string): Promise<DetectionResult> {
    this.logger.log(`Performing AI Content detection on input text (${text.length} chars)`);

    if (!text || text.trim().length < 100) {
      throw new Error('Text must be at least 100 characters long for an accurate analysis.');
    }

    // 1. Calculate statistical metrics
    const sentences = this.splitSentences(text);
    const words = this.splitWords(text);

    const readability = this.calculateReadability(words, sentences.length);
    const { burstiness } = this.calculateBurstiness(sentences);
    const perplexity = this.calculateEntropy(words);

    // Statistical indicator: low vocabulary entropy + low sentence variance
    const statisticalAiLikelihood = Math.round((100 - perplexity) * 0.4 + (100 - burstiness) * 0.6);

    let finalScore = statisticalAiLikelihood;
    let mappedSentences: SentenceAnalysis[] = [];
    let reportText = '';

    try {
      // 2. Query LLM to perform linguistic structure audit
      const sentenceItems = sentences.map((s, idx) => `[S-${idx + 1}] ${s}`).join('\n');

      const prompt = `You are an objective linguistic analyst auditing text for characteristics often found in AI-generated writing.
Analyze the sentences below:
${sentenceItems}

Return a valid JSON object matching the format below. Do NOT output markdown or explanation.
Format:
{
  "aiLikelihood": 65,
  "sentences": [
    { "text": "Sentence text...", "aiProbability": 80, "reason": "Uses repetitive robotic phrasing." }
  ],
  "report": "Stylometric assessment of vocabulary variation and syntactic uniformity."
}`;

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
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const responseData = await response.json();
      const llmOutput = responseData.response || '';

      const jsonStart = llmOutput.indexOf('{');
      const jsonEnd = llmOutput.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1 || jsonStart > jsonEnd) {
        throw new Error('LLM output did not contain valid JSON structure');
      }

      const jsonStr = llmOutput.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);

      const llmScore = Math.max(0, Math.min(100, parsed.aiLikelihood || 50));
      finalScore = Math.round(statisticalAiLikelihood * 0.4 + llmScore * 0.6);

      mappedSentences = sentences.map((s) => {
        const found = parsed.sentences?.find(
          (ls: any) => ls.text && (ls.text.includes(s) || s.includes(ls.text)),
        );
        return {
          text: s,
          aiProbability: found ? found.aiProbability : (finalScore > 50 ? 60 : 30),
          reason: found ? found.reason : 'Writing structure is within standard variation.',
        };
      });

      reportText = parsed.report || `Stylometric forensic score: ${finalScore}%. Combines lexical entropy (${perplexity}%) and sentence length burstiness (${burstiness}%). This is an algorithmic estimate, not definitive proof of authorship.`;

    } catch (error) {
      this.logger.warn(`Ollama audit unavailable, using statistical stylometry: ${error.message}`);

      mappedSentences = sentences.map((s) => {
        const isAi = statisticalAiLikelihood > 50;
        return {
          text: s,
          aiProbability: isAi ? 65 : 25,
          reason: isAi ? 'Sentence exhibits uniform structures consistent with template patterns.' : 'Sentence shows natural human lexical diversity.',
        };
      });

      reportText = `Statistical stylometry evaluation: Calculated structural uniformity score: ${statisticalAiLikelihood}% (Sentence burstiness: ${burstiness}%, Lexical diversity: ${perplexity}%). Note: Heuristic stylometric indicators carry statistical uncertainty and should not be used as sole proof of authorship.`;
    }

    const result: DetectionResult = {
      score: finalScore,
      perplexity,
      burstiness,
      readability,
      sentences: mappedSentences,
      report: reportText,
    };

    // Persist result if user is authenticated (fixes dead schema)
    if (userId) {
      try {
        const textHash = crypto.createHash('sha256').update(text).digest('hex').substring(0, 32);
        await this.prisma.detectionResult.upsert({
          where: { textHash },
          create: {
            userId,
            textHash,
            aiProbability: finalScore / 100,
            confidence: finalScore > 75 ? 'high' : finalScore > 40 ? 'medium' : 'low',
            perplexityScore: perplexity,
            burstnessScore: burstiness,
            highlightedSentences: mappedSentences.filter((s) => s.aiProbability > 50).map((s) => s.text),
          },
          update: {
            aiProbability: finalScore / 100,
            confidence: finalScore > 75 ? 'high' : finalScore > 40 ? 'medium' : 'low',
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to persist detection result: ${err.message}`);
      }
    }

    return result;
  }
}

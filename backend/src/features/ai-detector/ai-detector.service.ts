import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SentenceAnalysis {
  text: string;
  aiProbability: number; // 0 to 100
  reason: string;
}

export interface DetectionResult {
  score: number; // Overall AI Likelihood (0 to 100)
  perplexity: number; // Lexical entropy proxy (0 to 100)
  burstiness: number; // Sentence variance index (0 to 100)
  readability: number; // Flesch Readability index
  sentences: SentenceAnalysis[];
  report: string;
}

@Injectable()
export class AiDetectorService {
  private readonly logger = new Logger(AiDetectorService.name);
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;

  constructor(private readonly configService: ConfigService) {
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
   * High score = high variation in sentence length (Human).
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

    // Map CV to a 0-100 scale where higher represents more burstiness (human-like)
    // Typical human CV is around 0.4 to 0.8. Typical AI is 0.1 to 0.3.
    const burstinessScore = Math.min(100, Math.max(0, Math.round(cv * 120)));

    return {
      burstiness: burstinessScore,
      rawVariance: variance,
    };
  }

  /**
   * Calculates Shannon Entropy of words as a proxy for Lexical Perplexity
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

    // Map typical english text entropy (around 4.0 - 7.0) to a 0-100 scale
    // Higher entropy = richer vocabulary (typically human).
    const scaledEntropy = Math.min(100, Math.max(0, Math.round((entropy / 8) * 100)));
    return scaledEntropy;
  }

  /**
   * Analyze text for AI patterns using hybrid stats + Ollama model audit.
   */
  async analyzeText(text: string): Promise<DetectionResult> {
    this.logger.log(`Performing AI Content detection on input text using model: ${this.ollamaModel}`);
    
    if (!text || text.trim().length < 100) {
      throw new Error('Text must be at least 100 characters long for an accurate analysis.');
    }

    // 1. Calculate statistical metrics
    const sentences = this.splitSentences(text);
    const words = this.splitWords(text);

    const readability = this.calculateReadability(words, sentences.length);
    const { burstiness } = this.calculateBurstiness(sentences);
    const perplexity = this.calculateEntropy(words);

    // Human score proxy from stats: High perplexity and high burstiness suggest human authorship
    // Therefore: low perplexity and low burstiness suggests AI authorship
    const statisticalAiLikelihood = Math.round((100 - perplexity) * 0.4 + (100 - burstiness) * 0.6);

    try {
      // 2. Query LLM to perform linguistic structure audit
      const sentenceItems = sentences.map((s, idx) => `[S-${idx + 1}] ${s}`).join('\n');
      
      const prompt = `You are a professional linguistic forensics and AI Content Detector.
Analyze the sentences below. For each sentence, evaluate the probability that it was written by an AI language model based on predictability, structure, typical transition phrases, and generic patterns.

---
Sentences to analyze:
${sentenceItems}

---
Your task is to analyze the text and return a valid JSON object matching the format below.
Do NOT return any other text, markdown fences, notes, or explanations. Return ONLY the raw JSON object.

Format:
{
  "aiLikelihood": 65,
  "sentences": [
    { "text": "Sentence text here...", "aiProbability": 80, "reason": "Uses typical robotic flow." }
  ],
  "report": "Comprehensive evaluation report of writing style..."
}

Response JSON:`;

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
            temperature: 0.1, // Highly stable output
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
        throw new Error('Llm output did not contain valid JSON structure');
      }

      const jsonStr = llmOutput.substring(jsonStart, jsonEnd + 1);
      const parsedLlmResult = JSON.parse(jsonStr);

      const llmScore = parsedLlmResult.aiLikelihood || 50;
      
      // 3. Blend Scores (40% statistical metrics, 60% LLM audit)
      const finalScore = Math.round(statisticalAiLikelihood * 0.4 + llmScore * 0.6);

      // Match LLM sentence outputs back to original array
      const mappedSentences: SentenceAnalysis[] = sentences.map((s, idx) => {
        const found = parsedLlmResult.sentences?.find(
          (ls: any) => ls.text && (ls.text.includes(s) || s.includes(ls.text))
        );
        return {
          text: s,
          aiProbability: found ? found.aiProbability : (finalScore > 50 ? 60 : 30),
          reason: found ? found.reason : 'Writing structure is within standard variation.',
        };
      });

      return {
        score: finalScore,
        perplexity,
        burstiness,
        readability,
        sentences: mappedSentences,
        report: parsedLlmResult.report || 'Stylometric analysis complete. The text contains structural uniformity consistent with current LLM text patterns.',
      };

    } catch (error) {
      this.logger.error(`Ollama audit failed, fallback to statistical evaluation: ${error.message}`);
      
      // Fallback: If Ollama fails, build a statistical fallback response
      const fallbackSentences: SentenceAnalysis[] = sentences.map((s) => {
        const wordsInSentence = this.splitWords(s).length;
        // Simple variance metric for fallback sentence classification
        const isAi = statisticalAiLikelihood > 50;
        return {
          text: s,
          aiProbability: isAi ? 65 : 25,
          reason: isAi ? 'Sentence exhibits uniform structures consistent with AI patterns.' : 'Sentence shows normal human lexical diversity.',
        };
      });

      return {
        score: statisticalAiLikelihood,
        perplexity,
        burstiness,
        readability,
        sentences: fallbackSentences,
        report: `Statistical forensic evaluation complete. Analysis calculated high structural similarity (low burstiness: ${burstiness}%) and low vocabulary divergence (perplexity proxy: ${perplexity}%), leading to the score.`,
      };
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class ResumeAnalyzerService {
  private readonly logger = new Logger(ResumeAnalyzerService.name);
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;

  constructor(private readonly configService: ConfigService) {
    this.ollamaUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL') || 'llama2:latest';
  }

  /**
   * Extracts text from a PDF resume.
   */
  async parsePdfResume(buffer: Buffer): Promise<string> {
    this.logger.log('Parsing PDF resume');
    try {
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (error) {
      this.logger.error(`Failed to parse PDF resume: ${error.message}`);
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Analyzes resume text against a job description using the local LLM.
   */
  async analyzeResume(resumeText: string, jobDescription: string): Promise<any> {
    this.logger.log(`Analyzing resume text against job description using model: ${this.ollamaModel}`);
    try {
      const prompt = `You are an expert ATS (Applicant Tracking System) parser and CV auditor.
Analyze the following CV text against the Job Description.

---
Job Description:
${jobDescription}

---
CV Content:
${resumeText}

---
Your task is to review the CV and provide matching statistics.
You MUST return a valid JSON object matching the format below.
Do NOT return any other text, markdown fences, notes, or explanations. Return ONLY the raw JSON object.

Format:
{
  "score": 75,
  "sections": [
    { "name": "Education", "present": true, "feedback": "Education section is complete." },
    { "name": "Experience", "present": true, "feedback": "Experience section is complete." },
    { "name": "Skills", "present": true, "feedback": "Skills are clearly listed." },
    { "name": "Contact Info", "present": true, "feedback": "Contact info is present." },
    { "name": "Summary / Objective", "present": false, "feedback": "Add a professional summary." }
  ],
  "keywords": {
    "matched": ["React", "TypeScript"],
    "missing": ["Docker", "AWS"]
  },
  "recommendations": [
    "Add missing keywords.",
    "Improve experience descriptions."
  ]
}

Response JSON:`;

      const response = await fetch(
        `${this.ollamaUrl}/api/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.ollamaModel,
            prompt,
            stream: false,
            options: {
              temperature: 0.2, // Low temperature for high consistency
              top_p: 0.9,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const responseData = await response.json();
      const llmOutput = responseData.response || '';

      // Parse JSON from the output, handling optional markdown wrappers
      const jsonStart = llmOutput.indexOf('{');
      const jsonEnd = llmOutput.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1 || jsonStart > jsonEnd) {
        throw new Error('LLM did not return a valid JSON structure');
      }

      const jsonStr = llmOutput.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    } catch (error) {
      this.logger.error(`Failed to analyze resume: ${error.message}`);
      throw error;
    }
  }
}

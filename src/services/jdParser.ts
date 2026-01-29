import fs from 'fs';
import path from 'path';

interface ParsedJD {
  title?: string;
  location?: string;
  jobType?: string;
  reportsTo?: string;
  roleSummary?: string;
  responsibilities?: string;
  requiredExperience?: string;
  preferredExperience?: string;
  successCriteria?: string;
  resumeWeightage?: number;
  problemSolutioningWeightage?: number;
  problemSolutioningQuestions?: string;
  evaluationCriteria?: string;
}

class JDParserService {
  /**
   * Parse a JD document (PDF or DOCX) and extract structured fields
   */
  async parseDocument(filePath: string): Promise<ParsedJD> {
    const ext = path.extname(filePath).toLowerCase();
    let text: string;

    if (ext === '.pdf') {
      text = await this.parsePDF(filePath);
    } else if (ext === '.docx' || ext === '.doc') {
      text = await this.parseDOCX(filePath);
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    return this.extractFields(text);
  }

  /**
   * Parse PDF file and extract text
   */
  private async parsePDF(filePath: string): Promise<string> {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  /**
   * Parse DOCX file and extract text
   */
  private async parseDOCX(filePath: string): Promise<string> {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  /**
   * Extract structured fields from raw text
   */
  private extractFields(text: string): ParsedJD {
    const parsed: ParsedJD = {};

    // Normalize line breaks
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l);

    // Extract title (usually first non-empty line or line before "Location:")
    const titleMatch = this.findSection(normalizedText, null, ['Location', 'Reports to', 'Role Summary']);
    if (titleMatch) {
      parsed.title = titleMatch.split('\n')[0].trim();
    }

    // Extract Location
    const locationMatch = this.findFieldValue(normalizedText, ['Location:', 'Location']);
    if (locationMatch) {
      parsed.location = locationMatch;
    }

    // Extract Reports To
    const reportsToMatch = this.findFieldValue(normalizedText, ['Reports to:', 'Reports To:', 'Reporting to:']);
    if (reportsToMatch) {
      parsed.reportsTo = reportsToMatch;
    }

    // Extract Role Summary
    const roleSummaryMatch = this.findSection(normalizedText, ['Role Summary', 'Summary', 'Overview'], ['Responsibilities', 'Key Responsibilities', 'Duties']);
    if (roleSummaryMatch) {
      parsed.roleSummary = this.formatAsRichText(roleSummaryMatch);
    }

    // Extract Responsibilities
    const responsibilitiesMatch = this.findSection(normalizedText, ['Responsibilities', 'Key Responsibilities', 'Duties', 'Primary Responsibilities'], ['Required Experience', 'Requirements', 'Qualifications', 'Required Qualifications']);
    if (responsibilitiesMatch) {
      parsed.responsibilities = this.formatAsRichText(responsibilitiesMatch);
    }

    // Extract Required Experience
    const requiredExpMatch = this.findSection(normalizedText, ['Required Experience', 'Requirements', 'Required Qualifications', 'Minimum Qualifications'], ['Preferred Experience', 'Preferred Qualifications', 'Nice to Have', 'Success Criteria']);
    if (requiredExpMatch) {
      parsed.requiredExperience = this.formatAsRichText(requiredExpMatch);
    }

    // Extract Preferred Experience
    const preferredExpMatch = this.findSection(normalizedText, ['Preferred Experience', 'Preferred Qualifications', 'Nice to Have', 'Desired Experience'], ['Success Criteria', 'Resume Weightage', 'Problem']);
    if (preferredExpMatch) {
      parsed.preferredExperience = this.formatAsRichText(preferredExpMatch);
    }

    // Extract Success Criteria
    const successCriteriaMatch = this.findSection(normalizedText, ['Success Criteria', 'First Six Months', 'Goals', 'Key Metrics'], ['Resume Weightage', 'Problem']);
    if (successCriteriaMatch) {
      parsed.successCriteria = this.formatAsRichText(successCriteriaMatch);
    }

    // Extract Resume Weightage
    const resumeWeightageMatch = normalizedText.match(/Resume\s*(?:Weightage)?[:\s]*(\d+)\s*%?/i);
    if (resumeWeightageMatch) {
      parsed.resumeWeightage = parseInt(resumeWeightageMatch[1], 10);
    }

    // Extract Problem Solutioning Weightage
    const problemWeightageMatch = normalizedText.match(/Problem\s*Solutioning\s*(?:Weightage)?[:\s]*(\d+)\s*%?/i);
    if (problemWeightageMatch) {
      parsed.problemSolutioningWeightage = parseInt(problemWeightageMatch[1], 10);
    }

    // Extract Problem Solutioning Questions
    const problemMatch = this.findSection(normalizedText, ['Problem', 'Problem 1', 'Scenario', 'Task'], ['What we look for', 'Evaluation', 'Format']);
    if (problemMatch) {
      parsed.problemSolutioningQuestions = this.formatAsRichText(problemMatch);
    }

    // Extract Evaluation Criteria (What we look for)
    const evalMatch = this.findSection(normalizedText, ['What we look for', 'Evaluation Criteria', 'Assessment Criteria'], ['Format', null]);
    if (evalMatch) {
      parsed.evaluationCriteria = this.formatAsRichText(evalMatch);
    }

    return parsed;
  }

  /**
   * Find a field value that appears on the same line as the label
   */
  private findFieldValue(text: string, labels: string[]): string | null {
    for (const label of labels) {
      const regex = new RegExp(`${label}\\s*[:\\-]?\\s*(.+)`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].trim().split('\n')[0].trim();
      }
    }
    return null;
  }

  /**
   * Find content between section headers
   */
  private findSection(text: string, startHeaders: string[] | null, endHeaders: (string | null)[]): string | null {
    let startIndex = 0;

    if (startHeaders) {
      for (const header of startHeaders) {
        const regex = new RegExp(`\\n${header}[\\s\\n]*`, 'i');
        const match = text.match(regex);
        if (match && match.index !== undefined) {
          startIndex = match.index + match[0].length;
          break;
        }
      }
      if (startIndex === 0) return null;
    }

    let endIndex = text.length;
    for (const header of endHeaders) {
      if (header === null) continue;
      const regex = new RegExp(`\\n${header}`, 'i');
      const match = text.slice(startIndex).match(regex);
      if (match && match.index !== undefined) {
        const potentialEnd = startIndex + match.index;
        if (potentialEnd < endIndex && potentialEnd > startIndex) {
          endIndex = potentialEnd;
        }
      }
    }

    const section = text.slice(startIndex, endIndex).trim();
    return section || null;
  }

  /**
   * Format extracted text as rich text (basic HTML)
   */
  private formatAsRichText(text: string): string {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const formatted: string[] = [];
    let inList = false;

    for (const line of lines) {
      // Check if line starts with bullet point
      if (line.match(/^[●•\-\*]\s*/)) {
        if (!inList) {
          formatted.push('<ul>');
          inList = true;
        }
        const content = line.replace(/^[●•\-\*]\s*/, '');
        formatted.push(`<li>${content}</li>`);
      } else {
        if (inList) {
          formatted.push('</ul>');
          inList = false;
        }
        formatted.push(`<p>${line}</p>`);
      }
    }

    if (inList) {
      formatted.push('</ul>');
    }

    return formatted.join('\n');
  }
}

export const jdParserService = new JDParserService();

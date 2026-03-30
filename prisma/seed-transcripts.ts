/**
 * Transcript seed script — creates transcript records for all audit briefs.
 *
 * - 2026 briefs: extracts real transcript text from .docx files
 * - 2025 briefs: generates structured placeholder transcripts
 *
 * Usage:
 *   npx tsx prisma/seed-transcripts.ts
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// eslint-disable-next-line no-console
const log = console.log.bind(console);

const ARCHIVE_ROOT = '/tmp/audit-seed/Archive';

/**
 * Extracts text from a .docx file using unzip + XML stripping.
 */
function extractDocxText(docxPath: string): string {
  try {
    const xml = execSync(`unzip -p "${docxPath}" word/document.xml 2>/dev/null`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    // Replace paragraph closing tags with double newlines, strip all XML
    return xml
      .replace(/<\/w:p>/g, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return '';
  }
}

/**
 * Splits transcript text into segments (paragraphs with approximate timestamps).
 */
function textToSegments(text: string): Array<{ start: number; end: number; text: string }> {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10);

  // Estimate ~150 words per minute for timing
  const WPM = 150;
  let currentTime = 0;
  return paragraphs.map((para) => {
    const wordCount = para.split(/\s+/).length;
    const durationSec = (wordCount / WPM) * 60;
    const segment = {
      start: Math.round(currentTime * 10) / 10,
      end: Math.round((currentTime + durationSec) * 10) / 10,
      text: para,
    };
    currentTime += durationSec;
    return segment;
  });
}

/** Map of folder name patterns to transcript .docx files. */
const TRANSCRIPT_FILES: Record<string, string> = {
  'APB 2026-02': 'Technical Content/2026/1. APB 2026-02 Audit trail - Tally/APB 2026-02_Transcript.docx',
  'APB 2026-03': 'Technical Content/2026/2. APB 2026-03 Effective JE testing/APB 2026-03_Transcript.docx',
  'APB 2026-04': 'Technical Content/2026/3. APB 2026-04 Communication with TCWG/APB 2026-04_Transcript.docx',
};

/** Placeholder transcript templates for 2025 briefs (keyed by partial title match). */
const PLACEHOLDER_TRANSCRIPTS: Record<string, string> = {
  'Audit Trail': `Welcome to The Audit Brief. In this episode, we discuss frequently asked questions about audit trail requirements.

Audit trail reporting has become a critical regulatory requirement affecting audit opinions. This bulletin addresses the most common queries our engagement teams face when dealing with audit trail compliance.

Key areas covered include documentation standards, the regulatory framework under the Companies Act, digital evidence retention policies, and common findings from recent quality inspections.

We discuss the practical challenges teams encounter — from legacy systems without audit trail capabilities to cloud-based environments where trail configuration requires careful evaluation.

The bulletin provides actionable guidance on what constitutes sufficient audit evidence when evaluating audit trails, and how to document your findings effectively.

Thank you for listening. Please refer to the full practice bulletin for detailed guidance and worked examples.`,

  'NFRA': `Welcome to The Audit Brief. Today we review the key reminders following the National Financial Reporting Authority's recent audit quality inspections.

The NFRA inspection cycle has highlighted several recurring themes that engagement teams must address. This bulletin consolidates the most significant findings and translates them into practical action items.

Areas of focus include: risk assessment documentation, particularly around fraud risks and significant account balances; the adequacy of audit evidence supporting key judgments; group audit coordination and component materiality allocation; and the application of professional skepticism in evaluating management estimates.

The inspection findings reinforce that quality is not about additional documentation alone — it is about demonstrating that the audit team applied rigorous professional judgment at each critical decision point.

We encourage all teams to review these findings as part of their engagement planning for upcoming audit cycles.

Thank you for listening to The Audit Brief.`,

  'Current Economic': `Welcome to The Audit Brief. This episode examines how the current economic environment affects our audit approach.

In periods of economic uncertainty, several audit areas require heightened attention. This bulletin provides a framework for adjusting your audit plan to address the risks that emerge in volatile markets.

We cover the impact on going concern assessments, including how to evaluate management's forecasts and the reasonableness of their assumptions. We discuss impairment testing considerations — particularly for goodwill and long-lived assets where recoverable amounts are sensitive to economic conditions.

Expected credit loss models under Ind AS 109 require careful scrutiny when forward-looking economic scenarios are uncertain. We provide guidance on challenging management's probability-weighted scenarios and the overlay adjustments that may be necessary.

Finally, we discuss the importance of updated risk assessments and how economic conditions may create new significant risks that were not present at the planning stage.

Thank you for listening. Stay informed, stay rigorous.`,

  'Part A': `Welcome to The Audit Brief. This is Part A of our two-part series on auditing in times of economic uncertainty, focusing on going concern.

Going concern assessment is one of the most judgment-intensive areas of an audit, and economic uncertainty amplifies both the risk and the scrutiny. This bulletin walks through a structured approach to evaluating going concern under ISA 570.

We begin with identifying indicators of going concern uncertainty — both financial indicators such as net liability positions and recurring losses, and operational indicators including loss of key customers or regulatory challenges.

Next, we discuss evaluating management's assessment: the period covered, the quality of the forecasts, the reasonableness of assumptions, and the identification of events or conditions that may cast significant doubt.

We then address the auditor's own assessment — stress testing management's forecasts, evaluating mitigating factors, and determining whether a material uncertainty exists that requires disclosure.

Finally, we cover reporting implications — from emphasis of matter paragraphs to qualified opinions and the communication requirements with those charged with governance.

Thank you for listening to The Audit Brief.`,

  'Part B': `Welcome to The Audit Brief. This is Part B of our series on economic uncertainty, focusing on fair value measurements.

Fair value measurements are inherently estimation-intensive, and economic volatility introduces additional complexity into the measurement process. This bulletin provides guidance on auditing fair value under ISA 540 (Revised) during uncertain times.

We examine the challenges of evaluating Level 2 and Level 3 fair value measurements when market data is limited or volatile. We discuss how to assess the appropriateness of valuation methodologies — including discounted cash flow models, market comparable approaches, and option pricing models.

Key considerations include: the sensitivity of valuations to key assumptions such as discount rates, growth rates, and market multiples; the need for specialist involvement; and the evaluation of management bias in selecting inputs.

We also address disclosure adequacy — ensuring that financial statements provide sufficient information about the sensitivity of fair value measurements to changes in key assumptions.

The bulletin includes practical examples illustrating how to document your evaluation of complex fair value estimates.

Thank you for listening. We hope this guidance supports your upcoming engagements.`,
};

async function main() {
  log('=== Seeding Transcripts ===\n');

  // Clear existing transcripts
  const deleted = await prisma.transcript.deleteMany({});
  if (deleted.count > 0) log(`  Cleared ${deleted.count} existing transcripts.\n`);

  const briefs = await prisma.auditBrief.findMany({
    select: { id: true, title: true, year: true, description: true },
    orderBy: { sortOrder: 'asc' },
  });

  for (const brief of briefs) {
    let fullText = '';
    let source = '';

    // Check for real .docx transcript (2026 briefs)
    for (const [key, docxRelPath] of Object.entries(TRANSCRIPT_FILES)) {
      if (brief.title.includes(key.replace('APB ', '').replace('-', '').trim()) || brief.year === 2026) {
        const docxPath = path.join(ARCHIVE_ROOT, docxRelPath);
        if (fs.existsSync(docxPath) && brief.title.toLowerCase().includes(key.split(' ').pop()!.toLowerCase().replace('-', ''))) {
          fullText = extractDocxText(docxPath);
          source = 'docx';
          break;
        }
      }
    }

    // Fall back: try matching by title keywords to placeholder templates
    if (!fullText) {
      for (const [keyword, template] of Object.entries(PLACEHOLDER_TRANSCRIPTS)) {
        if (brief.title.includes(keyword)) {
          fullText = template;
          source = 'placeholder';
          break;
        }
      }
    }

    // Last resort: generate from description
    if (!fullText) {
      fullText = `Welcome to The Audit Brief.\n\n${brief.description}\n\nThank you for listening to The Audit Brief. Please refer to the full practice bulletin for detailed guidance.`;
      source = 'generated';
    }

    const segments = textToSegments(fullText);

    await prisma.transcript.create({
      data: {
        auditBriefId: brief.id,
        fullText,
        segments: JSON.stringify(segments),
        transcriptType: 'short',
      },
    });

    log(`  [${source}] ${brief.title} — ${segments.length} segments, ${fullText.length} chars`);
  }

  log(`\n=== Done — ${briefs.length} transcripts created ===`);
}

main()
  .catch((error) => {
    console.error('Transcript seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

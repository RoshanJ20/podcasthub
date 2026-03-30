/**
 * Database seed script for The Audit Brief.
 *
 * Key responsibilities:
 * - Creates an initial superadmin user for bootstrapping the application
 * - Seeds audit briefs across all knowledge domains with realistic content
 * - Seeds learning graphs with linked episodes
 * - Seeds a demo member user for testing non-admin flows
 * - Idempotent: skips entities that already exist
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *
 * Dependencies:
 * - @prisma/client (PrismaClient)
 * - bcryptjs (password hashing)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// eslint-disable-next-line no-console -- Seed scripts use console for operator feedback
const log = console.log.bind(console);

/** Default superadmin credentials for initial bootstrap. */
const SEED_ADMIN = {
  email: 'admin@auditbrief.local',
  password: 'Admin@12345678',
  displayName: 'System Admin',
  role: 'superadmin',
} as const;

/** Demo member user for testing non-admin flows. */
const SEED_MEMBER = {
  email: 'member@auditbrief.local',
  password: 'Member@12345678',
  displayName: 'Alex Chen',
  role: 'member',
} as const;

/** Placeholder audio URL — points to a silent 10s mp3 for dev testing. */
const PLACEHOLDER_AUDIO = 'placeholder/silent-10s.mp3';

/** Placeholder thumbnail — a simple colored square per domain. */
const PLACEHOLDER_THUMB = 'placeholder/thumbnail.png';

/**
 * Audit brief seed data — realistic technical content across all domains.
 */
const AUDIT_BRIEFS = [
  {
    title: 'Navigating the Revised ISA 315: Risk Assessment in Practice',
    description:
      'A deep dive into the 2024 revisions to ISA 315, covering enhanced risk identification procedures, IT-related risks, and the spectrum of inherent risk factors auditors must now evaluate.',
    domain: 'Audit Methodology',
    year: 2025,
    tags: ['ISA 315', 'risk assessment', 'inherent risk', 'IT controls'],
    sortOrder: 1,
  },
  {
    title: 'Substantive Analytical Procedures: When and How to Rely on Them',
    description:
      'Guidance on designing effective substantive analytical procedures, setting precision thresholds, and documenting expectations — with practical worked examples for revenue and payroll testing.',
    domain: 'Audit Methodology',
    year: 2025,
    tags: ['analytical procedures', 'substantive testing', 'audit evidence'],
    sortOrder: 2,
  },
  {
    title: 'Group Audits Under ISA 600 (Revised): Component Materiality',
    description:
      'Practical walkthrough of ISA 600 (Revised) requirements for group audits, including component materiality allocation, communication with component auditors, and consolidation procedures.',
    domain: 'Audit Methodology',
    year: 2024,
    tags: ['ISA 600', 'group audit', 'component materiality', 'consolidation'],
    sortOrder: 3,
  },
  {
    title: 'IFRS 17 Insurance Contracts: Audit Considerations',
    description:
      'Key audit considerations for IFRS 17, including the general measurement model, variable fee approach, premium allocation approach, and transition adjustments. Includes common pitfalls and practical tips.',
    domain: 'Accounting and Reporting',
    year: 2025,
    tags: ['IFRS 17', 'insurance', 'measurement model', 'transition'],
    sortOrder: 4,
  },
  {
    title: 'Expected Credit Loss Models Under IFRS 9: Auditing Assumptions',
    description:
      'How to challenge management estimates in IFRS 9 ECL models, evaluate forward-looking information, test staging criteria, and assess significant increases in credit risk.',
    domain: 'Accounting and Reporting',
    year: 2025,
    tags: ['IFRS 9', 'ECL', 'credit risk', 'forward-looking information'],
    sortOrder: 5,
  },
  {
    title: 'Revenue Recognition Pitfalls: IFRS 15 Contract Modifications',
    description:
      'Common audit findings in IFRS 15 contract modification accounting — when to treat as a separate contract, cumulative catch-up adjustments, and variable consideration constraints.',
    domain: 'Accounting and Reporting',
    year: 2024,
    tags: ['IFRS 15', 'revenue recognition', 'contract modification'],
    sortOrder: 6,
  },
  {
    title: 'Generative AI in Audit: Opportunities, Risks, and Guardrails',
    description:
      'Exploring how large language models and generative AI are reshaping audit workflows — from document analysis and anomaly detection to the ethical and quality control guardrails firms must establish.',
    domain: 'Audit Technology',
    year: 2025,
    tags: ['generative AI', 'LLM', 'automation', 'quality control'],
    sortOrder: 7,
  },
  {
    title: 'Data Analytics for Journal Entry Testing',
    description:
      'Step-by-step guide to implementing data analytics in journal entry testing — from population completeness checks to anomaly scoring, including tool recommendations and documentation requirements.',
    domain: 'Audit Technology',
    year: 2025,
    tags: ['data analytics', 'journal entries', 'anomaly detection', 'CAAT'],
    sortOrder: 8,
  },
  {
    title: 'Auditing Cloud-Hosted ERP Systems: SOC Reports and Beyond',
    description:
      'Practical guidance for auditing entities that use cloud-hosted ERP systems. Covers SOC 1/2 report evaluation, complementary user entity controls, and subservice organisation considerations.',
    domain: 'Audit Technology',
    year: 2024,
    tags: ['cloud', 'ERP', 'SOC reports', 'IT general controls'],
    sortOrder: 9,
  },
  {
    title: 'ISQM 1 Implementation: Lessons from Year One',
    description:
      'Retrospective on the first full year of ISQM 1 implementation — common quality objectives, risk responses that worked, monitoring activities, and practical tips for the annual evaluation.',
    domain: 'Quality and Risk',
    year: 2025,
    tags: ['ISQM 1', 'quality management', 'monitoring', 'risk response'],
    sortOrder: 10,
  },
  {
    title: 'Independence Threats in Non-Audit Services',
    description:
      'Analysis of common independence threats when firms provide non-audit services to audit clients. Covers the IESBA Code requirements, safeguards framework, and real-world scenarios.',
    domain: 'Quality and Risk',
    year: 2024,
    tags: ['independence', 'IESBA Code', 'non-audit services', 'safeguards'],
    sortOrder: 11,
  },
  {
    title: 'LEAP 2025: Adapting to Regulatory Change',
    description:
      'Overview of the latest regulatory developments affecting the audit profession — EU CSRD implementation, PCAOB inspection findings, and emerging jurisdictional requirements for sustainability assurance.',
    domain: 'LEAP',
    year: 2025,
    tags: ['CSRD', 'PCAOB', 'regulation', 'sustainability assurance'],
    sortOrder: 12,
  },
  {
    title: 'Sustainability Assurance: ISSA 5000 Readiness',
    description:
      'Preparing for ISSA 5000 — the new standard for sustainability assurance engagements. Covers subject matter competence, evidence gathering for ESG metrics, and reporting considerations.',
    domain: 'LEAP',
    year: 2025,
    tags: ['ISSA 5000', 'sustainability', 'ESG', 'assurance'],
    sortOrder: 13,
  },
  {
    title: 'Auditing Fair Value Measurements Under ISA 540 (Revised)',
    description:
      'Comprehensive bulletin on the audit of accounting estimates, including fair value measurements — risk assessment, testing methods for complex models, and evaluating management bias.',
    domain: 'Auditing',
    year: 2025,
    tags: ['ISA 540', 'fair value', 'estimates', 'management bias'],
    sortOrder: 14,
  },
  {
    title: 'Going Concern Assessments in Uncertain Markets',
    description:
      'How to evaluate going concern in volatile economic environments — stress testing management forecasts, evaluating mitigating factors, and the auditor reporting implications under ISA 570.',
    domain: 'Auditing',
    year: 2024,
    tags: ['going concern', 'ISA 570', 'forecasts', 'economic uncertainty'],
    sortOrder: 15,
  },
];

/**
 * Learning graph seed data — structured learning paths with episodes.
 */
const LEARNING_GRAPHS = [
  {
    title: 'IFRS Foundations for Auditors',
    description:
      'A structured path through the key IFRS standards that auditors encounter most frequently — from revenue recognition to financial instruments and lease accounting.',
    domain: 'Accounting and Reporting',
    episodes: [
      {
        title: 'IFRS 15: Revenue from Contracts with Customers',
        description: 'The five-step model, principal vs agent, and variable consideration.',
      },
      {
        title: 'IFRS 9: Financial Instruments — Classification and Measurement',
        description: 'Business model assessment, SPPI test, and reclassification.',
      },
      {
        title: 'IFRS 16: Leases — Lessee Accounting',
        description: 'Right-of-use assets, lease liabilities, and practical expedients.',
      },
      {
        title: 'IAS 36: Impairment of Assets',
        description: 'Indicators, cash-generating units, goodwill allocation, and recoverable amount.',
      },
    ],
  },
  {
    title: 'Risk Assessment Masterclass',
    description:
      'Build a solid foundation in audit risk assessment — from understanding the entity and its environment to identifying and assessing risks of material misstatement.',
    domain: 'Auditing',
    episodes: [
      {
        title: 'Understanding the Entity and Its Environment',
        description: 'Industry conditions, regulatory framework, and the nature of the entity.',
      },
      {
        title: 'Internal Control Evaluation',
        description: 'Control environment, risk assessment process, and monitoring activities.',
      },
      {
        title: 'Identifying Risks of Material Misstatement',
        description: 'Assertion-level risks, significant risks, and the fraud risk assessment.',
      },
      {
        title: 'Designing Audit Responses',
        description: 'Overall responses, further audit procedures, and the nature/timing/extent matrix.',
      },
      {
        title: 'Documenting the Risk Assessment',
        description: 'ISA 315 documentation requirements and practical working paper templates.',
      },
    ],
  },
  {
    title: 'Audit Technology Toolkit',
    description:
      'A practical guide to the technology tools reshaping modern audit — from data analytics and process mining to AI-assisted document review.',
    domain: 'Audit Technology',
    episodes: [
      {
        title: 'Data Analytics Fundamentals',
        description: 'Population analysis, stratification, and statistical sampling with analytics.',
      },
      {
        title: 'Process Mining for Audit',
        description: 'Event logs, process discovery, and conformance checking in financial processes.',
      },
      {
        title: 'AI-Assisted Document Review',
        description: 'Using NLP and LLMs to analyse contracts, leases, and board minutes.',
      },
    ],
  },
];

/**
 * Seeds a single user if they don't already exist.
 */
async function seedUser(userData: {
  email: string;
  password: string;
  displayName: string;
  role: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: userData.email } });
  if (existing) {
    log(`  User "${userData.email}" already exists — skipping.`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(userData.password, 12);
  const user = await prisma.user.create({
    data: {
      email: userData.email,
      passwordHash,
      displayName: userData.displayName,
      role: userData.role,
      authProvider: 'credentials',
    },
  });
  log(`  Created ${userData.role}: ${userData.email}`);
  return user;
}

/**
 * Seeds all audit briefs with placeholder audio/thumbnail URLs.
 */
async function seedAuditBriefs() {
  log('\nSeeding audit briefs...');
  const existingCount = await prisma.auditBrief.count();
  if (existingCount > 0) {
    log(`  ${existingCount} audit briefs already exist — skipping.`);
    return;
  }

  for (const brief of AUDIT_BRIEFS) {
    const created = await prisma.auditBrief.create({
      data: {
        title: brief.title,
        description: brief.description,
        domain: brief.domain,
        year: brief.year,
        tags: brief.tags,
        thumbnailUrl: PLACEHOLDER_THUMB,
        audioShortUrl: PLACEHOLDER_AUDIO,
        sortOrder: brief.sortOrder,
      },
    });
    log(`  [${brief.domain}] ${brief.title}`);

    // Create a placeholder transcript for each audit brief
    await prisma.transcript.create({
      data: {
        auditBriefId: created.id,
        fullText: `This is a transcript for "${brief.title}". ${brief.description}`,
        segments: JSON.stringify([
          { start: 0, end: 5, text: `Welcome to this bulletin on ${brief.title.toLowerCase()}.` },
          { start: 5, end: 10, text: brief.description },
        ]),
        transcriptType: 'short',
      },
    });
  }
  log(`  Created ${AUDIT_BRIEFS.length} audit briefs with transcripts.`);
}

/**
 * Seeds learning graphs with linked episodes.
 */
async function seedLearningGraphs() {
  log('\nSeeding learning graphs...');
  const existingCount = await prisma.learningGraph.count();
  if (existingCount > 0) {
    log(`  ${existingCount} learning graphs already exist — skipping.`);
    return;
  }

  for (const graph of LEARNING_GRAPHS) {
    const createdGraph = await prisma.learningGraph.create({
      data: {
        title: graph.title,
        description: graph.description,
        domain: graph.domain,
        pathType: 'linear',
        isPublished: true,
      },
    });
    log(`  [${graph.domain}] ${graph.title}`);

    const createdEpisodes = [];
    for (let i = 0; i < graph.episodes.length; i++) {
      const ep = graph.episodes[i];
      const episode = await prisma.episode.create({
        data: {
          graphId: createdGraph.id,
          title: ep.title,
          description: ep.description,
          audioUrl: PLACEHOLDER_AUDIO,
          sortOrder: i,
          positionX: 0,
          positionY: i * 150,
        },
      });
      createdEpisodes.push(episode);
    }

    // Create edges linking episodes sequentially
    for (let i = 0; i < createdEpisodes.length - 1; i++) {
      await prisma.learningPathEdge.create({
        data: {
          graphId: createdGraph.id,
          sourceEpisodeId: createdEpisodes[i].id,
          targetEpisodeId: createdEpisodes[i + 1].id,
        },
      });
    }

    log(`    ${createdEpisodes.length} episodes, ${createdEpisodes.length - 1} edges`);
  }
}

/**
 * Main seed function — runs all seeders in order.
 */
async function main(): Promise<void> {
  log('=== The Audit Brief — Database Seed ===\n');

  log('Seeding users...');
  await seedUser(SEED_ADMIN);
  await seedUser(SEED_MEMBER);

  await seedAuditBriefs();
  await seedLearningGraphs();

  log('\n=== Seed complete ===');
  log('\nLogin credentials:');
  log(`  Admin:  ${SEED_ADMIN.email} / ${SEED_ADMIN.password}`);
  log(`  Member: ${SEED_MEMBER.email} / ${SEED_MEMBER.password}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

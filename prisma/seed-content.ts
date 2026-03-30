/**
 * Content seed script — uploads real audio, PDF, and thumbnail files
 * to Azurite and creates corresponding database records.
 *
 * Usage:
 *   npx tsx prisma/seed-content.ts
 *
 * Requires:
 * - Azurite running (docker compose up -d)
 * - .env.local with DATABASE_URL and AZURE_BLOB_CONNECTION_STRING
 * - Extracted archive at /tmp/audit-seed/Archive/
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { BlobServiceClient } from '@azure/storage-blob';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const connStr = process.env.AZURE_BLOB_CONNECTION_STRING ?? '';
const containerName = process.env.AZURE_BLOB_CONTAINER ?? 'the-audit-brief-uploads';
const blobService = BlobServiceClient.fromConnectionString(connStr);

// eslint-disable-next-line no-console
const log = console.log.bind(console);

const ARCHIVE_ROOT = '/tmp/audit-seed/Archive';

/** MIME types by extension. */
const MIME: Record<string, string> = {
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * Uploads a local file to Azurite and returns the blob key.
 */
async function uploadFile(localPath: string, blobKey: string): Promise<string> {
  const containerClient = blobService.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  const blobClient = containerClient.getBlockBlobClient(blobKey);
  const buffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';
  await blobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blobKey;
}

/**
 * Creates a simple 400x400 colored PNG thumbnail as a Buffer.
 */
function generateThumbnailPng(r: number, g: number, b: number): Buffer {
  // Minimal valid 1x1 PNG — we just need something non-empty for the seed
  const width = 1;
  const height = 1;

  // PNG file structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = c ^ buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const ihdrChunk = chunk('IHDR', ihdr);

  // IDAT — raw pixel data with zlib wrapper
  const rawRow = Buffer.from([0, r, g, b]); // filter byte + RGB
  // Minimal deflate: stored block
  const deflated = Buffer.concat([
    Buffer.from([0x78, 0x01]), // zlib header
    Buffer.from([0x01]), // final, stored
    Buffer.from([rawRow.length & 0xff, (rawRow.length >> 8) & 0xff]),
    Buffer.from([~rawRow.length & 0xff, (~rawRow.length >> 8) & 0xff]),
    rawRow,
    // Adler-32
    (() => {
      let a = 1, b2 = 0;
      for (let i = 0; i < rawRow.length; i++) {
        a = (a + rawRow[i]) % 65521;
        b2 = (b2 + a) % 65521;
      }
      const adler = Buffer.alloc(4);
      adler.writeUInt32BE((b2 << 16) | a);
      return adler;
    })(),
  ]);
  const idatChunk = chunk('IDAT', deflated);

  // IEND
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/** Domain-to-color mapping for generated thumbnails. */
const DOMAIN_THUMB_COLORS: Record<string, [number, number, number]> = {
  'Audit Methodology': [59, 130, 246],
  'Accounting and Reporting': [16, 185, 129],
  'Audit Technology': [139, 92, 246],
  'Quality and Risk': [245, 158, 11],
  'LEAP': [239, 68, 68],
  'Auditing': [20, 184, 166],
};

/**
 * Audit brief definitions — maps folder structure to database records.
 */
const BRIEFS = [
  {
    folder: 'Technical Content/2025/1. APB - 2025-08 - Audit trail - Additional FAQs',
    title: 'Audit Trail — Additional FAQs',
    description: 'Frequently asked questions on maintaining robust audit trails, covering documentation standards, digital evidence retention, and common findings from quality inspections.',
    domain: 'Audit Methodology',
    year: 2025,
    tags: ['audit trail', 'FAQ', 'documentation', 'quality inspection'],
    shortAudio: 'APB 2025 - 08 Audit trail FAQs (short).m4a',
    longAudio: 'APB 2025 - 08 Audit trail FAQs (Long).m4a',
    pdfs: [],
  },
  {
    folder: 'Technical Content/2025/2. APB - 2025-11 - Key reminders following NFRA\'s audit quality inspection',
    title: 'Key Reminders Following NFRA\'s Audit Quality Inspection',
    description: 'Summary of key findings and reminders from the National Financial Reporting Authority audit quality inspections, with practical guidance for audit teams.',
    domain: 'Quality and Risk',
    year: 2025,
    tags: ['NFRA', 'audit quality', 'inspection', 'regulatory'],
    shortAudio: 'APB 2025-11 Key reminders NFRA (short).m4a',
    longAudio: 'APB 2025-11 Key reminders NFRA (Long).m4a',
    pdfs: [],
  },
  {
    folder: 'Technical Content/2025/3. APB - 2025-12 - Current economic environment',
    title: 'Current Economic Environment — Audit Implications',
    description: 'How the current economic climate affects audit planning, risk assessment, and key areas of focus including going concern, impairment, and expected credit losses.',
    domain: 'Accounting and Reporting',
    year: 2025,
    tags: ['economic environment', 'going concern', 'impairment', 'ECL'],
    shortAudio: 'APB 2025-12 Short format.m4a',
    longAudio: 'APB 2025 -12 Current economic environment (Long).m4a',
    pdfs: [],
  },
  {
    folder: 'Technical Content/2025/4. APB - 2025-13 - Part A- Economic uncertainty GC',
    title: 'Economic Uncertainty — Part A: Going Concern',
    description: 'Practical guidance on evaluating going concern in times of economic uncertainty, including stress testing management forecasts and evaluating mitigating factors.',
    domain: 'Auditing',
    year: 2025,
    tags: ['going concern', 'economic uncertainty', 'ISA 570', 'forecasts'],
    shortAudio: 'APB 2025-13 Part A Short format.m4a',
    longAudio: 'APB 2025-13 Part A (Long).m4a',
    pdfs: [],
  },
  {
    folder: 'Technical Content/2025/5. APB - 2025-13- Part B - Economic uncertainty FV',
    title: 'Economic Uncertainty — Part B: Fair Value Measurements',
    description: 'Auditing fair value measurements under ISA 540 during periods of economic uncertainty — evaluating management assumptions, sensitivity analysis, and disclosure adequacy.',
    domain: 'Auditing',
    year: 2025,
    tags: ['fair value', 'ISA 540', 'economic uncertainty', 'estimates'],
    shortAudio: 'APB 2025-13 Part B Short format.m4a',
    longAudio: 'APB 2025-13 Part B (Long).m4a',
    pdfs: [],
  },
  {
    folder: 'Technical Content/2026/1. APB 2026-02 Audit trail - Tally',
    title: 'Audit Trail — Tally ERP Integration',
    description: 'Practical guidance on evaluating audit trails in Tally ERP environments, including data extraction techniques, completeness testing, and common control deficiencies.',
    domain: 'Audit Technology',
    year: 2026,
    tags: ['audit trail', 'Tally', 'ERP', 'data extraction'],
    shortAudio: 'APB 2026-02 Audit trail Tally (short).m4a',
    longAudio: 'APB 2026-02 Audit trail Tally (Long).m4a',
    pdfs: ['APB 2026-02.pdf'],
  },
  {
    folder: 'Technical Content/2026/2. APB 2026-03 Effective JE testing',
    title: 'Effective Journal Entry Testing',
    description: 'Step-by-step guidance on designing and executing effective journal entry testing procedures, including population completeness, risk-based selection criteria, and documentation.',
    domain: 'Audit Methodology',
    year: 2026,
    tags: ['journal entries', 'JE testing', 'fraud risk', 'data analytics'],
    shortAudio: 'APB 2026-03 JE Testing (short).m4a',
    longAudio: 'APB 2026-03 JE Testing (Long).m4a',
    pdfs: ['APB_2026-03.pdf'],
  },
  {
    folder: 'Technical Content/2026/3. APB 2026-04 Communication with TCWG',
    title: 'Communication with Those Charged with Governance',
    description: 'Requirements and best practices for communicating audit matters with those charged with governance (TCWG) under ISA 260 — including significant findings, independence, and planned scope.',
    domain: 'Audit Methodology',
    year: 2026,
    tags: ['TCWG', 'ISA 260', 'governance', 'audit communication'],
    shortAudio: 'APB 2026-04 TCWG (short).m4a',
    longAudio: 'APB 2026-04 TCWG (Long).m4a',
    pdfs: ['Practice aid.pdf'],
  },
];

/** Learning series definition. */
const LEARNING_SERIES = {
  title: 'Physical Inventory Count',
  description: 'A three-part series covering the end-to-end audit procedures for physical inventory counts — from planning and observation to evaluating count results and documentation.',
  domain: 'Auditing',
  episodes: [
    {
      title: 'Episode 1: Planning the Inventory Count Observation',
      description: 'Pre-count planning — understanding inventory systems, identifying locations, staffing, and designing count procedures.',
      audio: 'Physical Inventory Count Ep. 1.m4a',
    },
    {
      title: 'Episode 2: Performing the Count Observation',
      description: 'On-site observation procedures — test counts, cut-off testing, and handling discrepancies during the count.',
      audio: 'Physical Inventory Count Ep. 2.m4a',
    },
    {
      title: 'Episode 3: Evaluating Count Results',
      description: 'Post-count evaluation — reconciling count results, investigating variances, and documenting conclusions.',
      audio: 'Physical Inventory Count Ep. 3.m4a',
    },
  ],
};

async function main() {
  log('=== Seeding Content ===\n');

  // Seed audit briefs
  log('Uploading audit briefs...');
  for (let i = 0; i < BRIEFS.length; i++) {
    const brief = BRIEFS[i];
    const folderPath = path.join(ARCHIVE_ROOT, brief.folder);

    if (!fs.existsSync(folderPath)) {
      log(`  SKIP: folder not found — ${brief.folder}`);
      continue;
    }

    const prefix = `audit-briefs/${brief.year}/${i + 1}`;

    // Upload short audio
    const shortKey = `${prefix}/short.m4a`;
    await uploadFile(path.join(folderPath, brief.shortAudio), shortKey);

    // Upload long audio
    let longKey: string | null = null;
    const longPath = path.join(folderPath, brief.longAudio);
    if (fs.existsSync(longPath)) {
      longKey = `${prefix}/long.m4a`;
      await uploadFile(longPath, longKey);
    }

    // Upload PDFs
    const pdfKeys: string[] = [];
    for (const pdf of brief.pdfs) {
      const pdfPath = path.join(folderPath, pdf);
      if (fs.existsSync(pdfPath)) {
        const pdfKey = `${prefix}/${pdf}`;
        await uploadFile(pdfPath, pdfKey);
        pdfKeys.push(pdfKey);
      }
    }

    // Generate and upload thumbnail
    const [r, g, b2] = DOMAIN_THUMB_COLORS[brief.domain] ?? [107, 114, 128];
    const thumbPng = generateThumbnailPng(r, g, b2);
    const thumbKey = `${prefix}/thumbnail.png`;
    const containerClient = blobService.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    const thumbBlob = containerClient.getBlockBlobClient(thumbKey);
    await thumbBlob.upload(thumbPng, thumbPng.length, {
      blobHTTPHeaders: { blobContentType: 'image/png' },
    });

    // Create DB record
    await prisma.auditBrief.create({
      data: {
        title: brief.title,
        description: brief.description,
        domain: brief.domain,
        year: brief.year,
        tags: brief.tags,
        thumbnailUrl: thumbKey,
        audioShortUrl: shortKey,
        audioLongUrl: longKey,
        bulletinUrls: pdfKeys,
        sortOrder: i + 1,
      },
    });

    log(`  [${brief.domain}] ${brief.title} — ${pdfKeys.length} PDF(s)`);
  }

  // Seed learning series
  log('\nUploading learning series...');
  const seriesPrefix = 'learning-series/physical-inventory-count';

  const graph = await prisma.learningGraph.create({
    data: {
      title: LEARNING_SERIES.title,
      description: LEARNING_SERIES.description,
      domain: LEARNING_SERIES.domain,
      pathType: 'linear',
      isPublished: true,
    },
  });

  const createdEpisodes = [];
  for (let i = 0; i < LEARNING_SERIES.episodes.length; i++) {
    const ep = LEARNING_SERIES.episodes[i];
    const audioPath = path.join(ARCHIVE_ROOT, 'Learning Series/Audio', ep.audio);
    const audioKey = `${seriesPrefix}/ep-${i + 1}.m4a`;

    if (fs.existsSync(audioPath)) {
      await uploadFile(audioPath, audioKey);
    }

    const episode = await prisma.episode.create({
      data: {
        graphId: graph.id,
        title: ep.title,
        description: ep.description,
        audioUrl: audioKey,
        sortOrder: i,
        positionX: 0,
        positionY: i * 150,
      },
    });
    createdEpisodes.push(episode);
    log(`  Episode ${i + 1}: ${ep.title}`);
  }

  // Create edges
  for (let i = 0; i < createdEpisodes.length - 1; i++) {
    await prisma.learningPathEdge.create({
      data: {
        graphId: graph.id,
        sourceEpisodeId: createdEpisodes[i].id,
        targetEpisodeId: createdEpisodes[i + 1].id,
      },
    });
  }
  log(`  ${createdEpisodes.length} episodes, ${createdEpisodes.length - 1} edges`);

  log('\n=== Content seed complete ===');
  log(`  ${BRIEFS.length} audit briefs uploaded`);
  log(`  1 learning series with ${LEARNING_SERIES.episodes.length} episodes`);
}

main()
  .catch((error) => {
    console.error('Content seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

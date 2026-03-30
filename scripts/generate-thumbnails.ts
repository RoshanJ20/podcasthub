/**
 * Generate gradient thumbnails with custom SVG symbols for each bulletin.
 *
 * Each bulletin gets a unique gradient background with a white SVG icon
 * representing its topic, plus the title text at the bottom.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { BlobServiceClient } from '@azure/storage-blob';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const blobService = BlobServiceClient.fromConnectionString(
  process.env.AZURE_BLOB_CONNECTION_STRING ?? ''
);
const containerName = process.env.AZURE_BLOB_CONTAINER ?? 'the-audit-brief-uploads';

const WIDTH = 800;
const HEIGHT = 800;

/** SVG symbols — each is a white icon centered in a 200x200 viewbox */
const SYMBOLS: Record<string, string> = {
  // Economic/Chart — for "Current Economic Environment"
  economy: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <g fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M30 160 L30 40"/>
      <path d="M30 160 L170 160"/>
      <polyline points="50,130 80,90 110,110 140,60 170,80" stroke-width="5"/>
      <circle cx="50" cy="130" r="5" fill="rgba(255,255,255,0.9)"/>
      <circle cx="80" cy="90" r="5" fill="rgba(255,255,255,0.9)"/>
      <circle cx="110" cy="110" r="5" fill="rgba(255,255,255,0.9)"/>
      <circle cx="140" cy="60" r="5" fill="rgba(255,255,255,0.9)"/>
      <circle cx="170" cy="80" r="5" fill="rgba(255,255,255,0.9)"/>
      <path d="M140,60 L155,50 L165,65" stroke-width="3"/>
    </g>
  </svg>`,

  // Scale/Balance — for "Fair Value Measurements"
  fairValue: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <g fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <line x1="100" y1="30" x2="100" y2="170"/>
      <line x1="100" y1="170" x2="70" y2="170"/>
      <line x1="100" y1="170" x2="130" y2="170"/>
      <line x1="40" y1="60" x2="160" y2="60"/>
      <circle cx="100" cy="30" r="8" fill="rgba(255,255,255,0.2)"/>
      <path d="M40,60 L25,110 Q40,135 55,110 Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)"/>
      <path d="M160,60 L145,110 Q160,135 175,110 Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)"/>
    </g>
  </svg>`,

  // Clipboard/Checklist — for "Effective Journal Entry Testing"
  journalEntry: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <g fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="45" y="35" width="110" height="140" rx="8" fill="rgba(255,255,255,0.1)"/>
      <rect x="75" y="25" width="50" height="20" rx="4" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.9)"/>
      <polyline points="65,80 75,90 95,70" stroke-width="5"/>
      <line x1="105" y1="80" x2="140" y2="80"/>
      <polyline points="65,110 75,120 95,100" stroke-width="5"/>
      <line x1="105" y1="110" x2="140" y2="110"/>
      <rect x="65" y="130" width="12" height="12" rx="2" fill="rgba(255,255,255,0.1)"/>
      <line x1="105" y1="136" x2="140" y2="136"/>
    </g>
  </svg>`,

  // Speech bubbles — for "Communication with TCWG"
  communication: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <g fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M30,50 Q30,30 50,30 L120,30 Q140,30 140,50 L140,90 Q140,110 120,110 L70,110 L45,135 L50,110 L50,110 Q30,110 30,90 Z" fill="rgba(255,255,255,0.12)"/>
      <path d="M60,120 L60,130 Q60,150 80,150 L150,150 Q170,150 170,130 L170,90 Q170,70 150,70 L145,70" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.7)"/>
      <line x1="55" y1="55" x2="115" y2="55" stroke-width="3" opacity="0.7"/>
      <line x1="55" y1="72" x2="100" y2="72" stroke-width="3" opacity="0.7"/>
      <line x1="55" y1="89" x2="85" y2="89" stroke-width="3" opacity="0.7"/>
    </g>
  </svg>`,

  // Warning triangle — for "Going Concern"
  goingConcern: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <g fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M100,30 L175,160 L25,160 Z" fill="rgba(255,255,255,0.1)" stroke-width="5"/>
      <line x1="100" y1="70" x2="100" y2="115" stroke-width="6"/>
      <circle cx="100" cy="138" r="6" fill="rgba(255,255,255,0.9)"/>
    </g>
  </svg>`,

  // Trail/Footprints — for "Audit Trail — Additional FAQs"
  auditTrailFaq: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <g fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="100" cy="100" r="60" fill="rgba(255,255,255,0.08)" stroke-width="3"/>
      <text x="80" y="90" font-family="serif" font-size="60" font-weight="bold" fill="rgba(255,255,255,0.9)" stroke="none">?</text>
      <path d="M40,40 L55,55" stroke-width="3" opacity="0.5"/>
      <path d="M160,40 L145,55" stroke-width="3" opacity="0.5"/>
      <path d="M40,160 L55,145" stroke-width="3" opacity="0.5"/>
      <path d="M160,160 L145,145" stroke-width="3" opacity="0.5"/>
      <path d="M30,170 Q50,140 60,165 Q70,185 90,175" stroke-width="3" opacity="0.4" stroke-dasharray="5,5"/>
    </g>
  </svg>`,

  // Gear/Integration — for "Audit Trail — Tally ERP Integration"
  tallyIntegration: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <g fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="75" cy="100" r="25" fill="rgba(255,255,255,0.1)"/>
      <circle cx="75" cy="100" r="10"/>
      <path d="M75,70 L75,62 M75,130 L75,138 M45,100 L37,100 M105,100 L113,100 M54,79 L48,73 M96,121 L102,127 M54,121 L48,127 M96,79 L102,73" stroke-width="5"/>
      <circle cx="140" cy="100" r="18" fill="rgba(255,255,255,0.1)"/>
      <circle cx="140" cy="100" r="7"/>
      <path d="M140,78 L140,72 M140,122 L140,128 M118,100 L112,100 M162,100 L168,100" stroke-width="4"/>
      <line x1="100" y1="100" x2="122" y2="100" stroke-width="3" stroke-dasharray="4,3"/>
    </g>
  </svg>`,

  // Shield/Magnifying glass — for "NFRA Audit Quality Inspection"
  nfra: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <g fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M100,25 L155,50 L155,100 Q155,155 100,180 Q45,155 45,100 L45,50 Z" fill="rgba(255,255,255,0.1)" stroke-width="4"/>
      <circle cx="95" cy="95" r="28" stroke-width="4"/>
      <line x1="115" y1="115" x2="140" y2="140" stroke-width="6"/>
      <polyline points="80,95 90,105 112,78" stroke-width="4"/>
    </g>
  </svg>`,
};

/** Map each bulletin to a gradient file and symbol */
const BULLETIN_CONFIG = [
  {
    titleMatch: 'Current Economic',
    gradient: 'Blue Light Photo.jpg',
    symbol: 'economy',
  },
  {
    titleMatch: 'Part B',
    gradient: 'Purple Color Gradient.jpg',
    symbol: 'fairValue',
  },
  {
    titleMatch: 'Effective Journal',
    gradient: 'Green Gradient Stock Photo.jpg',
    symbol: 'journalEntry',
  },
  {
    titleMatch: 'Communication',
    gradient: 'Pastel Color Gradient.jpg',
    symbol: 'communication',
  },
  {
    titleMatch: 'Part A',
    gradient: 'Gradient Yellow Photo.jpg',
    symbol: 'goingConcern',
  },
  {
    titleMatch: 'Additional FAQs',
    gradient: 'Yellow Blue Gradient Photo.jpg',
    symbol: 'auditTrailFaq',
  },
  {
    titleMatch: 'Tally',
    gradient: 'Colorful Blue Lights Abstract.jpg',
    symbol: 'tallyIntegration',
  },
  {
    titleMatch: 'NFRA',
    gradient: 'Gradient Wallpaper.jpg',
    symbol: 'nfra',
  },
];

const GRADIENTS_DIR = '/tmp/gradients';
const OUTPUT_DIR = '/tmp/thumbnails-out';

async function generateThumbnail(
  gradientFile: string,
  symbolKey: string,
  outputFile: string
): Promise<void> {
  const gradientPath = path.join(GRADIENTS_DIR, gradientFile);
  const svgSymbol = SYMBOLS[symbolKey];

  // Resize gradient to target dimensions
  const base = await sharp(gradientPath)
    .resize(WIDTH, HEIGHT, { fit: 'cover' })
    .toBuffer();

  // Create SVG overlay with the symbol centered
  const overlayWidth = 280;
  const overlayHeight = 280;
  const overlayX = (WIDTH - overlayWidth) / 2;
  const overlayY = (HEIGHT - overlayHeight) / 2 - 20;

  // Scale the 200x200 symbol into the overlay area
  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="rgba(0,0,0,0.35)"/>
        </filter>
      </defs>
      <g transform="translate(${overlayX},${overlayY}) scale(${overlayWidth / 200})" filter="url(#shadow)">
        ${svgSymbol.replace(/<svg[^>]*>/, '').replace('</svg>', '')}
      </g>
    </svg>
  `);

  await sharp(base)
    .composite([{ input: overlay, blend: 'over' }])
    .jpeg({ quality: 90 })
    .toFile(outputFile);
}

async function uploadToBlob(localPath: string, blobKey: string): Promise<void> {
  const containerClient = blobService.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  const buf = fs.readFileSync(localPath);
  await containerClient
    .getBlockBlobClient(blobKey)
    .upload(buf, buf.length, {
      blobHTTPHeaders: { blobContentType: 'image/jpeg' },
    });
}

async function main(): Promise<void> {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const config of BULLETIN_CONFIG) {
    const outputFile = path.join(
      OUTPUT_DIR,
      `${config.symbol}-thumbnail.jpg`
    );

    console.log(`[gen] ${config.symbol} from ${config.gradient}`);
    await generateThumbnail(config.gradient, config.symbol, outputFile);

    const blobKey = `covers/gradient-${config.symbol}.jpg`;
    console.log(`[upload] ${blobKey}`);
    await uploadToBlob(outputFile, blobKey);

    const brief = await prisma.auditBrief.findFirst({
      where: { title: { contains: config.titleMatch } },
      select: { id: true, title: true },
    });

    if (brief) {
      await prisma.auditBrief.update({
        where: { id: brief.id },
        data: { thumbnailUrl: blobKey },
      });
      console.log(`[db] ${brief.title} -> ${blobKey}`);
    } else {
      console.log(`[skip] No brief matching: ${config.titleMatch}`);
    }
  }

  await prisma.$disconnect();
  console.log('\nDone! All thumbnails generated and uploaded.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

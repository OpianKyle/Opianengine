import { readFileSync } from 'fs';
import path from 'path';

// Simple Opian logo SVG
const OPIAN_LOGO_SVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="200" height="80" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="80" fill="transparent"/>
  <text x="20" y="45" font-family="Arial" font-size="30" fill="white">OPIAN</text>
  <text x="20" y="70" font-family="Arial" font-size="20" fill="white">REWARDS</text>
</svg>`;

// Simple signature as a black line
const SIGNATURE_SVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="140" height="50" xmlns="http://www.w3.org/2000/svg">
  <path d="M10,35 C20,10 40,40 60,10 C80,40 100,10 130,30" stroke="black" stroke-width="2" fill="none" />
</svg>`;

// Base64 encodings
export const OPIAN_LOGO_BASE64 = `data:image/svg+xml;base64,${Buffer.from(OPIAN_LOGO_SVG).toString('base64')}`;
export const SIGNATURE_BASE64 = `data:image/svg+xml;base64,${Buffer.from(SIGNATURE_SVG).toString('base64')}`;

// Small transparent 1x1 pixel PNG for placeholder
export const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
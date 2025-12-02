/**
 * Tests for multi-format audio metadata service
 * 
 * Run with: npx tsx tests/metadata.test.ts
 */

import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import wavefile from 'wavefile';
import { writeFile } from 'fs/promises';
import {
  readMetadata,
  writeMetadata,
  updateMetadata,
  detectFormat,
  buildMetadataFromTake,
  hasVofoundryMetadata,
  type VofoundryMetadata,
} from '../src/services/audio/metadata.js';

const { WaveFile } = wavefile;
const execFileAsync = promisify(execFile);

let tempDir: string;

async function setup() {
  tempDir = await mkdtemp(join(tmpdir(), 'metadata-test-'));
  console.log('Test temp dir:', tempDir);
}

async function teardown() {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
}

// ============================================================================
// Test file creators
// ============================================================================

/** Create a real WAV file using wavefile */
async function createTestWav(filename: string): Promise<string> {
  const filePath = join(tempDir, filename);
  const wav = new WaveFile();
  wav.fromScratch(1, 44100, '16', new Int16Array(4410)); // 0.1s silence
  await writeFile(filePath, Buffer.from(wav.toBuffer()));
  return filePath;
}

/** Create a real MP3 file using ffmpeg */
async function createTestMp3(filename: string): Promise<string> {
  const filePath = join(tempDir, filename);
  await execFileAsync('ffmpeg', [
    '-f', 'lavfi',
    '-i', 'anullsrc=r=44100:cl=mono',
    '-t', '0.1',
    '-c:a', 'libmp3lame',
    '-b:a', '128k',
    '-y',
    filePath
  ]);
  return filePath;
}

/** Create a real FLAC file using ffmpeg */
async function createTestFlac(filename: string): Promise<string> {
  const filePath = join(tempDir, filename);
  await execFileAsync('ffmpeg', [
    '-f', 'lavfi',
    '-i', 'anullsrc=r=44100:cl=mono',
    '-t', '0.1',
    '-c:a', 'flac',
    '-y',
    filePath
  ]);
  return filePath;
}

// ============================================================================
// Tests
// ============================================================================

async function test_detectFormat() {
  console.log('\n--- test_detectFormat ---');
  
  const wavPath = await createTestWav('detect.wav');
  const mp3Path = await createTestMp3('detect.mp3');
  const flacPath = await createTestFlac('detect.flac');
  
  const wavFormat = await detectFormat(wavPath);
  const mp3Format = await detectFormat(mp3Path);
  const flacFormat = await detectFormat(flacPath);
  
  console.log('WAV detected as:', wavFormat);
  console.log('MP3 detected as:', mp3Format);
  console.log('FLAC detected as:', flacFormat);
  
  if (wavFormat !== 'wav') throw new Error(`Expected wav, got ${wavFormat}`);
  if (mp3Format !== 'mp3') throw new Error(`Expected mp3, got ${mp3Format}`);
  if (flacFormat !== 'flac') throw new Error(`Expected flac, got ${flacFormat}`);
  
  console.log('✓ detectFormat passed');
}

async function test_wavMetadata() {
  console.log('\n--- test_wavMetadata (RIFF INFO tags) ---');
  
  const inputPath = await createTestWav('input.wav');
  const outputPath = join(tempDir, 'output.wav');
  
  const metadata: Partial<VofoundryMetadata> = {
    id: 'take-wav-123',
    content_id: 'content-wav-456',
    actor_id: 'actor-wav-789',
    section_id: 'section-wav-abc',
    content_type: 'dialogue',
    cue_id: 'hello_world',
    actor_name: 'Tim Actor',
    section_name: 'Combat Dialog',
    take_number: '3',
    status: 'approved',
    prompt: 'Hello there, friend!',
    generated_by: 'elevenlabs',
    voice_id: 'voice-xyz',
    created_at: '2025-12-02',
    updated_at: '2025-12-02T08:00:00Z',
  };
  
  await writeMetadata(inputPath, outputPath, metadata);
  console.log('Wrote WAV metadata');
  
  const read = await readMetadata(outputPath);
  console.log('Read back:', read);
  
  // Verify key fields
  if (read.id !== metadata.id) throw new Error(`id mismatch: ${read.id}`);
  if (read.cue_id !== metadata.cue_id) throw new Error(`cue_id mismatch: ${read.cue_id}`);
  if (read.actor_name !== metadata.actor_name) throw new Error(`actor_name mismatch: ${read.actor_name}`);
  if (read.prompt !== metadata.prompt) throw new Error(`prompt mismatch: ${read.prompt}`);
  if (read.status !== metadata.status) throw new Error(`status mismatch: ${read.status}`);
  
  console.log('✓ wavMetadata passed');
}

async function test_mp3Metadata() {
  console.log('\n--- test_mp3Metadata (ID3 tags) ---');
  
  const inputPath = await createTestMp3('input.mp3');
  const outputPath = join(tempDir, 'output.mp3');
  
  const metadata: Partial<VofoundryMetadata> = {
    id: 'take-mp3-123',
    content_id: 'content-mp3-456',
    actor_id: 'actor-mp3-789',
    section_id: 'section-mp3-abc',
    content_type: 'music',
    cue_id: 'battle_theme',
    actor_name: 'Composer Bot',
    section_name: 'Music Cues',
    take_number: '1',
    status: 'new',
    prompt: 'Epic battle music',
    generated_by: 'elevenlabs',
    created_at: '2025-12-02',
    updated_at: '2025-12-02T08:00:00Z',
  };
  
  await writeMetadata(inputPath, outputPath, metadata);
  console.log('Wrote MP3 metadata');
  
  const read = await readMetadata(outputPath);
  console.log('Read back:', read);
  
  // Verify key fields
  if (read.id !== metadata.id) throw new Error(`id mismatch: ${read.id}`);
  if (read.cue_id !== metadata.cue_id) throw new Error(`cue_id mismatch: ${read.cue_id}`);
  if (read.status !== metadata.status) throw new Error(`status mismatch: ${read.status}`);
  
  console.log('✓ mp3Metadata passed');
}

async function test_flacMetadata() {
  console.log('\n--- test_flacMetadata (Vorbis comments) ---');
  
  const inputPath = await createTestFlac('input.flac');
  const outputPath = join(tempDir, 'output.flac');
  
  const metadata: Partial<VofoundryMetadata> = {
    id: 'take-flac-123',
    content_id: 'content-flac-456',
    actor_id: 'actor-flac-789',
    section_id: 'section-flac-abc',
    content_type: 'sfx',
    cue_id: 'explosion',
    actor_name: 'SFX Library',
    section_name: 'Combat SFX',
    take_number: '2',
    status: 'rejected',
    prompt: 'Big explosion sound',
    generated_by: 'manual',
    created_at: '2025-12-02',
    updated_at: '2025-12-02T08:00:00Z',
  };
  
  await writeMetadata(inputPath, outputPath, metadata);
  console.log('Wrote FLAC metadata');
  
  const read = await readMetadata(outputPath);
  console.log('Read back:', read);
  
  // Verify key fields
  if (read.id !== metadata.id) throw new Error(`id mismatch: ${read.id}`);
  if (read.cue_id !== metadata.cue_id) throw new Error(`cue_id mismatch: ${read.cue_id}`);
  if (read.status !== metadata.status) throw new Error(`status mismatch: ${read.status}`);
  
  console.log('✓ flacMetadata passed');
}

async function test_updateMetadata() {
  console.log('\n--- test_updateMetadata ---');
  
  const filePath = await createTestWav('update.wav');
  
  // Write initial metadata
  await writeMetadata(filePath, filePath, {
    id: 'take-update-test',
    content_id: 'content-1',
    actor_id: 'actor-1',
    section_id: 'section-1',
    content_type: 'dialogue',
    cue_id: 'test_cue',
    status: 'new',
    take_number: '1',
    created_at: '2025-12-02',
    updated_at: '2025-12-02',
  });
  
  let read = await readMetadata(filePath);
  if (read.status !== 'new') throw new Error('initial status should be new');
  console.log('Initial status:', read.status);
  
  // Update just the status
  await updateMetadata(filePath, {
    status: 'approved',
    updated_at: '2025-12-02T09:00:00Z',
  });
  
  read = await readMetadata(filePath);
  if (read.status !== 'approved') throw new Error('status should be approved');
  if (read.id !== 'take-update-test') throw new Error('id should be preserved');
  if (read.cue_id !== 'test_cue') throw new Error('cue_id should be preserved');
  console.log('After update - status:', read.status, 'id:', read.id);
  
  console.log('✓ updateMetadata passed');
}

async function test_hasVofoundryMetadata() {
  console.log('\n--- test_hasVofoundryMetadata ---');
  
  // File without metadata
  const plainFile = await createTestWav('plain.wav');
  const hasPlain = await hasVofoundryMetadata(plainFile);
  if (hasPlain) throw new Error('plain file should not have metadata');
  console.log('Plain file has metadata:', hasPlain);
  
  // File with metadata
  const taggedFile = await createTestWav('tagged.wav');
  await writeMetadata(taggedFile, taggedFile, {
    id: 'tagged-test',
    content_id: 'c1',
    actor_id: 'a1',
    section_id: 's1',
    content_type: 'dialogue',
    cue_id: 'test',
    status: 'new',
    take_number: '1',
    created_at: '2025-12-02',
    updated_at: '2025-12-02',
  });
  const hasTagged = await hasVofoundryMetadata(taggedFile);
  if (!hasTagged) throw new Error('tagged file should have metadata');
  console.log('Tagged file has metadata:', hasTagged);
  
  console.log('✓ hasVofoundryMetadata passed');
}

async function test_buildMetadataFromTake() {
  console.log('\n--- test_buildMetadataFromTake ---');
  
  const take = {
    id: 'take-build-test',
    content_id: 'content-build',
    take_number: 3,
    status: 'approved' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    generated_by: 'elevenlabs' as const,
    generation_params: {
      voice_id: 'voice-123',
      model_id: 'model-456',
      stability: 0.5,
      similarity_boost: 0.75,
    },
  };
  
  const content = {
    id: 'content-build',
    actor_id: 'actor-build',
    section_id: 'section-build',
    content_type: 'dialogue',
    cue_id: 'test_cue',
    prompt: 'Test prompt',
  };
  
  const context = {
    actor_name: 'Tim',
    section_name: 'Main Dialog',
  };
  
  const metadata = buildMetadataFromTake(take, content, context);
  
  if (metadata.id !== take.id) throw new Error('id mismatch');
  if (metadata.take_number !== '3') throw new Error('take_number should be "3"');
  if (metadata.actor_name !== 'Tim') throw new Error('actor_name mismatch');
  if (metadata.voice_id !== 'voice-123') throw new Error('voice_id mismatch');
  if (metadata.stability !== '0.5') throw new Error('stability mismatch');
  
  console.log('Built metadata:', metadata);
  console.log('✓ buildMetadataFromTake passed');
}

async function test_mislabeledMp3AsWav() {
  console.log('\n--- test_mislabeledMp3AsWav (like ElevenLabs) ---');
  
  // Create an MP3 but save with .wav extension (like ElevenLabs does)
  // Use -f mp3 to force MP3 output format regardless of extension
  const mislabeledPath = join(tempDir, 'elevenlabs_output.wav');
  await execFileAsync('ffmpeg', [
    '-f', 'lavfi',
    '-i', 'anullsrc=r=44100:cl=mono',
    '-t', '0.1',
    '-c:a', 'libmp3lame',
    '-b:a', '128k',
    '-f', 'mp3',  // Force MP3 format
    '-y',
    mislabeledPath
  ]);
  
  // Should detect as MP3 despite .wav extension
  const format = await detectFormat(mislabeledPath);
  console.log('Mislabeled file detected as:', format);
  if (format !== 'mp3') throw new Error(`Expected mp3, got ${format}`);
  
  // Should still be able to write/read metadata
  const metadata: Partial<VofoundryMetadata> = {
    id: 'take-mislabeled',
    content_id: 'content-1',
    actor_id: 'actor-1',
    section_id: 'section-1',
    content_type: 'dialogue',
    cue_id: 'hello',
    status: 'new',
    take_number: '1',
    created_at: '2025-12-02',
    updated_at: '2025-12-02',
  };
  
  await writeMetadata(mislabeledPath, mislabeledPath, metadata);
  const read = await readMetadata(mislabeledPath);
  console.log('Read from mislabeled file:', read);
  
  if (read.id !== metadata.id) throw new Error(`id mismatch: expected ${metadata.id}, got ${read.id}`);
  console.log('Successfully wrote/read metadata on mislabeled file');
  
  console.log('✓ mislabeledMp3AsWav passed');
}

// ============================================================================
// Run all tests
// ============================================================================

async function runTests() {
  try {
    await setup();
    
    await test_detectFormat();
    await test_wavMetadata();
    await test_mp3Metadata();
    await test_flacMetadata();
    await test_updateMetadata();
    await test_hasVofoundryMetadata();
    await test_buildMetadataFromTake();
    await test_mislabeledMp3AsWav();
    
    console.log('\n========================================');
    console.log('All metadata tests passed! ✓');
    console.log('========================================\n');
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  } finally {
    await teardown();
  }
}

runTests();

/**
 * File Upload URLs API Route
 *
 * Gets presigned S3 URLs for file uploads. This allows the client
 * to upload files directly to S3 without exposing your API key.
 *
 * Files are project resources, so no session is needed to upload one.
 */

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getOctavusClient, toErrorResponse } from '@/lib/octavus';

const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mediaType: z.string().min(1),
  size: z.number().int().positive(),
});

const uploadUrlsRequestSchema = z.object({
  files: z.array(fileUploadSchema).min(1).max(20),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = uploadUrlsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const client = getOctavusClient();
    const result = await client.files.create(parsed.data.files);
    return Response.json(result);
  } catch (error) {
    console.error('Upload URLs error:', error);
    return toErrorResponse(error, 'Failed to get upload URLs');
  }
}

import { handleTimetableUpload } from '@/lib/storage/upload-api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = (request: Request) => handleTimetableUpload(request, 'confirm');

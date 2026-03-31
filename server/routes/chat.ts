import 'dotenv/config';
import { Router, type Request, Response } from 'express';
import { db } from '../db.js';
import { neon } from '@neondatabase/serverless';
import { chatMessages } from '../../drizzle/schema.js';
import { eq, isNull, and, or, desc } from 'drizzle-orm';
import { getWorkspaceId } from '../utils/workspace.js';
import { authenticateToken } from '../auth/middleware.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/pdf',
      'image/png',
      'image/jpeg',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .xlsx, .xls, .doc, .docx, .pdf, .png, .jpg are allowed.'));
    }
  },
});

const router = Router();

const sql = neon(process.env.DATABASE_URL || '');

// GET /api/chat/messages?workspaceId=xxx
router.get('/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { workspaceId: queryWorkspaceId } = req.query;

    console.log('[Chat] GET messages', {
      workspaceId,
      queryWorkspaceId,
      userRole: req.user?.role,
      userId: req.user?.userId
    });

    let messages: any[];

    if (workspaceId) {
      // Workspace user: only see messages for their workspace or global (NULL)
      const condition = queryWorkspaceId
        ? eq(chatMessages.workspaceId, queryWorkspaceId as string)
        : or(
            eq(chatMessages.workspaceId, workspaceId),
            isNull(chatMessages.workspaceId)
          );
      messages = await db
        .select()
        .from(chatMessages)
        .where(condition)
        .orderBy(chatMessages.createdAt);
    } else {
      // Super admin: see all messages, optionally filter by workspaceId
      if (queryWorkspaceId) {
        messages = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.workspaceId, queryWorkspaceId as string))
          .orderBy(chatMessages.createdAt);
      } else {
        messages = await db
          .select()
          .from(chatMessages)
          .orderBy(chatMessages.createdAt);
      }
    }

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages', details: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/chat/messages
router.post('/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { message, workspaceId: targetWorkspaceId, fileUrl, fileName, fileType } = req.body;
    const userWorkspaceId = getWorkspaceId(req);

    console.log('[Chat] POST message', {
      targetWorkspaceId,
      userWorkspaceId,
      userRole: req.user?.role,
      userId: req.user?.userId,
      messagePreview: message?.substring(0, 50),
      hasFile: !!fileUrl
    });

    if (!message && !fileUrl) {
      res.status(400).json({ error: 'Message or file is required' });
      return;
    }

    // Get sender info from profiles table
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Fetch profile to get name and role
    const profileResult = await sql`SELECT name_vn, role FROM profiles WHERE id = ${userId}`;
    const profile = profileResult[0];

    if (!profile) {
      res.status(401).json({ error: 'Profile not found' });
      return;
    }

    // Determine workspaceId for the message
    // - Super admin without impersonating: can send to specific workspace or NULL (global)
    // - Workspace user: message goes to their workspace automatically
    // - Super admin impersonating: message goes to the impersonated workspace
    let finalWorkspaceId: string | null = null;

    if (userWorkspaceId) {
      // User has a workspace - message stays within their workspace
      finalWorkspaceId = userWorkspaceId;
    } else if (req.user?.role === 'super_admin' && targetWorkspaceId !== undefined) {
      // Super admin sending to specific workspace or global (NULL)
      finalWorkspaceId = targetWorkspaceId || null;
    }

    console.log('[Chat] Message will be saved with workspaceId:', finalWorkspaceId);

    const messageId = crypto.randomUUID();
    const newMessage = {
      id: messageId,
      workspaceId: finalWorkspaceId,
      senderId: userId,
      senderName: profile.name_vn,
      senderRole: profile.role,
      message: message || '',
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileType: fileType || null,
      createdAt: new Date(),
    };

    await db.insert(chatMessages).values(newMessage);

    res.status(201).json(newMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message', details: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/chat/upload - Upload file
router.post('/upload', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;

    res.status(201).json({ url: fileUrl, fileName, fileType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload file', details: err instanceof Error ? err.message : String(err) });
  }
});

export default router;

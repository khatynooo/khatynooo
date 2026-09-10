/**
 * مخزن دسترسی به داده‌های انتشار چندکاناله در PostgreSQL
 * (Multi-Channel Publication Database Repository)
 */

import { query, withTransaction } from '../dbClient';
import {
  PublicationChannel,
  PublicationChannelConfig,
  PublicationProvider,
  PublicationEvent,
  PublicationStatus,
  ProductPublicationRecord,
  PublicationSettings,
} from './publicationTypes';

/**
 * ماسک‌کردن توکن‌ها و کلیدهای محرمانه برای جلوگیری اکید از نشت سکرت‌ها به فرانت‌اند
 */
export function maskChannelSecrets(channel: any): PublicationChannel {
  const config = { ...(channel.config || {}) };
  const rawToken = config.token || config.accessToken || '';
  const tokenConfigured = Boolean(rawToken && rawToken.trim().length > 0);

  let tokenMasked = '';
  if (tokenConfigured) {
    const visible = rawToken.slice(-4);
    tokenMasked = `••••••••${visible}`;
  }

  // حذف فیلدهای حساس خام در خروجی ارسالی به کلاینت
  delete config.token;
  delete config.accessToken;
  delete config.password;
  delete config.secret;

  return {
    id: channel.id,
    provider: channel.provider,
    name: channel.name,
    enabled: Boolean(channel.enabled),
    config,
    createdAt: channel.created_at,
    updatedAt: channel.updated_at,
    tokenConfigured,
    tokenMasked,
  };
}

export async function getChannels(): Promise<PublicationChannel[]> {
  const res = await query(
    `SELECT * FROM publication_channels ORDER BY 
     CASE provider 
       WHEN 'website' THEN 1 
       WHEN 'eitaa' THEN 2 
       WHEN 'bale' THEN 3 
       WHEN 'telegram' THEN 4 
       WHEN 'instagram' THEN 5 
       ELSE 6 
     END`
  );
  return res.rows.map(maskChannelSecrets);
}

export async function getRawChannelById(id: string): Promise<any | null> {
  const res = await query('SELECT * FROM publication_channels WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getRawChannelByProvider(provider: PublicationProvider): Promise<any | null> {
  const res = await query('SELECT * FROM publication_channels WHERE provider = $1', [provider]);
  return res.rows[0] || null;
}

export async function createChannel(data: {
  id: string;
  provider: PublicationProvider;
  name: string;
  enabled?: boolean;
  config?: PublicationChannelConfig;
}): Promise<PublicationChannel> {
  const res = await query(
    `INSERT INTO publication_channels (id, provider, name, enabled, config, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
     RETURNING *`,
    [
      data.id,
      data.provider,
      data.name,
      data.enabled !== undefined ? data.enabled : true,
      JSON.stringify(data.config || {}),
    ]
  );
  return maskChannelSecrets(res.rows[0]);
}

export async function updateChannel(
  id: string,
  updates: {
    name?: string;
    enabled?: boolean;
    config?: Partial<PublicationChannelConfig>;
  }
): Promise<PublicationChannel | null> {
  const existing = await getRawChannelById(id);
  if (!existing) return null;

  let mergedConfig = { ...(existing.config || {}) };
  if (updates.config) {
    // اگر در فرانت‌اند توکن تغییر نکرده باشد (خالی ارسال شده)، توکن قبلی حفظ می‌شود
    const newConfig = { ...updates.config };
    if (!newConfig.token && !newConfig.accessToken && (mergedConfig.token || mergedConfig.accessToken)) {
      if (mergedConfig.token) newConfig.token = mergedConfig.token;
      if (mergedConfig.accessToken) newConfig.accessToken = mergedConfig.accessToken;
    }
    mergedConfig = { ...mergedConfig, ...newConfig };
  }

  const res = await query(
    `UPDATE publication_channels 
     SET name = COALESCE($1, name),
         enabled = COALESCE($2, enabled),
         config = $3::jsonb,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [
      updates.name !== undefined ? updates.name : null,
      updates.enabled !== undefined ? updates.enabled : null,
      JSON.stringify(mergedConfig),
      id,
    ]
  );

  return maskChannelSecrets(res.rows[0]);
}

export async function deleteChannel(id: string): Promise<boolean> {
  const res = await query('DELETE FROM publication_channels WHERE id = $1', [id]);
  return (res.rowCount || 0) > 0;
}

export async function getSettings(): Promise<PublicationSettings> {
  const res = await query('SELECT * FROM publication_settings WHERE id = $1', ['default']);
  if (res.rows.length === 0) {
    return {
      id: 'default',
      publishOnCreate: false,
      publishOnUpdate: false,
      publishOnPriceChange: false,
      publishOnRestock: false,
      sendImageByDefault: true,
      generateHashtagsByDefault: true,
      defaultTemplate: '',
      updatedAt: new Date().toISOString(),
    };
  }
  const row = res.rows[0];
  return {
    id: row.id,
    publishOnCreate: Boolean(row.publish_on_create),
    publishOnUpdate: Boolean(row.publish_on_update),
    publishOnPriceChange: Boolean(row.publish_on_price_change),
    publishOnRestock: Boolean(row.publish_on_restock),
    sendImageByDefault: Boolean(row.send_image_by_default),
    generateHashtagsByDefault: Boolean(row.generate_hashtags_by_default),
    defaultTemplate: row.default_template || '',
    updatedAt: row.updated_at,
  };
}

export async function updateSettings(
  updates: Partial<PublicationSettings>
): Promise<PublicationSettings> {
  const current = await getSettings();

  const publishOnCreate = updates.publishOnCreate !== undefined ? updates.publishOnCreate : current.publishOnCreate;
  const publishOnUpdate = updates.publishOnUpdate !== undefined ? updates.publishOnUpdate : current.publishOnUpdate;
  const publishOnPriceChange = updates.publishOnPriceChange !== undefined ? updates.publishOnPriceChange : current.publishOnPriceChange;
  const publishOnRestock = updates.publishOnRestock !== undefined ? updates.publishOnRestock : current.publishOnRestock;
  const sendImageByDefault = updates.sendImageByDefault !== undefined ? updates.sendImageByDefault : current.sendImageByDefault;
  const generateHashtagsByDefault = updates.generateHashtagsByDefault !== undefined ? updates.generateHashtagsByDefault : current.generateHashtagsByDefault;
  const defaultTemplate = updates.defaultTemplate !== undefined ? updates.defaultTemplate : current.defaultTemplate;

  const res = await query(
    `INSERT INTO publication_settings (
       id, publish_on_create, publish_on_update, publish_on_price_change, publish_on_restock,
       send_image_by_default, generate_hashtags_by_default, default_template, updated_at
     ) VALUES ('default', $1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (id) DO UPDATE SET
       publish_on_create = EXCLUDED.publish_on_create,
       publish_on_update = EXCLUDED.publish_on_update,
       publish_on_price_change = EXCLUDED.publish_on_price_change,
       publish_on_restock = EXCLUDED.publish_on_restock,
       send_image_by_default = EXCLUDED.send_image_by_default,
       generate_hashtags_by_default = EXCLUDED.generate_hashtags_by_default,
       default_template = EXCLUDED.default_template,
       updated_at = NOW()
     RETURNING *`,
    [
      publishOnCreate,
      publishOnUpdate,
      publishOnPriceChange,
      publishOnRestock,
      sendImageByDefault,
      generateHashtagsByDefault,
      defaultTemplate,
    ]
  );

  const row = res.rows[0];
  return {
    id: row.id,
    publishOnCreate: Boolean(row.publish_on_create),
    publishOnUpdate: Boolean(row.publish_on_update),
    publishOnPriceChange: Boolean(row.publish_on_price_change),
    publishOnRestock: Boolean(row.publish_on_restock),
    sendImageByDefault: Boolean(row.send_image_by_default),
    generateHashtagsByDefault: Boolean(row.generate_hashtags_by_default),
    defaultTemplate: row.default_template || '',
    updatedAt: row.updated_at,
  };
}

/**
 * ایجاد وظیفه انتشار در Outbox با بررسی کلید یکتایی (Idempotency)
 */
export async function createPublicationJob(
  job: {
    id: string;
    productId: string;
    channelId?: string;
    provider: PublicationProvider;
    eventType: PublicationEvent;
    status?: PublicationStatus;
    idempotencyKey?: string;
    payload: any;
    maxAttempts?: number;
  },
  client?: any
): Promise<ProductPublicationRecord | null> {
  const q = client ? client.query.bind(client) : query;

  try {
    const res = await q(
      `INSERT INTO product_publications (
         id, product_id, channel_id, provider, event_type, status,
         idempotency_key, payload, attempts, max_attempts, next_attempt_at, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8::jsonb, 0, $9, NOW(), NOW(), NOW()
       )
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING *`,
      [
        job.id,
        job.productId,
        job.channelId || null,
        job.provider,
        job.eventType,
        job.status || 'pending',
        job.idempotencyKey || null,
        JSON.stringify(job.payload || {}),
        job.maxAttempts || 5,
      ]
    );

    if (res.rows.length === 0) {
      // این وظیفه قبلاً ثبت شده بود (Idempotent Hit)
      return null;
    }

    return mapPublicationRow(res.rows[0]);
  } catch (err: any) {
    console.error('❌ [CreatePublicationJob Error]:', err.message);
    throw err;
  }
}

/**
 * واکشی کارهای در صف انتظار جهت پردازش
 */
export async function getPendingJobs(limit: number = 10): Promise<ProductPublicationRecord[]> {
  const res = await query(
    `SELECT pp.*, p.name as product_name, p.code as product_code, p.image_url as product_image,
            pc.name as channel_name
     FROM product_publications pp
     LEFT JOIN products p ON pp.product_id = p.id
     LEFT JOIN publication_channels pc ON pp.channel_id = pc.id
     WHERE pp.status IN ('pending', 'processing')
       AND (pp.next_attempt_at IS NULL OR pp.next_attempt_at <= NOW())
     ORDER BY pp.created_at ASC
     LIMIT $1`,
    [limit]
  );
  return res.rows.map(mapPublicationRow);
}

export async function updateJobStatus(
  id: string,
  updates: {
    status: PublicationStatus;
    attempts?: number;
    messageId?: string;
    externalUrl?: string;
    errorCode?: string;
    errorMessage?: string;
    nextAttemptAt?: Date | null;
    processingStartedAt?: Date | null;
    sentAt?: Date | null;
  }
): Promise<void> {
  await query(
    `UPDATE product_publications
     SET status = $1,
         attempts = COALESCE($2, attempts),
         message_id = COALESCE($3, message_id),
         external_url = COALESCE($4, external_url),
         error_code = $5,
         error_message = $6,
         next_attempt_at = $7,
         processing_started_at = COALESCE($8, processing_started_at),
         sent_at = COALESCE($9, sent_at),
         updated_at = NOW()
     WHERE id = $10`,
    [
      updates.status,
      updates.attempts !== undefined ? updates.attempts : null,
      updates.messageId || null,
      updates.externalUrl || null,
      updates.errorCode || null,
      updates.errorMessage || null,
      updates.nextAttemptAt || null,
      updates.processingStartedAt || null,
      updates.sentAt || null,
      id,
    ]
  );
}

export async function getPublicationHistory(filters: {
  productId?: string;
  provider?: string;
  status?: string;
  eventType?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: ProductPublicationRecord[]; total: number }> {
  const conditions: string[] = ['1=1'];
  const params: any[] = [];

  if (filters.productId) {
    params.push(filters.productId);
    conditions.push(`pp.product_id = $${params.length}`);
  }

  if (filters.provider && filters.provider !== 'all') {
    params.push(filters.provider);
    conditions.push(`pp.provider = $${params.length}`);
  }

  if (filters.status && filters.status !== 'all') {
    params.push(filters.status);
    conditions.push(`pp.status = $${params.length}`);
  }

  if (filters.eventType && filters.eventType !== 'all') {
    params.push(filters.eventType);
    conditions.push(`pp.event_type = $${params.length}`);
  }

  const whereSql = conditions.join(' AND ');
  const countRes = await query(`SELECT COUNT(*) as total FROM product_publications pp WHERE ${whereSql}`, params);
  const total = Number(countRes.rows[0]?.total || 0);

  const limit = Math.min(100, Math.max(1, filters.limit || 25));
  const offset = Math.max(0, filters.offset || 0);

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const dataRes = await query(
    `SELECT pp.*, p.name as product_name, p.code as product_code, p.image_url as product_image,
            pc.name as channel_name
     FROM product_publications pp
     LEFT JOIN products p ON pp.product_id = p.id
     LEFT JOIN publication_channels pc ON pp.channel_id = pc.id
     WHERE ${whereSql}
     ORDER BY pp.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  return {
    items: dataRes.rows.map(mapPublicationRow),
    total,
  };
}

export async function getProductPublicationHistory(productId: string): Promise<ProductPublicationRecord[]> {
  const res = await query(
    `SELECT pp.*, p.name as product_name, p.code as product_code, p.image_url as product_image,
            pc.name as channel_name
     FROM product_publications pp
     LEFT JOIN products p ON pp.product_id = p.id
     LEFT JOIN publication_channels pc ON pp.channel_id = pc.id
     WHERE pp.product_id = $1
     ORDER BY pp.created_at DESC`,
    [productId]
  );
  return res.rows.map(mapPublicationRow);
}

export async function retryJob(id: string): Promise<ProductPublicationRecord | null> {
  const res = await query(
    `UPDATE product_publications
     SET status = 'pending',
         attempts = 0,
         error_code = NULL,
         error_message = NULL,
         next_attempt_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return res.rows[0] ? mapPublicationRow(res.rows[0]) : null;
}

export async function cancelJob(id: string): Promise<ProductPublicationRecord | null> {
  const res = await query(
    `UPDATE product_publications
     SET status = 'cancelled',
         error_code = 'CANCELLED_BY_USER',
         error_message = 'توسط کاربر لغو شد.',
         updated_at = NOW()
     WHERE id = $1 AND status IN ('pending', 'processing')
     RETURNING *`,
    [id]
  );
  return res.rows[0] ? mapPublicationRow(res.rows[0]) : null;
}

export async function getPublicationStats(): Promise<{
  totalSent: number;
  totalPending: number;
  totalFailed: number;
  todaySent: number;
  providerBreakdown: Record<string, { sent: number; failed: number }>;
}> {
  const res = await query(`
    SELECT 
      status,
      provider,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE sent_at >= CURRENT_DATE) as today_sent
    FROM product_publications
    GROUP BY status, provider
  `);

  let totalSent = 0;
  let totalPending = 0;
  let totalFailed = 0;
  let todaySent = 0;
  const providerBreakdown: Record<string, { sent: number; failed: number }> = {
    website: { sent: 0, failed: 0 },
    eitaa: { sent: 0, failed: 0 },
    bale: { sent: 0, failed: 0 },
    telegram: { sent: 0, failed: 0 },
    instagram: { sent: 0, failed: 0 },
  };

  for (const row of res.rows) {
    const c = Number(row.count || 0);
    const ts = Number(row.today_sent || 0);
    const status = row.status as PublicationStatus;
    const provider = row.provider as PublicationProvider;

    if (!providerBreakdown[provider]) {
      providerBreakdown[provider] = { sent: 0, failed: 0 };
    }

    if (status === 'sent') {
      totalSent += c;
      todaySent += ts;
      providerBreakdown[provider].sent += c;
    } else if (status === 'pending' || status === 'processing') {
      totalPending += c;
    } else if (status === 'failed') {
      totalFailed += c;
      providerBreakdown[provider].failed += c;
    }
  }

  return {
    totalSent,
    totalPending,
    totalFailed,
    todaySent,
    providerBreakdown,
  };
}

function mapPublicationRow(row: any): ProductPublicationRecord {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productCode: row.product_code,
    productImage: row.product_image,
    channelId: row.channel_id,
    channelName: row.channel_name,
    provider: row.provider,
    eventType: row.event_type,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    messageId: row.message_id,
    externalUrl: row.external_url,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
    errorCode: row.error_code,
    errorMessage: row.error_message,
    attempts: Number(row.attempts || 0),
    maxAttempts: Number(row.max_attempts || 5),
    nextAttemptAt: row.next_attempt_at,
    processingStartedAt: row.processing_started_at,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

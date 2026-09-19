const userIdSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 128,
  pattern: '^[A-Za-z0-9._@+-]+$',
} as const;

const errorBodySchema = {
  type: 'object',
  required: ['success', 'error', 'message'],
  properties: {
    success: { type: 'boolean', const: false },
    error: { type: 'string' },
    message: { type: 'string' },
  },
} as const;

export const statusSchema = {
  response: {
    200: {
      type: 'object',
      required: ['status', 'startTime', 'endTime', 'totalStock', 'remainingStock', 'serverTime'],
      properties: {
        status: { type: 'string', enum: ['upcoming', 'active', 'ended'] },
        startTime: { type: 'string' },
        endTime: { type: 'string' },
        totalStock: { type: 'integer' },
        remainingStock: { type: 'integer' },
        serverTime: { type: 'string' },
      },
    },
    503: errorBodySchema,
  },
} as const;

export const purchaseSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['userId'],
    properties: {
      userId: userIdSchema,
    },
  },
  response: {
    201: {
      type: 'object',
      required: ['success', 'userId', 'remainingStock'],
      properties: {
        success: { type: 'boolean', const: true },
        userId: { type: 'string' },
        remainingStock: { type: 'integer' },
      },
    },
    400: errorBodySchema,
    403: errorBodySchema,
    409: errorBodySchema,
    503: errorBodySchema,
  },
} as const;

export const myPurchaseSchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: userIdSchema,
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['userId', 'purchased'],
      properties: {
        userId: { type: 'string' },
        purchased: { type: 'boolean' },
      },
    },
    400: errorBodySchema,
  },
} as const;

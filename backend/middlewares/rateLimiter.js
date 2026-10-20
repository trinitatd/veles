// In-memory sliding-window rate limiter for sensitive operations

const messageLimits = new Map(); // clerkUserId -> [timestamps]
const channelLimits = new Map(); // clerkUserId -> [timestamps]

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, timestamps] of messageLimits.entries()) {
    const valid = timestamps.filter((t) => now - t < 10000);
    if (valid.length === 0) messageLimits.delete(id);
    else messageLimits.set(id, valid);
  }
  for (const [id, timestamps] of channelLimits.entries()) {
    const valid = timestamps.filter((t) => now - t < 3600000);
    if (valid.length === 0) channelLimits.delete(id);
    else channelLimits.set(id, valid);
  }
}, 5 * 60 * 1000);

/**
 * Checks rate limit for message sending
 * Limit: 10 messages per 5 seconds
 */
export const checkMessageRateLimit = (userId) => {
  if (!userId) return true;
  const now = Date.now();
  const windowMs = 5000;
  const max = 10;

  const timestamps = (messageLimits.get(userId) || []).filter(
    (t) => now - t < windowMs
  );

  if (timestamps.length >= max) {
    return false;
  }

  timestamps.push(now);
  messageLimits.set(userId, timestamps);
  return true;
};

/**
 * Express middleware for channel creation rate limit
 * Limit: 5 channels per 10 minutes
 */
export const channelCreationRateLimit = (req, res, next) => {
  const userId = req.auth?.userId;
  if (!userId) return next();

  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const max = 5;

  const timestamps = (channelLimits.get(userId) || []).filter(
    (t) => now - t < windowMs
  );

  if (timestamps.length >= max) {
    return res
      .status(429)
      .json("You are creating channels too quickly. Please wait a few minutes.");
  }

  timestamps.push(now);
  channelLimits.set(userId, timestamps);
  next();
};

/**
 * Express middleware for message sending rate limit
 */
export const messageRateLimit = (req, res, next) => {
  const userId = req.auth?.userId;
  if (!userId) return next();

  if (!checkMessageRateLimit(userId)) {
    return res
      .status(429)
      .json("You are sending messages too quickly. Please slow down.");
  }
  next();
};


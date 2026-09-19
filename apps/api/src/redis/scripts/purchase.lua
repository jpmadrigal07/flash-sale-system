-- KEYS[1] = sale:config   (hash)
-- KEYS[2] = sale:stock    (integer string)
-- KEYS[3] = sale:purchasers (set)
-- ARGV[1] = userId
-- ARGV[2] = now (epoch ms, supplied by the server)
-- returns { code, remainingStock }

local configKey     = KEYS[1]
local stockKey      = KEYS[2]
local purchasersKey = KEYS[3]

local userId = ARGV[1]
local now    = tonumber(ARGV[2])

local config    = redis.call('HMGET', configKey, 'startTime', 'endTime')
local startTime = tonumber(config[1])
local endTime   = tonumber(config[2])

if startTime == nil or endTime == nil then
  return { 5, -1 }                       -- NOT_CONFIGURED
end

if now < startTime then
  return { 1, -1 }                       -- SALE_NOT_STARTED
end

if now >= endTime then
  return { 2, -1 }                       -- SALE_ENDED
end

if redis.call('SISMEMBER', purchasersKey, userId) == 1 then
  return { 3, tonumber(redis.call('GET', stockKey)) or 0 }  -- ALREADY_PURCHASED
end

local stock = tonumber(redis.call('GET', stockKey))
if stock == nil or stock <= 0 then
  return { 4, 0 }                        -- SOLD_OUT
end

local remaining = redis.call('DECR', stockKey)
-- Defense in depth: unreachable under Lua atomicity, since the GET above
-- and this DECR cannot interleave with another writer. Kept so a hole in
-- the preceding checks can never drive stock negative.
if remaining < 0 then
  redis.call('INCR', stockKey)
  return { 4, 0 }
end

redis.call('SADD', purchasersKey, userId)
return { 0, remaining }                  -- SUCCESS

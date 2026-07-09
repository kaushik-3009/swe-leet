import type { ProblemSpec } from "../schema";

export const systemDesignProblems: ProblemSpec[] = [
  {
    slug: "rate-limiter",
    categorySlug: "sd-fundamentals",
    track: "SYSTEM_DESIGN",
    title: "Rate Limiter",
    difficulty: "EASY",
    tags: ["rate-limiting", "api", "distributed-systems"],
    estMinutes: 25,
    order: 1,
    description: `Design a rate limiter that throttles requests per client (by API key or IP) for a public API.

**Functional requirements**
- Limit each client to N requests per time window (e.g. 100 req/min).
- Reject requests over the limit with a 429 response.
- Limits must apply consistently even when the API runs on multiple server instances.

**Non-functional requirements**
- Low added latency per request (sub-millisecond decision).
- Should survive a single rate-limiter node failing.

Draw the components involved and how a request flows through them, including where the rate limit counters are stored.`,
    rubric: {
      requiredComponents: ["Client", "API Gateway", "Rate Limiter Service", "Shared Counter Store", "Backend Service"],
      requiredConnections: [
        { from: "Client", to: "API Gateway" },
        { from: "API Gateway", to: "Rate Limiter Service", label: "check limit" },
        { from: "Rate Limiter Service", to: "Shared Counter Store", label: "read/write counters" },
        { from: "API Gateway", to: "Backend Service", label: "if allowed" },
      ],
    },
    referenceExplanation: `A centralized **Shared Counter Store** (typically Redis) holding per-client counters is what makes the limit consistent across multiple stateless API Gateway / Rate Limiter Service instances — without it, each instance would enforce its own independent limit.

The **Rate Limiter Service** sits in the request path before the backend, using an algorithm such as token bucket or sliding-window log against the shared store, and decides allow/reject in microseconds. Redis's atomic INCR + TTL (or a Lua script for sliding window) keeps this both fast and correct under concurrent access.

Trade-off: token bucket is memory-cheap and bursts-friendly; sliding-window log is more precise but costs more memory per client. For most APIs, a fixed or sliding window counter in Redis is the pragmatic default.`,
  },
  {
    slug: "url-shortener",
    categorySlug: "sd-fundamentals",
    track: "SYSTEM_DESIGN",
    title: "URL Shortener",
    difficulty: "EASY",
    tags: ["key-value", "hashing", "database"],
    estMinutes: 30,
    order: 2,
    description: `Design a service like bit.ly: given a long URL, generate a short unique alias that redirects to it.

**Functional requirements**
- POST a long URL, get back a short code.
- GET a short code, get redirected (301/302) to the original URL.
- Codes should not collide.

**Non-functional requirements**
- Redirect latency should be very low (majority of traffic is reads).
- Should scale to billions of stored URLs.

Draw the write path (creating a short URL) and the read path (redirecting), including where the mapping is stored and cached.`,
    rubric: {
      requiredComponents: ["Client", "API Server", "ID Generator", "Database", "Cache"],
      requiredConnections: [
        { from: "Client", to: "API Server" },
        { from: "API Server", to: "ID Generator", label: "on create" },
        { from: "API Server", to: "Database", label: "read/write mapping" },
        { from: "API Server", to: "Cache", label: "read-through on redirect" },
      ],
    },
    referenceExplanation: `The **ID Generator** produces unique short codes — either a base62 encoding of an auto-incrementing counter (simple, needs a coordinated counter service) or a random string with a collision check against the **Database**.

Since reads (redirects) vastly outnumber writes, a **Cache** in front of the database absorbs the hot-path lookups and keeps redirect latency low; on a cache miss, the API Server falls back to the database and repopulates the cache.

The Database itself is a simple key-value mapping (short code -> long URL) and can be sharded by short code once it outgrows a single node, since lookups are always by exact key.`,
  },
  {
    slug: "distributed-cache",
    categorySlug: "sd-caching",
    track: "SYSTEM_DESIGN",
    title: "Distributed Cache",
    difficulty: "MEDIUM",
    tags: ["caching", "consistency", "distributed-systems"],
    estMinutes: 35,
    order: 1,
    description: `Design a distributed, in-memory caching layer (like a simplified Redis Cluster) that sits in front of a primary database for a read-heavy service.

**Functional requirements**
- GET/SET/DELETE by key.
- Cache misses fall through to the database and populate the cache.
- Data is partitioned across multiple cache nodes.

**Non-functional requirements**
- Even distribution of keys across nodes.
- Cached data must eventually reflect database writes (no permanently stale reads).

Draw how a client's read/write requests are routed to cache nodes and how the cache stays consistent with the database.`,
    rubric: {
      requiredComponents: ["Client", "Application Server", "Cache Router", "Cache Node", "Database"],
      requiredConnections: [
        { from: "Client", to: "Application Server" },
        { from: "Application Server", to: "Cache Router", label: "get/set" },
        { from: "Cache Router", to: "Cache Node", label: "hash(key) -> node" },
        { from: "Application Server", to: "Database", label: "on cache miss / write-through" },
      ],
    },
    referenceExplanation: `The **Cache Router** hashes each key (typically with consistent hashing) to pick which **Cache Node** owns it, so clients don't need to know the cluster topology and the load spreads evenly.

Consistency with the **Database** is maintained via either write-through (update cache and DB together on writes) or cache invalidation with a short TTL (delete-on-write plus a bounded expiry as a safety net for missed invalidations) — TTL alone risks staleness, invalidation alone risks bugs from missed invalidation paths, so production systems usually combine both.

Cache Nodes should be treated as ephemeral: losing one just means a burst of cache misses repopulating from the database, not data loss, as long as the cache is never the source of truth.`,
  },
  {
    slug: "cdn-design",
    categorySlug: "sd-caching",
    track: "SYSTEM_DESIGN",
    title: "CDN for Static Assets",
    difficulty: "MEDIUM",
    tags: ["caching", "cdn", "latency"],
    estMinutes: 30,
    order: 2,
    description: `Design a CDN that serves static assets (images, JS bundles, videos) to users worldwide with low latency.

**Functional requirements**
- Serve cached assets from a location near the requesting user.
- Fetch and cache from the origin on a miss.
- Support cache invalidation/purging when an asset changes.

**Non-functional requirements**
- Minimize origin load.
- Low latency globally.

Draw how a user's request is routed to a nearby edge location and how that edge location gets the asset if it doesn't already have it.`,
    rubric: {
      requiredComponents: ["Client", "DNS / Anycast Routing", "Edge Cache", "Origin Server"],
      requiredConnections: [
        { from: "Client", to: "DNS / Anycast Routing", label: "resolve nearest edge" },
        { from: "Client", to: "Edge Cache" },
        { from: "Edge Cache", to: "Origin Server", label: "on miss (pull)" },
      ],
    },
    referenceExplanation: `**DNS / Anycast Routing** directs each client to the geographically nearest **Edge Cache** point-of-presence, which is what gives a CDN its latency win — the client never talks directly to the origin for cached content.

On a cache miss, the Edge Cache pulls the asset from the **Origin Server** once, caches it locally with a TTL or cache-control header, and serves subsequent requests for that asset from the edge — this "pull" model means origin load is proportional to unique assets times number of edges, not total requests.

For assets that change, purge/invalidation must propagate to all edges (or rely on content-hashed filenames, e.g. \`app.a1b2c3.js\`, so a new version is simply a new cache key and old cached copies just age out).`,
  },
  {
    slug: "database-sharding",
    categorySlug: "sd-sharding",
    track: "SYSTEM_DESIGN",
    title: "Database Sharding Strategy",
    difficulty: "MEDIUM",
    tags: ["sharding", "database", "scaling"],
    estMinutes: 35,
    order: 1,
    description: `A single relational database can no longer handle a service's write volume. Design a sharded database layer.

**Functional requirements**
- Route reads/writes for a given row to the correct shard.
- Support adding shards as data grows.

**Non-functional requirements**
- Avoid hot shards (uneven load).
- Queries for a single entity should hit exactly one shard.

Draw how a query gets routed to the correct shard, and what determines the shard assignment.`,
    rubric: {
      requiredComponents: ["Application Server", "Shard Router", "Shard Key Mapping", "Database Shard"],
      requiredConnections: [
        { from: "Application Server", to: "Shard Router" },
        { from: "Shard Router", to: "Shard Key Mapping", label: "lookup owning shard" },
        { from: "Shard Router", to: "Database Shard", label: "route query" },
      ],
    },
    referenceExplanation: `The **Shard Key Mapping** (e.g. \`hash(user_id) % num_shards\`, or a directory-based mapping service for more flexibility) determines which **Database Shard** owns a given row, and the **Shard Router** consults it on every query so the Application Server never needs to know the physical layout.

Choosing the shard key is the crux of the design: it must appear in nearly every query (so lookups stay single-shard) and distribute writes evenly (avoiding a hot shard from, e.g., sharding by signup date when most active users are recent).

A directory-based mapping (a lookup table instead of a pure hash) trades a bit of lookup latency for the ability to rebalance by moving individual key ranges rather than re-hashing everything when adding shards.`,
  },
  {
    slug: "consistent-hashing",
    categorySlug: "sd-sharding",
    track: "SYSTEM_DESIGN",
    title: "Consistent Hashing Ring",
    difficulty: "MEDIUM",
    tags: ["consistent-hashing", "sharding", "scaling"],
    estMinutes: 30,
    order: 2,
    description: `Design the request-routing layer for a distributed cache/storage cluster using consistent hashing, so that adding or removing a node only reshuffles a small fraction of keys.

**Functional requirements**
- Map keys to nodes such that node changes cause minimal key movement.
- Support adding/removing nodes at runtime.

**Non-functional requirements**
- Even load distribution (avoid hot nodes).

Draw the components that make up the hashing layer and how a lookup for a key is resolved to a node.`,
    rubric: {
      requiredComponents: ["Client", "Hash Ring Router", "Virtual Nodes", "Storage Node"],
      requiredConnections: [
        { from: "Client", to: "Hash Ring Router", label: "lookup(key)" },
        { from: "Hash Ring Router", to: "Virtual Nodes", label: "hash(key) -> ring position" },
        { from: "Virtual Nodes", to: "Storage Node", label: "maps to" },
      ],
    },
    referenceExplanation: `The **Hash Ring Router** hashes both keys and nodes onto the same circular hash space; a key is owned by the first node found walking clockwise from its position — so adding or removing one **Storage Node** only affects the keys between it and its neighbor, not the whole keyspace.

**Virtual Nodes** (each physical Storage Node mapped to many points on the ring) solve the uneven-distribution problem that plain consistent hashing has with few nodes — without them, one unlucky node placement can own a disproportionate arc of the ring.

This is the same mechanism behind DynamoDB, Cassandra, and most distributed caches' partitioning layer, and is what avoids the "rehash everything" cost of naive \`hash(key) % N\` when N changes.`,
  },
  {
    slug: "leader-election",
    categorySlug: "sd-consistency",
    track: "SYSTEM_DESIGN",
    title: "Leader Election Service",
    difficulty: "HARD",
    tags: ["consensus", "leader-election", "fault-tolerance"],
    estMinutes: 40,
    order: 1,
    description: `A cluster of worker nodes needs exactly one active leader at a time to coordinate work, with automatic failover if the leader dies.

**Functional requirements**
- Exactly one node acts as leader at any time.
- If the leader crashes, a new leader is elected within a bounded time.

**Non-functional requirements**
- Must tolerate node failures without losing the "single leader" guarantee (no split-brain).

Draw the coordination component the nodes use to elect and detect the leader, and how followers find out who's leader.`,
    rubric: {
      requiredComponents: ["Worker Node", "Coordination Service", "Leader Lease", "Leader Node"],
      requiredConnections: [
        { from: "Worker Node", to: "Coordination Service", label: "attempt to acquire lease" },
        { from: "Coordination Service", to: "Leader Lease", label: "grants with TTL" },
        { from: "Coordination Service", to: "Leader Node", label: "designates" },
      ],
    },
    referenceExplanation: `The **Coordination Service** (ZooKeeper, etcd, or Consul — themselves built on a consensus protocol like Raft or ZAB) is the single source of truth nodes rely on to avoid split-brain: it can only ever grant one **Leader Lease** at a time because it uses quorum-based consensus internally.

Each **Worker Node** tries to acquire the lease; whoever succeeds becomes the **Leader Node** and must periodically renew the lease before its TTL expires. If the leader crashes and stops renewing, the lease expires and another worker's acquisition attempt succeeds — bounding failover time by the lease TTL.

The key insight candidates often miss: you cannot safely implement leader election with a simple "last write wins" flag in a regular database, because that has no way to detect a leader that's alive-but-partitioned versus truly dead — you need the coordination service's own consensus guarantee.`,
  },
  {
    slug: "distributed-lock",
    categorySlug: "sd-consistency",
    track: "SYSTEM_DESIGN",
    title: "Distributed Lock Service",
    difficulty: "HARD",
    tags: ["locking", "consistency", "fault-tolerance"],
    estMinutes: 35,
    order: 2,
    description: `Multiple application instances need mutual exclusion on a shared resource (e.g. only one instance should process a given job at a time).

**Functional requirements**
- Acquire/release a named lock.
- Locks auto-expire if the holder crashes without releasing (no permanent deadlock).

**Non-functional requirements**
- Safety: two clients must never hold the same lock simultaneously, even under network delay.

Draw the components involved in acquiring, holding, and releasing a lock.`,
    rubric: {
      requiredComponents: ["Application Instance", "Lock Service", "Lock Store", "Shared Resource"],
      requiredConnections: [
        { from: "Application Instance", to: "Lock Service", label: "acquire(key, ttl)" },
        { from: "Lock Service", to: "Lock Store", label: "atomic set-if-not-exists" },
        { from: "Application Instance", to: "Shared Resource", label: "access while holding lock" },
      ],
    },
    referenceExplanation: `The **Lock Store** (Redis with \`SET key value NX PX ttl\`, or a coordination service like etcd) performs an atomic "set if not exists with TTL" — the atomicity is what prevents two Application Instances from both believing they hold the lock, and the TTL is what prevents a crashed holder from deadlocking everyone else.

The **Lock Service** wraps this with a client-side identity token per lock attempt, so release only succeeds if the caller still holds the same lock instance (protects against a client releasing a lock it no longer owns after its TTL expired and someone else acquired it).

Caveat worth drawing out in the explanation even if not in the diagram: TTL-based locks are only as safe as your clock assumptions and processing time — if a holder pauses (GC, scheduling delay) past the TTL, another Application Instance can acquire the lock while the first still thinks it holds it, so this pattern is not safe for correctness-critical mutual exclusion without an additional fencing token check at the Shared Resource.`,
  },
  {
    slug: "message-queue-system",
    categorySlug: "sd-messaging",
    track: "SYSTEM_DESIGN",
    title: "Message Queue System",
    difficulty: "MEDIUM",
    tags: ["messaging", "queue", "decoupling"],
    estMinutes: 35,
    order: 1,
    description: `Design a message queue (like a simplified SQS/Kafka) that decouples producers from consumers for asynchronous work processing.

**Functional requirements**
- Producers enqueue messages; consumers dequeue and process them.
- A message is not lost if a consumer crashes mid-processing.
- Support multiple consumers processing in parallel.

**Non-functional requirements**
- At-least-once delivery.
- Durable storage of unprocessed messages.

Draw the path a message takes from producer to consumer, including how in-flight messages are protected from loss.`,
    rubric: {
      requiredComponents: ["Producer", "Queue Broker", "Message Store", "Consumer"],
      requiredConnections: [
        { from: "Producer", to: "Queue Broker", label: "enqueue" },
        { from: "Queue Broker", to: "Message Store", label: "persist" },
        { from: "Consumer", to: "Queue Broker", label: "poll / ack" },
      ],
    },
    referenceExplanation: `The **Queue Broker** persists every message to the **Message Store** before acknowledging the Producer, so a broker crash after enqueue doesn't lose data — durability comes from writing to disk (and often replicating) before responding.

For consumer safety, the broker uses a visibility timeout: when a **Consumer** polls a message, it becomes invisible to other consumers for a bounded window rather than being deleted immediately; the consumer must explicitly ack after finishing, and if it crashes mid-processing, the message becomes visible again for another consumer to pick up — this is what gives at-least-once delivery (the trade-off being consumers must be idempotent, since the same message can be delivered twice).

Multiple consumers reading the same queue naturally parallelizes processing, but ordering across consumers isn't guaranteed unless messages are partitioned (as in Kafka) so that all messages for a given key go to the same consumer.`,
  },
  {
    slug: "realtime-chat",
    categorySlug: "sd-messaging",
    track: "SYSTEM_DESIGN",
    title: "Real-time Chat System",
    difficulty: "HARD",
    tags: ["websockets", "messaging", "real-time"],
    estMinutes: 40,
    order: 2,
    description: `Design a 1:1 and group chat system (like WhatsApp) supporting real-time message delivery and offline message storage.

**Functional requirements**
- Deliver messages to online recipients in real time.
- Store messages for offline recipients until they reconnect.
- Support group chats.

**Non-functional requirements**
- Low delivery latency for online users.
- No message loss.

Draw how a message travels from sender to a currently-online recipient, and how the system tracks who's online.`,
    rubric: {
      requiredComponents: ["Sender Client", "WebSocket Gateway", "Chat Service", "Message Store", "Presence Store", "Recipient Client"],
      requiredConnections: [
        { from: "Sender Client", to: "WebSocket Gateway", label: "send message" },
        { from: "WebSocket Gateway", to: "Chat Service" },
        { from: "Chat Service", to: "Message Store", label: "persist" },
        { from: "Chat Service", to: "Presence Store", label: "lookup recipient's gateway" },
        { from: "WebSocket Gateway", to: "Recipient Client", label: "push if online" },
      ],
    },
    referenceExplanation: `The **WebSocket Gateway** maintains a persistent connection per online client; because a user's connection can be on any gateway instance in a fleet, the **Presence Store** (typically Redis) maps user ID -> which gateway instance holds their connection, so the Chat Service knows where to route a push.

Every message is persisted to the **Message Store** first regardless of the recipient's online status — this guarantees no loss and gives offline recipients a place to fetch missed messages from on reconnect, decoupling delivery from storage.

Group chats fan out the same message to multiple recipients' gateway connections (or via presence lookups for each group member); at scale this fan-out is often handled by a pub/sub layer between Chat Service instances rather than direct instance-to-instance calls.`,
  },
  {
    slug: "notification-system",
    categorySlug: "sd-messaging",
    track: "SYSTEM_DESIGN",
    title: "Notification System",
    difficulty: "MEDIUM",
    tags: ["notifications", "messaging", "fan-out"],
    estMinutes: 30,
    order: 3,
    description: `Design a system that sends notifications (push, email, SMS) triggered by events elsewhere in the platform, e.g. "someone liked your post."

**Functional requirements**
- Accept notification events from other services.
- Deliver via the user's preferred channel(s) (push/email/SMS).
- Respect user notification preferences and rate limits (don't spam).

**Non-functional requirements**
- Delivery should not block the triggering service's request path.

Draw how an event flows from the triggering service to the user's device.`,
    rubric: {
      requiredComponents: ["Triggering Service", "Event Queue", "Notification Service", "User Preferences Store", "Push/Email/SMS Provider"],
      requiredConnections: [
        { from: "Triggering Service", to: "Event Queue", label: "publish event" },
        { from: "Event Queue", to: "Notification Service", label: "consume" },
        { from: "Notification Service", to: "User Preferences Store", label: "check channel/opt-in" },
        { from: "Notification Service", to: "Push/Email/SMS Provider", label: "dispatch" },
      ],
    },
    referenceExplanation: `The **Triggering Service** (e.g. the "likes" service) only publishes an event to the **Event Queue** and returns immediately — decoupling it from notification delivery means a slow email provider can never add latency to the user-facing like action.

The **Notification Service** consumes events asynchronously, checks the **User Preferences Store** to see which channels the user actually wants (and whether they're within rate limits — e.g. batch 10 likes into one notification instead of 10), then dispatches to the appropriate **Push/Email/SMS Provider**.

Using a queue between trigger and delivery also naturally absorbs bursts (e.g. a viral post generating thousands of like-events at once) without overwhelming downstream providers, and allows retries on provider failure without affecting the original request.`,
  },
  {
    slug: "news-feed-system",
    categorySlug: "sd-case-studies",
    track: "SYSTEM_DESIGN",
    title: "News Feed System",
    difficulty: "HARD",
    tags: ["fan-out", "caching", "case-study"],
    estMinutes: 45,
    order: 1,
    description: `Design a social media news feed (like Twitter's home timeline): when a user opens the app, they see recent posts from people they follow, ranked roughly by recency.

**Functional requirements**
- Users can post; followers should see the post in their feed.
- Feed loads quickly even for users following thousands of accounts.

**Non-functional requirements**
- Handle celebrity accounts with millions of followers without a huge write spike per post.

Draw the write path (posting) and read path (loading a feed), including how they differ for typical vs. high-follower-count users.`,
    rubric: {
      requiredComponents: ["Client", "Post Service", "Post Store", "Fan-out Service", "Feed Cache", "Feed Service"],
      requiredConnections: [
        { from: "Client", to: "Post Service", label: "create post" },
        { from: "Post Service", to: "Post Store", label: "persist" },
        { from: "Post Service", to: "Fan-out Service", label: "trigger fan-out" },
        { from: "Fan-out Service", to: "Feed Cache", label: "push to followers' feeds" },
        { from: "Client", to: "Feed Service", label: "load feed" },
        { from: "Feed Service", to: "Feed Cache", label: "read precomputed feed" },
      ],
    },
    referenceExplanation: `This is a **fan-out-on-write** design: when a typical user posts, the **Fan-out Service** immediately pushes the new post into every follower's precomputed **Feed Cache** entry, so reading a feed later is just one cache read — fast, because the expensive work (finding all followers, writing N entries) happened once at post time instead of on every feed load.

The celebrity problem is why this needs a hybrid: fanning out a single post to 50 million followers on write would be enormous write amplification. Celebrity posts instead skip fan-out and get merged into followers' feeds at read time (**fan-out-on-read**) — the Feed Service, when loading a feed, combines the precomputed cache with a live query for any celebrities the user follows.

This read/write trade-off — push for normal users, pull for high-fan-out accounts — is the core insight interviewers look for; a pure push or pure pull design each breaks down at one end of the follower-count distribution.`,
  },
  {
    slug: "web-crawler",
    categorySlug: "sd-case-studies",
    track: "SYSTEM_DESIGN",
    title: "Web Crawler",
    difficulty: "HARD",
    tags: ["crawling", "distributed-systems", "case-study"],
    estMinutes: 40,
    order: 2,
    description: `Design a distributed web crawler that starts from a set of seed URLs, downloads pages, extracts links, and crawls those too — at scale, without hammering any single site or crawling the same page repeatedly.

**Functional requirements**
- Crawl breadth-first from seed URLs, following extracted links.
- Avoid recrawling the same URL.
- Respect per-host rate limits (politeness).

**Non-functional requirements**
- Scale to billions of pages via multiple crawler workers.

Draw the loop a URL goes through: from being discovered to being fetched to producing new URLs.`,
    rubric: {
      requiredComponents: ["Seed URLs", "URL Frontier", "Crawler Worker", "Dedup Store", "Page Store", "Link Extractor"],
      requiredConnections: [
        { from: "Seed URLs", to: "URL Frontier" },
        { from: "URL Frontier", to: "Crawler Worker", label: "dequeue, respecting politeness" },
        { from: "Crawler Worker", to: "Page Store", label: "store fetched page" },
        { from: "Crawler Worker", to: "Link Extractor" },
        { from: "Link Extractor", to: "Dedup Store", label: "check seen" },
        { from: "Dedup Store", to: "URL Frontier", label: "enqueue new URLs" },
      ],
    },
    referenceExplanation: `The **URL Frontier** is more than a queue — it's partitioned per-host with per-host rate limiting so a **Crawler Worker** never fires two requests at the same domain too close together (politeness), while still keeping many other hosts' URLs available for other workers to fetch concurrently.

After a fetch, the **Link Extractor** pulls new URLs out of the page and checks each against the **Dedup Store** (a large-scale set, often a Bloom filter for space efficiency at billions of URLs) before enqueueing only genuinely new URLs back onto the Frontier — this is what prevents infinite recrawl loops on cyclic links.

The **Page Store** decouples fetching from downstream processing (indexing, ranking, etc.), which isn't this problem's concern but is why crawlers store raw pages rather than only extracting-and-discarding.`,
  },
  {
    slug: "video-streaming-platform",
    categorySlug: "sd-case-studies",
    track: "SYSTEM_DESIGN",
    title: "Video Streaming Platform",
    difficulty: "HARD",
    tags: ["streaming", "cdn", "case-study"],
    estMinutes: 45,
    order: 3,
    description: `Design a video platform like YouTube: users upload videos, the platform processes them into streamable formats, and viewers watch with adaptive quality based on their connection.

**Functional requirements**
- Accept uploads and transcode into multiple resolutions/bitrates.
- Serve video to viewers with low startup latency and adaptive bitrate.

**Non-functional requirements**
- Handle very large files efficiently.
- Serve viewers globally with low latency.

Draw the upload/processing pipeline and the separate viewing/playback path.`,
    rubric: {
      requiredComponents: ["Uploader", "Upload Service", "Raw Video Store", "Transcoding Service", "Encoded Video Store", "CDN", "Viewer"],
      requiredConnections: [
        { from: "Uploader", to: "Upload Service" },
        { from: "Upload Service", to: "Raw Video Store" },
        { from: "Raw Video Store", to: "Transcoding Service" },
        { from: "Transcoding Service", to: "Encoded Video Store", label: "multiple resolutions" },
        { from: "Encoded Video Store", to: "CDN" },
        { from: "Viewer", to: "CDN", label: "adaptive bitrate stream" },
      ],
    },
    referenceExplanation: `Upload and playback are intentionally separate pipelines running at very different scales: the **Transcoding Service** runs asynchronously after upload (often chunked into parallel jobs per resolution) to convert one raw file into multiple resolution/bitrate variants, so it doesn't block the uploader and can be scaled independently of viewer traffic.

The **Encoded Video Store** holds all variants plus a manifest (e.g. HLS/DASH) describing them; this manifest is what lets a **Viewer**'s player switch resolution mid-stream as bandwidth changes — adaptive bitrate is a client-side decision driven by server-provided options, not a server pushing a fixed stream.

The **CDN** is essential here, not optional: video is the highest-bandwidth content type on the platform, and serving it from origin at scale would be both slow (distance) and prohibitively expensive — nearly all playback bytes should come from edge caches.`,
  },
  {
    slug: "typeahead-autocomplete",
    categorySlug: "sd-case-studies",
    track: "SYSTEM_DESIGN",
    title: "Typeahead / Search Autocomplete",
    difficulty: "MEDIUM",
    tags: ["search", "caching", "case-study"],
    estMinutes: 35,
    order: 4,
    description: `Design a search-box autocomplete: as a user types, suggest the top completions in under 100ms.

**Functional requirements**
- Return top-k suggestions for a given prefix, ranked by popularity/frequency.
- Suggestions should reflect reasonably recent query trends.

**Non-functional requirements**
- Very low read latency (feels instant while typing).
- Update popularity data without impacting read latency.

Draw how a keystroke's prefix query is served, and how the underlying popularity data gets refreshed.`,
    rubric: {
      requiredComponents: ["Client", "Autocomplete Service", "Trie Cache", "Query Log Store", "Aggregation Job"],
      requiredConnections: [
        { from: "Client", to: "Autocomplete Service", label: "prefix query" },
        { from: "Autocomplete Service", to: "Trie Cache", label: "top-k lookup" },
        { from: "Query Log Store", to: "Aggregation Job", label: "batch, e.g. hourly" },
        { from: "Aggregation Job", to: "Trie Cache", label: "rebuild/update" },
      ],
    },
    referenceExplanation: `The read path is deliberately simple and fast: the **Autocomplete Service** looks up a prefix directly in an in-memory **Trie Cache** where each trie node already stores its top-k most popular completions precomputed — this turns "rank all matches" into an O(prefix length) lookup with no ranking work at request time.

Popularity data comes from the **Query Log Store** (raw search queries) being periodically processed by an **Aggregation Job** that recomputes frequencies and rebuilds (or incrementally updates) the Trie Cache — running this offline/batch, off the read path, is what keeps read latency low and predictable regardless of how expensive the ranking computation is.

This read/write separation (serve from a precomputed structure, update it asynchronously) is the same pattern as the news feed's fan-out-on-write cache — trading a bit of data freshness for consistently fast reads.`,
  },
];

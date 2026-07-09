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
    inStudyPlanSubset: true,
    description: `Design a rate limiter that throttles requests per client (by API key or IP) for a public API.

**Functional requirements**
- Limit each client to N requests per time window (e.g. 100 req/min).
- Reject requests over the limit with a 429 response.
- Limits must apply consistently even when the API runs on multiple server instances.

**Non-functional requirements**
- Low added latency per request (sub-millisecond decision).
- Should survive a single rate-limiter node failing.

**Clarifying context**
- Assume traffic arrives at roughly 5,000 requests/second across the whole API, from tens of thousands of distinct clients.
- A client should get a clear signal (429 plus a \`Retry-After\` header) rather than a silent drop.
- You do not need to support per-endpoint limits for this exercise, a single limit per client is enough.

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
    generalHint: "The core problem is that multiple stateless API servers each need to agree on the same count for a client. Where would you put that count so every instance sees the same value?",
    stepHints: [
      "Start with a single server: a simple in-memory counter per client key, reset every window, would work fine.",
      "Now assume there are 10 API server instances behind a load balancer. An in-memory counter on one instance can't see requests that landed on another instance, so the limit becomes 10x too generous. What shared place could all instances check?",
      "A fast, shared, key-value store (like Redis) that supports atomic increment-with-expiry is a natural fit, it gives you a single counter per client that every API instance reads and writes.",
      "Think about which limiting algorithm to run against that store: a fixed window counter is simplest but allows a burst of 2x the limit at window boundaries; a sliding window log is precise but stores a timestamp per request; a token bucket is a good middle ground for allowing controlled bursts.",
      "Finally, consider failure: if the Shared Counter Store is briefly unavailable, decide explicitly whether to fail open (allow the request) or fail closed (reject it), and justify the choice in terms of protecting the backend versus availability for clients.",
    ],
    referenceExplanation: `## Design rationale

A centralized **Shared Counter Store** (typically Redis) holding per-client counters is what makes the limit consistent across multiple stateless API Gateway / Rate Limiter Service instances. Without it, each instance would enforce its own independent limit, and a client could get roughly N times the intended limit by spreading requests across N server instances.

The **Rate Limiter Service** sits in the request path before the backend, using an algorithm such as token bucket or sliding-window counter against the shared store, and decides allow/reject in microseconds. Redis's atomic INCR plus TTL (or a small Lua script for a sliding window) keeps this both fast and correct under concurrent access from many API Gateway instances.

## Trade-offs

Token bucket is memory-cheap and bursts-friendly (it lets a client save up unused capacity and spend it in a burst). Sliding-window log is more precise about exact request timing but costs more memory per client, since it stores a timestamp per request rather than a single integer. For most public APIs, a fixed or sliding window counter in Redis is the pragmatic default, precise enough without the memory overhead of a full log.

## Common mistakes

- Putting the counter only in each API server's local memory (works in a single-instance demo, silently breaks the limit once you scale horizontally).
- Forgetting the TTL on the counter key, which leaks memory and never resets the window.
- Returning a bare 429 with no \`Retry-After\` header, leaving well-behaved clients to guess when to retry.
- Treating "the counter store is down" as an unhandled exception instead of an explicit fail-open or fail-closed decision.

## Edge cases

- Clock skew between servers can shift window boundaries slightly, a small allowed slop is usually fine for rate limiting (unlike, say, billing).
- A single very hot client key (e.g. a misbehaving bot) can create contention on one Redis key, sharding extremely hot keys further is a valid follow-up discussion.
- Distinguish "no API key provided" (should probably get a strict default/anonymous limit) from a normal authenticated client.`,
    solutionSteps: [
      { title: "1. Identify the request path", body: "A Client calls the API Gateway. The Gateway needs to know, before forwarding to the Backend Service, whether this client is over their limit." },
      { title: "2. Add a decision point", body: "Introduce a Rate Limiter Service that the API Gateway calls synchronously on every request. It returns allow or reject." },
      { title: "3. Make the count shared", body: "Back the Rate Limiter Service with a Shared Counter Store (Redis) keyed by client ID, using atomic INCR + EXPIRE so every API Gateway instance sees the same count." },
      { title: "4. Pick an algorithm", body: "Use a sliding window counter or token bucket implemented via a Redis Lua script, so the check-and-increment is atomic and avoids race conditions under concurrent requests." },
      { title: "5. Wire the allowed path", body: "On allow, the API Gateway forwards to the Backend Service as normal. On reject, it returns 429 with a Retry-After header, never reaching the backend." },
    ],
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

**Clarifying context**
- Assume a 100:1 read/write ratio (many more redirects than URL creations).
- Short codes should be reasonably short (6-8 characters) and use a safe alphabet (base62: a-z, A-Z, 0-9).
- Custom aliases (user picks their own short code) are a nice-to-have, not required for this exercise.

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
    generalHint: "Reads vastly outnumber writes here, so design the read path (redirect) to be as cheap as possible, and treat code generation as the one interesting problem on the write path.",
    stepHints: [
      "For the write path: how do you turn a long URL into a short, unique code without two concurrent writers picking the same code?",
      "Consider two approaches: hash the URL (e.g. take the first 6-8 chars of a base62-encoded hash) and check for collisions, versus handing out unique IDs from a counter and base62-encoding the counter value.",
      "A counter-based approach guarantees uniqueness without a collision check, but a single global counter is a bottleneck and a single point of failure. How could you generate unique IDs without one shared counter?",
      "For the read path, since reads dominate, put a cache in front of the database. What is the shape of the cached data, and what happens on a cache miss?",
      "Decide on 301 vs 302 for the redirect, and connect that choice to whether you want browsers to cache the redirect themselves (301) or want to retain the ability to change/expire it later (302), plus how that interacts with click analytics if you wanted them.",
    ],
    referenceExplanation: `## Design rationale

The **ID Generator** produces unique short codes, either a base62 encoding of an ID handed out by a coordinated counter/ID-generation service (simple, guarantees uniqueness by construction), or a hash of the long URL with a collision check against the **Database** (avoids a shared counter, but needs a retry-on-collision loop).

Since reads (redirects) vastly outnumber writes, a **Cache** in front of the database absorbs the hot-path lookups and keeps redirect latency low. On a cache miss, the API Server falls back to the database and repopulates the cache.

The Database itself is a simple key-value mapping (short code to long URL) and can be sharded by short code once it outgrows a single node, since lookups are always by exact key, never by range or the long URL.

## Trade-offs

A counter-based generator (e.g. a Snowflake-style distributed ID generator, or pre-allocated ID ranges handed to each API server) avoids collisions entirely but adds an extra moving part. A hash-based generator is simpler to reason about but needs a database round trip to check for collisions on every write, and collisions become more likely as the keyspace fills up (birthday paradox), pushing you toward longer codes over time.

301 (permanent) redirects let browsers cache the mapping and skip your server on repeat visits, which is great for load but means you lose the ability to change the destination or track every single click. 302 (temporary) keeps every redirect hitting your server, useful if you want click analytics or the ability to update the destination URL later.

## Common mistakes

- Using an auto-increment primary key directly as the short code without base62-encoding it (leaks total URL count, and produces predictable, guessable codes).
- Forgetting that the cache needs both the forward mapping (code to URL) and, if collision-checking by hash, potentially the reverse lookup too.
- Not planning for the keyspace filling up: 6-character base62 gives ~56 billion combinations, comfortable for most systems but worth stating explicitly rather than assuming infinite space.

## Edge cases

- A user submits the same long URL twice: decide whether to return the same short code (requires a reverse index) or mint a new one each time (simpler, but wastes keyspace).
- Malicious or malformed URLs (e.g. \`javascript:\` URIs) should be rejected at write time, not just passed through to redirect.
- Expired or deleted short codes should return a clear 404/410, not a broken redirect.`,
    solutionSteps: [
      { title: "1. Map the write path", body: "Client POSTs a long URL to the API Server, which calls the ID Generator to mint a unique short code, then writes {code -> longUrl} to the Database." },
      { title: "2. Map the read path", body: "Client GETs a short code, the API Server looks it up. Because reads dominate, check the Cache first." },
      { title: "3. Add the cache with a fallback", body: "On a cache hit, redirect immediately. On a miss, read from the Database, populate the Cache, then redirect, so subsequent requests for that code are fast." },
      { title: "4. Choose the ID strategy", body: "Use a base62-encoded counter (via a distributed ID generator or pre-allocated ranges per server) so writes never need a collision-check round trip to the database." },
      { title: "5. Decide the redirect semantics", body: "Use a 302 if you want every redirect to hit your server (for analytics or later URL changes), or 301 if you want browsers to cache it and reduce load, and state that trade-off explicitly." },
    ],
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
    inStudyPlanSubset: true,
    description: `Design a distributed, in-memory caching layer (like a simplified Redis Cluster) that sits in front of a primary database for a read-heavy service.

**Functional requirements**
- GET/SET/DELETE by key.
- Cache misses fall through to the database and populate the cache.
- Data is partitioned across multiple cache nodes.

**Non-functional requirements**
- Even distribution of keys across nodes.
- Cached data must eventually reflect database writes (no permanently stale reads).

**Clarifying context**
- Assume the workload is 95% reads, 5% writes, with a working set too large to fit on a single cache node.
- A few seconds of staleness after a write is acceptable, permanent staleness is not.
- You do not need to design cross-region replication for this exercise.

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
    generalHint: "There are two separate problems bundled here: how a key gets assigned to a node (partitioning), and how the cache stays correct after the underlying data changes (invalidation). Solve them one at a time.",
    stepHints: [
      "For partitioning: with a fixed number of nodes, \`hash(key) % N\` works, but what happens to nearly every key's assigned node when N changes (a node is added or removed)?",
      "Consistent hashing addresses that by minimizing key movement when nodes change, worth naming explicitly even if you don't diagram the hash ring in detail here.",
      "For consistency: when the database is updated, the stale cached copy needs to go away eventually. What are your two basic options (update the cache at write time, versus just letting it expire)?",
      "Write-through (update cache and DB together) keeps things fresh immediately but adds latency and complexity to every write. A TTL-only approach is simpler but tolerates staleness up to the TTL. What would you combine to get both fast writes and a safety net?",
      "Think about what happens to a Cache Node that crashes: is any data permanently lost, or does it just mean a burst of cache misses that get repopulated from the Database?",
    ],
    referenceExplanation: `## Design rationale

The **Cache Router** hashes each key (typically with consistent hashing) to pick which **Cache Node** owns it, so clients don't need to know the cluster topology and load spreads evenly across nodes.

Consistency with the **Database** is maintained via either write-through (update cache and DB together on writes) or cache invalidation with a short TTL (delete-on-write plus a bounded expiry as a safety net for missed invalidations). TTL alone risks staleness for up to the TTL duration; invalidation alone risks bugs from missed invalidation code paths, so production systems usually combine both: invalidate on write, and keep a TTL as a backstop.

## Trade-offs

Write-through keeps the cache always fresh but makes every write pay the cost (and failure modes) of two systems instead of one. Cache-aside with TTL-only invalidation is simpler to implement and more resilient to partial failures, at the cost of bounded staleness that some use cases (e.g. financial balances) can't tolerate.

Consistent hashing minimizes reshuffling when nodes are added or removed, at the cost of some implementation complexity (virtual nodes, ring maintenance) compared to plain modulo hashing, which is simpler but rehashes almost every key on any topology change.

## Common mistakes

- Using \`hash(key) % N\` directly, which looks fine in a demo but causes a near-total cache wipe (and a thundering herd on the database) every time a node is added or removed.
- Treating the cache as a system of record: if the cache is the only place data lives, "losing a node" becomes real data loss instead of a temporary miss burst.
- Invalidating the cache before committing the database write (a crash between the two steps leaves the cache correctly empty but the DB write never happened, or worse, the reverse ordering leaves stale cached data with no way to know it's stale).

## Edge cases

- Thundering herd: many concurrent requests for the same missing key can all miss the cache simultaneously and hammer the database; a common mitigation is a short-lived lock or "in-flight" marker per key during population.
- Hot keys (a single very popular key) can overload one Cache Node even with even key distribution overall; worth mentioning even if not required in the diagram.
- Partial cluster failure: decide whether a request for a key on a downed node fails fast, retries against a replica, or falls through to the database directly.`,
    solutionSteps: [
      { title: "1. Separate the two concerns", body: "Partitioning (which node owns a key) and consistency (how fresh is the cached value) are independent problems, design each on its own." },
      { title: "2. Route by hashing the key", body: "The Application Server asks a Cache Router to resolve a key to a Cache Node via hash(key), so any server can find the right node without global coordination." },
      { title: "3. Use consistent hashing for stability", body: "Instead of plain modulo hashing, hash both keys and nodes onto a ring so adding/removing a node only remaps a small fraction of keys." },
      { title: "4. Wire the read/miss path", body: "On a cache miss, the Application Server reads from the Database and populates the Cache Node before returning, so the next read for that key is fast." },
      { title: "5. Wire the write/invalidate path", body: "On a write, update the Database, then invalidate (or update) the corresponding cache entry, and set a TTL as a backstop against any invalidation you might have missed." },
    ],
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

**Clarifying context**
- Assume users are spread globally and most requested assets rarely change once published (images, versioned JS bundles).
- A small fraction of assets (e.g. a logo update) do need to be invalidated on demand.

Draw how a user's request is routed to a nearby edge location and how that edge location gets the asset if it doesn't already have it.`,
    rubric: {
      requiredComponents: ["Client", "DNS / Anycast Routing", "Edge Cache", "Origin Server"],
      requiredConnections: [
        { from: "Client", to: "DNS / Anycast Routing", label: "resolve nearest edge" },
        { from: "Client", to: "Edge Cache" },
        { from: "Edge Cache", to: "Origin Server", label: "on miss (pull)" },
      ],
    },
    generalHint: "A CDN's whole value proposition is keeping the client from ever talking to the origin directly for cached content. Design the routing step first, then the miss-handling step.",
    stepHints: [
      "How does a client, wherever in the world they are, end up talking to a nearby edge location instead of a fixed central server?",
      "Anycast routing or geo-aware DNS resolves the same hostname to different IPs depending on where the request originates, that's the mechanism worth naming.",
      "Once a client reaches an edge, what happens if that edge doesn't have the asset cached yet? Trace that single request's path to the Origin Server and back.",
      "Now think about assets that change: content-hashed filenames (e.g. app.a1b2c3.js) sidestep invalidation entirely for versioned assets, since a changed file is just a new cache key. What about assets you can't easily rename, like a logo at a fixed URL?",
      "For those, you need an active purge/invalidation mechanism that propagates to every edge, consider what happens between the purge command being issued and it reaching every edge (a brief inconsistency window).",
    ],
    referenceExplanation: `## Design rationale

**DNS / Anycast Routing** directs each client to the geographically nearest **Edge Cache** point-of-presence, which is what gives a CDN its latency win: the client never talks directly to the origin for cached content.

On a cache miss, the Edge Cache pulls the asset from the **Origin Server** once, caches it locally with a TTL or cache-control header, and serves subsequent requests for that asset from the edge. This "pull" model means origin load is proportional to (unique assets) times (number of edges), not total requests, which is the key scaling property.

## Trade-offs

Content-hashed filenames (e.g. \`app.a1b2c3.js\`) sidestep the invalidation problem entirely for assets your build process controls: a changed file is simply a new cache key, and old cached copies just age out naturally via TTL, no active purge needed. Assets at fixed URLs (a logo, a frequently-updated JSON config) can't use this trick and need genuine purge propagation to every edge, which is slower and more operationally complex.

Pull-based caching (fetch from origin on first request) is simpler to operate than push-based (proactively distributing content to all edges ahead of time), but the very first request for any asset from any given edge pays full origin latency ("cold" edge).

## Common mistakes

- Setting no cache-control headers at all, leaving edges to guess (or not cache) at their own discretion.
- Assuming purge propagates instantly to all edges; in practice there's a brief window where different edges serve different versions of an invalidated asset.
- Serving genuinely dynamic, per-user content through the same caching path as static assets without marking it non-cacheable.

## Edge cases

- A brand-new, highly anticipated asset (e.g. a major game patch) can create a "cold start" spike where many edges simultaneously miss and hammer the origin at once, pre-warming edges ahead of a known release is a valid mitigation to mention.
- Range requests (partial content, common for video seeking) need edges to cache and serve byte ranges correctly, not just whole files.
- Purge requests themselves need to be idempotent and authenticated, since an unauthenticated purge endpoint is an easy denial-of-service vector against your own cache hit rate.`,
    solutionSteps: [
      { title: "1. Route the client to a nearby edge", body: "DNS / Anycast Routing resolves the CDN hostname to the IP of the geographically closest Edge Cache point-of-presence." },
      { title: "2. Serve from the edge on a hit", body: "The Client requests the asset from that Edge Cache; if cached, it's served immediately with no origin involvement." },
      { title: "3. Handle the miss", body: "On a miss, the Edge Cache pulls the asset from the Origin Server exactly once, caches it locally, then serves the client, so subsequent requests at that edge are hits." },
      { title: "4. Version assets to avoid invalidation", body: "For build-controlled assets (JS/CSS bundles), use content-hashed filenames so a new version is just a new cache key, avoiding the need to purge." },
      { title: "5. Add explicit purge for fixed-URL assets", body: "For assets at stable URLs that must be updated in place, add an authenticated purge path that propagates a delete/refresh to all edges." },
    ],
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
    inStudyPlanSubset: true,
    description: `A single relational database can no longer handle a service's write volume. Design a sharded database layer.

**Functional requirements**
- Route reads/writes for a given row to the correct shard.
- Support adding shards as data grows.

**Non-functional requirements**
- Avoid hot shards (uneven load).
- Queries for a single entity should hit exactly one shard.

**Clarifying context**
- Assume the service is a multi-tenant SaaS application, and most queries are scoped to a single tenant (organization).
- Assume you start with 4 shards and need to be able to grow to dozens over time.

Draw how a query gets routed to the correct shard, and what determines the shard assignment.`,
    rubric: {
      requiredComponents: ["Application Server", "Shard Router", "Shard Key Mapping", "Database Shard"],
      requiredConnections: [
        { from: "Application Server", to: "Shard Router" },
        { from: "Shard Router", to: "Shard Key Mapping", label: "lookup owning shard" },
        { from: "Shard Router", to: "Database Shard", label: "route query" },
      ],
    },
    generalHint: "The single most important decision in this problem is the choice of shard key, everything else follows from it. Ask: what value appears in nearly every query, and does it distribute writes evenly?",
    stepHints: [
      "Given the multi-tenant context, what's a natural candidate for the shard key, and why does it satisfy 'appears in nearly every query'?",
      "Check the even-distribution requirement against that candidate: could a few huge tenants (whales) end up dominating one shard's load even though the key itself hashes evenly? What would you do about that?",
      "Now design the routing mechanism itself: a stateless hash function (\`hash(shard_key) % N\`) versus a directory/lookup table that maps key ranges or specific keys to shards. What does each buy you when N changes?",
      "Trace what happens when you need to add a 5th shard to your original 4: with pure hash-mod-N, how many existing keys need to move? With a directory-based mapping, how many?",
      "Consider a query that needs to join or aggregate across tenants (e.g. an admin dashboard). How would you handle a query that can't be satisfied by a single shard?",
    ],
    referenceExplanation: `## Design rationale

The **Shard Key Mapping** (e.g. \`hash(tenant_id) % num_shards\`, or a directory-based mapping service for more flexibility) determines which **Database Shard** owns a given row, and the **Shard Router** consults it on every query so the Application Server never needs to know the physical layout.

Choosing the shard key is the crux of the design: it must appear in nearly every query (so lookups stay single-shard) and distribute writes evenly (avoiding a hot shard from, e.g., sharding by signup date when most active users are recent, or by tenant when one tenant is far larger than the rest).

## Trade-offs

A directory-based mapping (a lookup table instead of a pure hash) trades a bit of lookup latency and an extra piece of infrastructure for the ability to rebalance by moving individual key ranges rather than re-hashing everything when adding shards. Pure hash-mod-N is simpler and needs no extra lookup, but adding a shard remaps the large majority of keys, forcing a painful bulk migration.

Consistent hashing sits between the two: it minimizes key movement on topology changes like a directory does, without needing a separately maintained lookup table, at the cost of slightly more complex routing logic.

## Common mistakes

- Picking a shard key that doesn't appear in most queries, forcing frequent cross-shard fan-out queries that defeat the purpose of sharding.
- Ignoring skew: hashing evenly distributes keys, but if the workload itself is skewed (one huge tenant), the shard holding that tenant is still hot even though the hash function is "fair."
- Treating resharding as a rare, one-time event instead of designing the mapping layer to support it from day one, then having to bolt it on under production pressure later.

## Edge cases

- A single tenant grows large enough to overwhelm its shard (a "whale" tenant): the common mitigation is giving that tenant a dedicated shard, which requires the mapping layer to support per-key overrides, not just a formula.
- Cross-shard queries (aggregating across all tenants for an admin view) can't be satisfied by a single shard, and need either a fan-out-and-merge query layer or a separate analytics store fed by change-data-capture.
- Transactions that span rows on different shards lose the simple ACID guarantees a single database gives you, worth naming as an explicit limitation rather than glossing over.`,
    solutionSteps: [
      { title: "1. Choose the shard key", body: "Pick tenant_id as the shard key since nearly every query in a multi-tenant app is already scoped to one tenant, keeping queries single-shard." },
      { title: "2. Add a routing layer", body: "The Application Server never talks to a Database Shard directly; it goes through a Shard Router that resolves the correct shard first." },
      { title: "3. Decide how the mapping works", body: "Use a Shard Key Mapping service (a small lookup table of tenant_id -> shard) rather than a pure hash, so you can move individual tenants without reshuffling everyone." },
      { title: "4. Plan for growth", body: "Adding a 5th shard means updating the mapping for a chosen subset of tenants to move to it, not recomputing hash(key) % N for every row in the system." },
      { title: "5. Call out the limits explicitly", body: "State that cross-shard joins/transactions aren't supported the same way as a single database, and that a single oversized tenant may need a dedicated shard as a special case in the mapping." },
    ],
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

**Clarifying context**
- Assume this backs a distributed cache cluster starting with 6 nodes, expected to grow and shrink over time as load changes.
- You don't need to design replication for this exercise, focus purely on the key-to-node mapping.

Draw the components that make up the hashing layer and how a lookup for a key is resolved to a node.`,
    rubric: {
      requiredComponents: ["Client", "Hash Ring Router", "Virtual Nodes", "Storage Node"],
      requiredConnections: [
        { from: "Client", to: "Hash Ring Router", label: "lookup(key)" },
        { from: "Hash Ring Router", to: "Virtual Nodes", label: "hash(key) -> ring position" },
        { from: "Virtual Nodes", to: "Storage Node", label: "maps to" },
      ],
    },
    generalHint: "Picture a circle (the hash space) rather than a line. A key's owner is whichever node comes next going clockwise from the key's position on that circle.",
    stepHints: [
      "Start with the basic idea: hash both keys and nodes into the same numeric space, and place them as points on a ring. How do you decide which node owns a given key?",
      "Now think about what happens when one node is removed: only which keys need to move (the ones between the removed node and the previous node on the ring), not all of them, why?",
      "With only a handful of physical nodes placed randomly on the ring, some nodes end up owning a much bigger arc than others purely by chance. What technique fixes this without adding physical machines?",
      "Virtual nodes: each physical Storage Node gets mapped to many points on the ring instead of one. How does that smooth out the uneven-arc problem?",
      "Trace a full lookup: Client asks for key K, Hash Ring Router computes hash(K), walks clockwise to the nearest Virtual Node, which maps back to a physical Storage Node. Make sure your diagram shows that indirection (virtual node to physical node), not just key to physical node directly.",
    ],
    referenceExplanation: `## Design rationale

The **Hash Ring Router** hashes both keys and nodes onto the same circular hash space; a key is owned by the first node found walking clockwise from its position. This means adding or removing one **Storage Node** only affects the keys between it and its neighbor, not the whole keyspace, which is the entire point of consistent hashing over plain \`hash(key) % N\`.

**Virtual Nodes** (each physical Storage Node mapped to many points on the ring, commonly 100-200 per node) solve the uneven-distribution problem that plain consistent hashing has with few physical nodes. Without them, one unlucky node placement can own a disproportionate arc of the ring purely by chance, since with only a handful of random points the law of large numbers hasn't kicked in yet.

## Trade-offs

More virtual nodes per physical node give smoother load distribution but cost more memory for the ring structure and slightly more computation per lookup (more points to consider). In practice a few hundred virtual nodes per physical node is a reasonable default that balances both.

Consistent hashing trades a small amount of routing complexity (maintaining the ring, virtual node mapping) for a large operational win: adding or removing capacity becomes a targeted, bounded data movement instead of a near-total remap.

## Common mistakes

- Implementing consistent hashing without virtual nodes and being surprised when load is still uneven across physical nodes.
- Forgetting that the ring itself needs to be kept consistent across all callers (Hash Ring Router instances), typically via a shared, versioned configuration or a coordination service, otherwise different routers can disagree about who owns a key.
- Confusing "minimal key movement on node change" with "zero key movement", some keys always move when the topology changes, the property is that it's a small, bounded fraction, not none.

## Edge cases

- Two nodes hashing to the exact same ring position (collision) needs a tie-breaking rule, though this is rare in practice with a good hash function and enough virtual nodes.
- A node rejoining the cluster after a temporary outage needs to reclaim its portion of the ring correctly, effectively re-running the "add a node" logic.
- This is the same mechanism behind DynamoDB, Cassandra, and most distributed caches' partitioning layer, worth naming as prior art in an interview setting.`,
    solutionSteps: [
      { title: "1. Set up the ring", body: "Hash the identifier space onto a circle (e.g. 0 to 2^32-1 wrapping around). Hash each Storage Node's ID onto a point on that same circle." },
      { title: "2. Define key ownership", body: "For any key, hash it onto the ring and walk clockwise to the first node found. That node owns the key." },
      { title: "3. Add virtual nodes for balance", body: "Instead of one point per physical Storage Node, place many (e.g. 200) virtual points per node around the ring, so each physical node's total owned arc is close to N/total-nodes on average." },
      { title: "4. Handle node changes", body: "Adding a node means placing its virtual points on the ring, which only reassigns the keys that fall between those new points and their clockwise predecessor, a small fraction of the total keyspace." },
      { title: "5. Wire the lookup path", body: "A Client's lookup(key) call goes to the Hash Ring Router, which hashes the key, finds the nearest Virtual Node clockwise, and resolves it to the owning physical Storage Node." },
    ],
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
    inStudyPlanSubset: true,
    description: `A cluster of worker nodes needs exactly one active leader at a time to coordinate work, with automatic failover if the leader dies.

**Functional requirements**
- Exactly one node acts as leader at any time.
- If the leader crashes, a new leader is elected within a bounded time.

**Non-functional requirements**
- Must tolerate node failures without losing the "single leader" guarantee (no split-brain).

**Clarifying context**
- Assume a cluster of 5-10 worker nodes, any of which could become leader.
- Failover within a few seconds is acceptable, this is not a sub-100ms real-time system.

Draw the coordination component the nodes use to elect and detect the leader, and how followers find out who's leader.`,
    rubric: {
      requiredComponents: ["Worker Node", "Coordination Service", "Leader Lease", "Leader Node"],
      requiredConnections: [
        { from: "Worker Node", to: "Coordination Service", label: "attempt to acquire lease" },
        { from: "Coordination Service", to: "Leader Lease", label: "grants with TTL" },
        { from: "Coordination Service", to: "Leader Node", label: "designates" },
      ],
    },
    generalHint: "You cannot implement safe leader election with a plain 'last write wins' flag in a regular database, since that has no way to distinguish a leader that's alive-but-slow from one that's truly dead. You need a component with a built-in consensus guarantee.",
    stepHints: [
      "Why is a simple database row like \`leader = node_3\` unsafe? Think about what happens if two nodes both try to write that row at nearly the same time.",
      "A Coordination Service (like ZooKeeper, etcd, or Consul) solves this because it's itself built on a quorum-based consensus protocol (Raft or ZAB) internally, it can only ever grant one lease at a time even under concurrent requests.",
      "Design the acquisition flow: every Worker Node races to acquire a Leader Lease from the Coordination Service. What must be true of that acquisition operation for exactly one node to win?",
      "Now design failure detection: the winner becomes the Leader Node, but how does the system find out if it crashes? Consider a TTL on the lease that the leader must actively renew.",
      "Trace the failover timeline: leader crashes and stops renewing, lease TTL expires, another Worker Node's next acquisition attempt succeeds. What determines the bound on failover time, and what's the trade-off in picking that TTL (too short vs. too long)?",
    ],
    referenceExplanation: `## Design rationale

The **Coordination Service** (ZooKeeper, etcd, or Consul, themselves built on a consensus protocol like Raft or ZAB) is the single source of truth nodes rely on to avoid split-brain: it can only ever grant one **Leader Lease** at a time because it uses quorum-based consensus internally, meaning a majority of its own nodes must agree before any write (including a lease grant) is considered committed.

Each **Worker Node** tries to acquire the lease; whoever succeeds becomes the **Leader Node** and must periodically renew the lease before its TTL expires. If the leader crashes and stops renewing, the lease expires and another worker's acquisition attempt succeeds, bounding failover time by the lease TTL.

## Trade-offs

A short lease TTL detects a dead leader faster but requires more frequent renewal traffic and is more sensitive to transient network blips causing an unnecessary failover (a healthy leader momentarily unable to renew in time). A longer TTL is more tolerant of transient issues but means a genuinely dead leader goes undetected, and unreplaced, for longer.

Using a managed coordination service is significantly simpler and safer than implementing your own consensus protocol from scratch, the trade-off is an operational dependency on that service's own availability, itself run as a quorum of typically 3 or 5 nodes to tolerate its own failures.

## Common mistakes

- The key insight candidates often miss: attempting to implement leader election with a simple "last write wins" flag in a regular (non-consensus) database, which has no way to detect a leader that's alive-but-partitioned versus truly dead, and no way to guarantee only one write wins under concurrent attempts.
- Not handling lease renewal failure gracefully: a leader that fails to renew (e.g. due to a GC pause) should step down and stop acting as leader, not assume it's still leader just because it hasn't been told otherwise.
- Assuming failover is instantaneous; it is bounded by the lease TTL plus however long the new leader takes to start acting, this bound should be stated explicitly.

## Edge cases

- Clock/processing pauses: if a leader pauses (GC, scheduling delay) past the TTL, it may resume believing it's still leader while another node has already taken over, this is why actions taken "as leader" often need an additional fencing token check against downstream systems.
- Network partition: a leader that's alive but cut off from the Coordination Service should lose its lease and step down, exactly the case the lease TTL mechanism is designed to handle.
- Coordination Service itself losing quorum (e.g. losing 3 of 5 of its own nodes) means no new leases can be granted or renewed at all, a total system dependency worth stating.`,
    solutionSteps: [
      { title: "1. Rule out the naive approach", body: "A plain database flag for 'who is leader' can't safely resolve concurrent writers, there's no atomic, quorum-backed compare-and-set." },
      { title: "2. Introduce a coordination service", body: "Use a Coordination Service (etcd/ZooKeeper/Consul) that internally runs a consensus protocol, guaranteeing at most one successful lease grant at a time even under concurrent requests." },
      { title: "3. Design the acquisition race", body: "Every Worker Node attempts to acquire a Leader Lease (an atomic create-if-not-exists with a TTL) from the Coordination Service. Exactly one succeeds and becomes the Leader Node." },
      { title: "4. Add renewal for liveness detection", body: "The Leader Node must periodically renew its lease before the TTL expires. Stopping renewal (e.g. on crash) lets the lease expire." },
      { title: "5. Wire the failover path", body: "When the lease expires, the next Worker Node acquisition attempt succeeds, and that node becomes the new Leader Node, bounding failover time by the TTL." },
    ],
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

**Clarifying context**
- Assume the use case is preventing duplicate processing of scheduled jobs across a fleet of worker instances, not protecting a financial transaction.
- Typical lock hold time is a few seconds to a couple minutes.

Draw the components involved in acquiring, holding, and releasing a lock.`,
    rubric: {
      requiredComponents: ["Application Instance", "Lock Service", "Lock Store", "Shared Resource"],
      requiredConnections: [
        { from: "Application Instance", to: "Lock Service", label: "acquire(key, ttl)" },
        { from: "Lock Service", to: "Lock Store", label: "atomic set-if-not-exists" },
        { from: "Application Instance", to: "Shared Resource", label: "access while holding lock" },
      ],
    },
    generalHint: "Two properties matter here: atomicity of the acquire operation (so exactly one caller wins a race) and a TTL (so a crashed holder doesn't lock everyone out forever). Design each explicitly.",
    stepHints: [
      "What operation on the Lock Store must be atomic, and why would a naive 'check if key exists, then set it' (two separate operations) be unsafe under concurrency?",
      "A single atomic 'set if not exists, with an expiry' (like Redis's SET key value NX PX ttl) closes that race. Why does bundling the TTL into the same atomic operation matter?",
      "Now think about release: if Application Instance A's lock expires and Instance B acquires it, then A (unaware its lock expired) tries to release 'its' lock, what could go wrong, and how would you prevent A from releasing B's lock?",
      "A common fix is a unique token per acquisition, checked on release ('release only if the stored value still matches my token'). Trace why this closes the gap.",
      "Finally, think about the TTL-versus-safety tension: if a holder pauses (GC, scheduling delay) longer than the TTL, another instance can acquire the lock while the first still believes it holds it. What would you need at the Shared Resource itself to make this truly safe, and is that in scope for a 'good enough' job-deduplication use case?",
    ],
    referenceExplanation: `## Design rationale

The **Lock Store** (Redis with \`SET key value NX PX ttl\`, or a coordination service like etcd) performs an atomic "set if not exists with TTL". The atomicity is what prevents two Application Instances from both believing they hold the lock (a naive check-then-set has a race window between the check and the set), and the TTL is what prevents a crashed holder from deadlocking everyone else indefinitely.

The **Lock Service** wraps this with a client-side identity token per lock attempt, so release only succeeds if the caller still holds the same lock instance. This protects against a client releasing a lock it no longer owns after its TTL expired and someone else acquired it in the meantime.

## Trade-offs

A single Lock Store node is simple but is itself a single point of failure; a multi-node quorum-based lock (e.g. Redlock, or using etcd/ZooKeeper directly) tolerates a store node failing, at the cost of more operational complexity and slightly higher acquire latency.

A shorter TTL reduces how long a crashed holder blocks others, but increases the risk of a slow-but-alive holder having its lock expire out from under it. This is inherent to any TTL-based approach and should be sized to comfortably exceed the expected work duration.

## Common mistakes

- Implementing acquire as two separate operations (check, then set) instead of one atomic operation, reintroducing the exact race the lock was meant to prevent.
- Releasing a lock without checking a per-holder identity token first, allowing a instance to accidentally release a lock it no longer owns.
- Treating a TTL-based distributed lock as safe for correctness-critical mutual exclusion (e.g. "exactly once" financial operations) without acknowledging its known limitation.

## Edge cases

- Caveat worth stating explicitly: TTL-based locks are only as safe as your clock and processing-time assumptions. If a holder pauses (GC, scheduling delay) past the TTL, another Application Instance can acquire the lock while the first still thinks it holds it, so this pattern alone is not safe for correctness-critical mutual exclusion without an additional fencing token check at the Shared Resource itself.
- Network partition between an Application Instance and the Lock Store during a renewal attempt should be treated the same as a crash: the instance should assume it may have lost the lock rather than assuming it still holds it.
- Choosing too short a TTL relative to actual job duration causes "double processing" exactly the bug this design exists to prevent, sizing the TTL is a real design decision, not an afterthought.`,
    solutionSteps: [
      { title: "1. Identify the race condition", body: "Two Application Instances calling 'check if lock exists, then set it' as separate steps can both pass the check before either sets it, both believe they hold the lock." },
      { title: "2. Make acquisition atomic", body: "Use a single atomic operation on the Lock Store (set-if-not-exists with a TTL) so exactly one Application Instance's acquire call can succeed at a time." },
      { title: "3. Add a TTL for crash recovery", body: "The TTL bundled into the same atomic set ensures a crashed holder's lock is automatically released after a bounded time, instead of deadlocking everyone else." },
      { title: "4. Prevent releasing someone else's lock", body: "Have the Lock Service generate a unique token per acquisition, and make release conditional on that token still matching what's stored, so an instance can't release a lock it no longer owns." },
      { title: "5. State the known limitation", body: "Explicitly note that a paused holder (past the TTL) can coexist with a new holder; true correctness-critical exclusion needs a fencing token checked at the Shared Resource, beyond what the lock alone guarantees." },
    ],
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
    inStudyPlanSubset: true,
    description: `Design a message queue (like a simplified SQS/Kafka) that decouples producers from consumers for asynchronous work processing.

**Functional requirements**
- Producers enqueue messages; consumers dequeue and process them.
- A message is not lost if a consumer crashes mid-processing.
- Support multiple consumers processing in parallel.

**Non-functional requirements**
- At-least-once delivery.
- Durable storage of unprocessed messages.

**Clarifying context**
- Assume this is for background job processing (e.g. sending emails, resizing images), not strictly ordered event streaming.
- Consumers should be assumed to be idempotent, since at-least-once delivery means occasional duplicate processing is possible.

Draw the path a message takes from producer to consumer, including how in-flight messages are protected from loss.`,
    rubric: {
      requiredComponents: ["Producer", "Queue Broker", "Message Store", "Consumer"],
      requiredConnections: [
        { from: "Producer", to: "Queue Broker", label: "enqueue" },
        { from: "Queue Broker", to: "Message Store", label: "persist" },
        { from: "Consumer", to: "Queue Broker", label: "poll / ack" },
      ],
    },
    generalHint: "Think about a message's lifecycle as a state machine: enqueued, being processed, and either acknowledged (done) or returned to the queue. What mechanism moves it between 'being processed' and 'returned to the queue' if the consumer disappears?",
    stepHints: [
      "First, durability: why must the broker persist a message before acknowledging the producer, rather than just holding it in memory?",
      "Now the consumer side: when a Consumer polls a message, should it be immediately deleted from the queue, or something else? Think about what happens if the consumer crashes right after polling but before finishing its work.",
      "A visibility timeout: the message becomes temporarily invisible to other consumers when polled, but isn't deleted until explicitly acknowledged. What happens if that timeout expires with no ack?",
      "That's what gives you at-least-once delivery, trace why it's 'at least once' and not 'exactly once', and why that pushes a requirement onto the consumer's own processing logic.",
      "Finally, think about parallelism: multiple consumers reading the same queue naturally parallelizes work, but what would you need to add if messages needed to be processed in order for a given key (e.g. all events for one user processed in sequence)?",
    ],
    referenceExplanation: `## Design rationale

The **Queue Broker** persists every message to the **Message Store** before acknowledging the Producer, so a broker crash after enqueue doesn't lose data. Durability comes from writing to disk (and often replicating) before responding to the producer, not from an in-memory-only queue.

For consumer safety, the broker uses a visibility timeout: when a **Consumer** polls a message, it becomes invisible to other consumers for a bounded window rather than being deleted immediately. The consumer must explicitly ack after finishing, and if it crashes mid-processing, the message becomes visible again for another consumer to pick up, this is what gives at-least-once delivery.

## Trade-offs

At-least-once delivery (the visibility-timeout approach) is simple and robust but means the same message can be delivered more than once (e.g. if the consumer finishes processing but crashes before sending the ack), so consumers must be idempotent. Exactly-once delivery is possible but requires significantly more machinery (deduplication IDs, transactional processing) and is rarely worth the complexity for background job processing.

Multiple consumers reading the same queue naturally parallelizes processing, but ordering across consumers isn't guaranteed unless messages are partitioned (as in Kafka) so that all messages for a given key go to the same consumer, trading some parallelism for per-key ordering.

## Common mistakes

- Deleting a message from the store as soon as a consumer polls it, rather than only after an explicit ack, this loses the message entirely if the consumer then crashes.
- Assuming at-least-once delivery means "usually once" and skipping idempotency in consumer logic, duplicate delivery is a normal, expected occurrence, not a rare edge case.
- Setting the visibility timeout shorter than typical processing time, causing a message to become visible to another consumer while the first is still legitimately working on it, leading to duplicate work more often than necessary.

## Edge cases

- A "poison pill" message that a consumer can never successfully process (e.g. malformed data causing a crash every time) will cycle forever between polled and re-visible unless you add a max-retry count and a dead-letter queue.
- A consumer that's slow but not crashed can have its message become visible to another consumer purely due to timeout, resulting in two consumers doing the same work concurrently, worth naming as an accepted trade-off of at-least-once delivery.
- Producer-side retries (e.g. on a network timeout to the broker) can themselves cause duplicate enqueues, a separate source of duplication from the consumer side.`,
    solutionSteps: [
      { title: "1. Trace the write path", body: "A Producer enqueues a message to the Queue Broker, which persists it to the Message Store before acknowledging the producer, guaranteeing durability." },
      { title: "2. Design the poll step", body: "A Consumer polls the Queue Broker for a message. Instead of deleting it immediately, the broker marks it invisible for a bounded visibility timeout." },
      { title: "3. Add explicit acknowledgment", body: "The Consumer must send an explicit ack after finishing processing, only then is the message actually removed from the Message Store." },
      { title: "4. Handle the crash case", body: "If no ack arrives before the visibility timeout expires, the message becomes visible again and another Consumer can pick it up, this gives at-least-once delivery." },
      { title: "5. State the consumer requirement", body: "Because delivery is at-least-once, explicitly require Consumers to be idempotent (e.g. dedupe by message ID) since the same message can legitimately arrive twice." },
    ],
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

**Clarifying context**
- Assume a large user base where each user's connection can land on any one of many stateless gateway instances behind a load balancer.
- Group chats can have up to a few hundred members for this exercise, not millions.

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
    generalHint: "The tricky part isn't sending a message, it's that the sender and recipient can be connected to two completely different gateway server instances. How does one instance find out which instance holds the recipient's connection?",
    stepHints: [
      "With many stateless gateway instances behind a load balancer, a user's WebSocket connection lives on exactly one specific instance. What piece of shared state would let any instance find 'which instance holds user X's connection'?",
      "A Presence Store (e.g. Redis) mapping user ID to gateway instance ID is the natural fit. Trace how the Chat Service uses it after receiving a message.",
      "Now think about durability: should a message be persisted to the Message Store before or after attempting real-time delivery? What failure does persisting first protect against?",
      "For offline recipients, since there's no active WebSocket connection to push to, what does the recipient do differently on reconnect to catch up on missed messages?",
      "For group chats, trace what happens when a message needs to reach N members who could be spread across many different gateway instances, how does that change the 'lookup recipient's gateway' step from a single lookup into something else?",
    ],
    referenceExplanation: `## Design rationale

The **WebSocket Gateway** maintains a persistent connection per online client. Because a user's connection can be on any gateway instance in a fleet, the **Presence Store** (typically Redis) maps user ID to which gateway instance holds their connection, so the Chat Service knows where to route a push.

Every message is persisted to the **Message Store** first, regardless of the recipient's online status. This guarantees no loss and gives offline recipients a place to fetch missed messages from on reconnect, decoupling delivery from storage entirely.

## Trade-offs

Persisting before attempting real-time delivery adds a small amount of latency to every message but guarantees durability even if the push attempt fails or the recipient is offline. Attempting delivery first and persisting only on failure would be faster in the common case but risks losing a message if the server crashes between the two steps.

Group chats fan out the same message to multiple recipients' gateway connections (or via presence lookups for each group member); at scale this fan-out is often handled by a pub/sub layer between Chat Service instances rather than direct instance-to-instance calls, trading a bit of latency for much simpler routing logic as group size and gateway fleet size grow.

## Common mistakes

- Holding presence information only in each gateway instance's local memory instead of a shared store, making it impossible for other instances to find where a given user is connected.
- Attempting real-time push without persisting first, risking silent message loss on a crash.
- Treating group chat as "just call 1:1 send N times" without considering that N recipients' connections may be spread across many gateway instances, requiring a fan-out mechanism rather than N sequential direct lookups.

## Edge cases

- A recipient reconnecting after being offline needs a clear "sync since last seen message ID/timestamp" flow against the Message Store, not just future pushes.
- A user with multiple active devices/sessions (phone + laptop) needs presence and delivery to account for multiple simultaneous gateway connections per user, not just one.
- Message ordering within a conversation should be preserved even if delivery attempts race across different gateway instances, typically by having the Chat Service assign a sequence number at persistence time.`,
    solutionSteps: [
      { title: "1. Trace the online happy path", body: "Sender Client sends over its WebSocket Gateway connection to the Chat Service, which needs to find and push to the Recipient Client's connection." },
      { title: "2. Solve the 'which instance' problem", body: "Add a Presence Store mapping user ID to gateway instance, so the Chat Service can look up exactly which WebSocket Gateway instance holds the recipient's live connection." },
      { title: "3. Persist before pushing", body: "The Chat Service writes the message to the Message Store first, then attempts the real-time push, so the message is never lost even if the push fails." },
      { title: "4. Handle the offline case", body: "If the Presence Store shows the recipient has no active connection, skip the push. On reconnect, the Recipient Client fetches unread messages from the Message Store directly." },
      { title: "5. Extend to groups", body: "For a group message, the Chat Service looks up presence for every member and pushes to each one that's online, persisting once regardless of how many recipients are currently connected." },
    ],
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

**Clarifying context**
- Assume dozens of different services across the platform can trigger notifications (likes, comments, follows, system alerts).
- Assume a popular post can generate thousands of "like" events within seconds.

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
    generalHint: "The non-functional requirement ('should not block the triggering service') is the whole design constraint here. What architectural pattern decouples a fast-returning caller from slow downstream work?",
    stepHints: [
      "If the Triggering Service called the Notification Service directly and waited for an email provider to respond, what would happen to the user-facing 'like' action's latency, and what happens if the email provider is briefly down?",
      "An Event Queue between them means the Triggering Service can return immediately after publishing. What does that decouple, exactly, and what does the queue absorb during a burst of events (like a viral post)?",
      "Now design the consumption side: the Notification Service needs to know both the user's preferred channel and whether they even want this type of notification. Where does that decision get made?",
      "Given the clarifying context (a popular post generating thousands of like-events at once), would you notify the recipient for every single like individually? What would you do instead, and where would that batching logic live?",
      "Trace failure handling: if the Push/Email/SMS Provider is temporarily down, what happens to that notification, does it get retried, and from where?",
    ],
    referenceExplanation: `## Design rationale

The **Triggering Service** (e.g. the "likes" service) only publishes an event to the **Event Queue** and returns immediately. Decoupling it from notification delivery means a slow email provider can never add latency to the user-facing like action, which is the core non-functional requirement of this design.

The **Notification Service** consumes events asynchronously, checks the **User Preferences Store** to see which channels the user actually wants (and whether they're within rate limits, e.g. batch 10 likes into one notification instead of sending 10 separate ones), then dispatches to the appropriate **Push/Email/SMS Provider**.

## Trade-offs

Using a queue between trigger and delivery adds a small amount of end-to-end latency (the event has to be consumed asynchronously rather than delivered synchronously) in exchange for isolating the triggering service from downstream failures entirely, an easy trade given notifications don't need sub-second delivery.

Batching notifications (e.g. "12 people liked your post" instead of 12 separate pushes) improves user experience and reduces provider costs, but requires the Notification Service to hold events for a short window before dispatching, adding a small, deliberate delay versus notifying on every single event immediately.

## Common mistakes

- Calling the notification/email/push provider synchronously from the triggering service's request path, coupling an unrelated user action's latency (and error rate) to a third-party provider's availability.
- Not checking user preferences before dispatch, resulting in notifications for channels or event types the user explicitly opted out of.
- No batching or rate limiting logic, causing a viral post to generate a "notification storm" of dozens of individual pushes for the same underlying event type.

## Edge cases

- A burst of thousands of like-events for one popular post should collapse into one aggregated notification per recipient, not one per like, which requires either a time-window batching step or deduplication logic in the Notification Service.
- Provider failures (push/email/SMS temporarily down) should be retried with backoff from the queue rather than silently dropped, using the queue's own redelivery mechanism.
- A user who deletes their account or revokes push permissions mid-flight should have in-flight notifications for them safely no-op rather than error.`,
    solutionSteps: [
      { title: "1. Decouple trigger from delivery", body: "The Triggering Service publishes an event to an Event Queue and returns immediately, never waiting on notification delivery." },
      { title: "2. Consume asynchronously", body: "The Notification Service consumes events from the queue independently, so its pace (and any downstream slowness) never affects the triggering service." },
      { title: "3. Apply user preferences", body: "Before dispatching, check the User Preferences Store for the user's opted-in channels and any rate limits, filtering or suppressing accordingly." },
      { title: "4. Batch bursty events", body: "For high-volume event types (many likes on one post), aggregate within a short time window into a single notification per recipient instead of dispatching one per event." },
      { title: "5. Dispatch and handle failure", body: "Send to the appropriate Push/Email/SMS Provider; on failure, rely on the queue's redelivery/retry mechanism rather than dropping the notification." },
    ],
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
    inStudyPlanSubset: true,
    description: `Design a social media news feed (like Twitter's home timeline): when a user opens the app, they see recent posts from people they follow, ranked roughly by recency.

**Functional requirements**
- Users can post; followers should see the post in their feed.
- Feed loads quickly even for users following thousands of accounts.

**Non-functional requirements**
- Handle celebrity accounts with millions of followers without a huge write spike per post.

**Clarifying context**
- Assume a Twitter-like following model (not mutual friendship): most users follow hundreds of accounts, a small number of celebrity accounts have tens of millions of followers.
- Ranking is by recency only for this exercise, not a personalized relevance ranking model.

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
    generalHint: "There isn't one right answer here, there are two opposite strategies (push work to write-time vs. pull work to read-time), and the real design challenge is combining them based on follower count.",
    stepHints: [
      "Strategy 1, fan-out-on-write: when a user posts, immediately push the post into every follower's precomputed feed. Why does this make reads extremely fast?",
      "Now apply that strategy to a celebrity with 50 million followers. What has to happen at the moment they post, and why is that a problem?",
      "Strategy 2, fan-out-on-read: don't precompute anything at write time; instead, when a user loads their feed, query posts from everyone they follow live. Why would this be fine for a celebrity's post specifically, but bad as the only strategy for a normal user following hundreds of accounts?",
      "Now combine them: most posts (from normal users) use fan-out-on-write, but posts from very-high-follower-count accounts skip it. What does the Feed Service need to do differently when assembling a feed to account for those skipped posts?",
      "Think about the threshold: how would you decide whether an account is 'celebrity enough' to switch strategies, and what would happen if that threshold were set far too low or too high?",
    ],
    referenceExplanation: `## Design rationale

This is a **fan-out-on-write** design: when a typical user posts, the **Fan-out Service** immediately pushes the new post into every follower's precomputed **Feed Cache** entry, so reading a feed later is just one cache read. This is fast because the expensive work (finding all followers, writing N entries) happened once at post time instead of on every feed load.

The celebrity problem is why this needs a hybrid approach: fanning out a single post to 50 million followers on write would be enormous write amplification, a single post turning into tens of millions of cache writes. Celebrity posts instead skip fan-out and get merged into followers' feeds at read time (**fan-out-on-read**), the Feed Service, when loading a feed, combines the precomputed cache with a live query for any celebrities the user follows.

## Trade-offs

This read/write trade-off (push for normal users, pull for high-fan-out accounts) is the core insight interviewers look for; a pure push or pure pull design each breaks down at one end of the follower-count distribution. Pure push makes celebrity posts catastrophically expensive to write. Pure pull makes every feed load expensive for normal users who follow hundreds of accounts, since it means hundreds of live queries merged at read time.

Precomputed feeds (fan-out-on-write) trade storage (every follower gets their own copy of feed entries) for read speed. This is generally a good trade for a read-heavy product like a social feed, where the same feed is loaded far more often than any single post is created.

## Common mistakes

- Applying fan-out-on-write uniformly to every account regardless of follower count, which works in a demo but falls over in production the moment one account gets popular.
- Applying fan-out-on-read uniformly instead, which keeps writes cheap but makes every feed load slow, defeating the purpose of a "fast feed load" requirement.
- Forgetting that the celebrity threshold needs to be a tunable, monitored parameter, not a hardcoded constant, since which accounts qualify changes over time.

## Edge cases

- A normal user's feed load must now merge two sources (cache plus live celebrity query) and interleave them by recency, this merge step is easy to overlook when only diagramming the "normal" path.
- An account crossing the celebrity threshold (going viral) mid-lifecycle needs a transition plan: existing fanned-out cache entries don't need to be retracted, but future posts switch strategy.
- A user who follows an unusually large number of celebrities (a "power user" following patterns skewed toward top accounts) can still end up with a slow read path even under the hybrid design, worth noting as a residual scaling concern.`,
    solutionSteps: [
      { title: "1. Design the write path for typical users", body: "A Post Service persists the post to the Post Store, then triggers the Fan-out Service, which pushes the post into every follower's Feed Cache entry immediately." },
      { title: "2. Design the fast read path", body: "The Feed Service loads a user's feed by reading their precomputed Feed Cache entry, a single fast read regardless of how many accounts they follow." },
      { title: "3. Identify the celebrity problem", body: "For an account with tens of millions of followers, fanning out one post means tens of millions of cache writes, far too expensive to do synchronously (or even asynchronously) per post." },
      { title: "4. Switch strategy above a threshold", body: "For accounts above a follower-count threshold, skip fan-out-on-write entirely; their posts are not pushed to followers' Feed Cache." },
      { title: "5. Merge at read time for celebrities", body: "The Feed Service, when assembling a feed, combines the precomputed Feed Cache with a live, on-demand query for posts from any celebrities the user follows, merging both by recency." },
    ],
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
    description: `Design a distributed web crawler that starts from a set of seed URLs, downloads pages, extracts links, and crawls those too, at scale, without hammering any single site or crawling the same page repeatedly.

**Functional requirements**
- Crawl breadth-first from seed URLs, following extracted links.
- Avoid recrawling the same URL.
- Respect per-host rate limits (politeness).

**Non-functional requirements**
- Scale to billions of pages via multiple crawler workers.

**Clarifying context**
- Assume the crawl target is the open web (arbitrary, unknown hosts), so politeness (not overwhelming any one site) is a hard requirement, not optional.
- You don't need to design the downstream indexing/ranking pipeline, only crawling and discovery.

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
    generalHint: "This is a graph traversal (BFS) at a scale where 'have I visited this node' and 'am I hitting this neighbor too fast' both need dedicated infrastructure, not just an in-memory visited-set.",
    stepHints: [
      "Start with the simplest version: a queue of URLs to visit and a set of visited URLs, classic BFS. What breaks when you try to run this with hundreds of parallel Crawler Worker processes instead of one?",
      "Politeness: if many workers pull URLs from a shared queue without regard to host, you could end up firing dozens of concurrent requests at the same domain. How would you structure the URL Frontier to prevent that?",
      "Dedup at scale: a simple in-memory visited-set doesn't work across many workers or billions of URLs. What kind of data structure gives you 'have I seen this before' checks at that scale without storing every URL in full?",
      "Trace the loop: a worker fetches a page, needs to find new URLs in it, and needs to check each one against what's already been seen before it goes back on the frontier. Which component does each step?",
      "Think about why you'd store the fetched Page Store contents at all, given this problem doesn't require you to design indexing or ranking. What does decoupling 'fetching' from 'processing' buy you even if processing is out of scope?",
    ],
    referenceExplanation: `## Design rationale

The **URL Frontier** is more than a queue, it's partitioned per-host with per-host rate limiting so a **Crawler Worker** never fires two requests at the same domain too close together (politeness), while still keeping many other hosts' URLs available for other workers to fetch concurrently.

After a fetch, the **Link Extractor** pulls new URLs out of the page and checks each against the **Dedup Store** (a large-scale set, often a Bloom filter for space efficiency at billions of URLs) before enqueueing only genuinely new URLs back onto the Frontier, this is what prevents infinite recrawl loops on cyclic links.

The **Page Store** decouples fetching from downstream processing (indexing, ranking, etc.), which isn't this problem's concern but is why crawlers store raw pages rather than only extracting-and-discarding, a separate pipeline can consume from the Page Store independently of the crawl itself.

## Trade-offs

A Bloom filter for the Dedup Store is extremely space-efficient at billions of URLs but has a small false-positive rate (occasionally believing a genuinely new URL has already been seen, causing it to be skipped), a trade-off usually acceptable given the alternative (storing every full URL) doesn't scale.

Partitioning the frontier by host adds complexity to the queue implementation but is non-negotiable for politeness at scale, a flat shared queue cannot enforce a per-host rate limit without workers coordinating explicitly, which doesn't scale either.

## Common mistakes

- Using a single shared queue with no host-partitioning, leading to accidental denial-of-service against smaller sites when many workers happen to pull several of that site's URLs concurrently.
- Storing a full in-memory (or single-node database) set of visited URLs, which doesn't scale to billions of URLs or to many distributed worker processes needing to check it concurrently.
- Not handling redirect chains and canonicalization (the same page reachable via multiple URL variants, e.g. with/without trailing slash or tracking parameters), causing duplicate crawls that a naive exact-string dedup check won't catch.

## Edge cases

- Crawler traps: pages that generate infinite unique URLs (e.g. calendar pages with a "next day" link forever), need a bound like max crawl depth or max URLs per host.
- robots.txt must be fetched and respected per host before crawling begins there, a politeness requirement beyond just rate limiting.
- A host that goes down mid-crawl should have its queued URLs backed off and retried later rather than the worker retrying immediately in a tight loop.`,
    solutionSteps: [
      { title: "1. Start from seeds", body: "Seed URLs are loaded into the URL Frontier as the initial queue of pages to crawl." },
      { title: "2. Dequeue with politeness", body: "A Crawler Worker dequeues from the URL Frontier, which is partitioned per host so no single host receives too many concurrent requests across all workers." },
      { title: "3. Fetch and store", body: "The worker fetches the page and writes it to the Page Store, decoupling the raw crawl from any downstream processing." },
      { title: "4. Extract and dedup new links", body: "A Link Extractor pulls URLs out of the fetched page and checks each against the Dedup Store (a Bloom filter at this scale) to filter out already-seen URLs." },
      { title: "5. Close the loop", body: "Genuinely new URLs are enqueued back onto the URL Frontier, continuing the breadth-first traversal, bounded by crawl-trap protections like max depth." },
    ],
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

**Clarifying context**
- Assume uploaded files can be several GB and transcoding a single video into multiple resolutions can take minutes, this must not block the uploader.
- Assume a global viewer base with widely varying network conditions, from mobile 3G to fiber.

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
    generalHint: "Treat this as two almost entirely separate systems sharing only a video ID: an asynchronous processing pipeline (upload to many encoded variants) and a playback path (viewer to CDN) that doesn't care how those variants were produced.",
    stepHints: [
      "Given that transcoding can take minutes, should the Upload Service wait for transcoding to finish before responding to the Uploader? What should happen instead?",
      "Design the async processing chain: raw upload lands somewhere, then what triggers transcoding, and where do the transcoded outputs go?",
      "For a single video, transcoding produces multiple resolution/bitrate variants. What additional piece of metadata does a player need beyond just the video files themselves, in order to switch quality mid-playback?",
      "That's a manifest (HLS/DASH) listing available variants. Whose decision is it to switch resolution during playback, the server's or the client's, and why does that matter for how adaptive bitrate actually works?",
      "Finally, justify why the CDN is essential rather than optional here: think about video's bandwidth profile compared to, say, a JSON API response, and what serving that from a single origin globally would cost in both latency and infrastructure load.",
    ],
    referenceExplanation: `## Design rationale

Upload and playback are intentionally separate pipelines running at very different scales: the **Transcoding Service** runs asynchronously after upload (often chunked into parallel jobs per resolution) to convert one raw file into multiple resolution/bitrate variants, so it doesn't block the uploader and can be scaled independently of viewer traffic.

The **Encoded Video Store** holds all variants plus a manifest (e.g. HLS/DASH) describing them; this manifest is what lets a **Viewer**'s player switch resolution mid-stream as bandwidth changes. Adaptive bitrate is a client-side decision driven by server-provided options, not a server pushing a fixed stream, the player monitors its own buffering and switches to a lower or higher bitrate variant accordingly.

## Trade-offs

Processing asynchronously means the uploader gets a fast response (upload accepted) well before the video is actually watchable, requiring the product to show a "processing" state rather than instant availability, an acceptable trade given transcoding genuinely takes real time.

The **CDN** is essential here, not optional: video is the highest-bandwidth content type on the platform, and serving it from origin at scale would be both slow (distance) and prohibitively expensive, nearly all playback bytes should come from edge caches rather than the Encoded Video Store directly.

## Common mistakes

- Having the Upload Service synchronously wait for transcoding before responding, tying upload latency to processing time (minutes) instead of just the upload transfer itself.
- Serving encoded video directly from the Encoded Video Store to viewers globally without a CDN in front, ignoring both the latency cost of distance and the bandwidth cost of serving every byte from one place.
- Producing only a single fixed resolution, ignoring the non-functional requirement to adapt to varying viewer network conditions.

## Edge cases

- A viewer's connection quality changes mid-playback (walking from WiFi to cellular): the player must detect buffering/bandwidth changes and switch manifest-listed variants without a full restart.
- Transcoding failures on a subset of resolutions (e.g. an unusual codec in the source file breaks one output format) shouldn't block the other resolutions from becoming available.
- Very large uploads (multi-GB files) benefit from chunked/resumable upload support, so a network blip partway through doesn't force restarting the entire upload from zero.`,
    solutionSteps: [
      { title: "1. Accept the upload asynchronously", body: "The Uploader sends the file to the Upload Service, which writes it to the Raw Video Store and returns immediately, without waiting for processing." },
      { title: "2. Trigger transcoding", body: "The Transcoding Service picks up the raw video and produces multiple resolution/bitrate variants, running independently of the upload request." },
      { title: "3. Store variants plus a manifest", body: "Each variant is written to the Encoded Video Store, along with a manifest (HLS/DASH) listing which resolutions are available for that video." },
      { title: "4. Distribute via CDN", body: "The Encoded Video Store's contents are served through a CDN, so viewers stream from a nearby edge rather than a central origin." },
      { title: "5. Let the client adapt", body: "The Viewer's player reads the manifest and switches between resolution variants at runtime based on its own measured bandwidth and buffering, the server just needs to have made the variants available." },
    ],
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

**Clarifying context**
- Assume top-5 suggestions per keystroke, and a query volume high enough that recomputing rankings on every keystroke live would be far too slow.
- "Reasonably recent" means suggestions can lag actual query trends by up to an hour, this is not a real-time trending-topics feature.

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
    generalHint: "Under-100ms reads mean you cannot do any ranking work at request time. Whatever gets returned to the user has to already be sitting there, precomputed, waiting to be read.",
    stepHints: [
      "If ranking had to be computed on every keystroke (scanning all queries starting with the typed prefix and sorting by frequency), why would that be too slow at the required latency?",
      "A trie where every node already stores its own precomputed top-k completions turns the read into a simple traversal. What's the time complexity of that lookup relative to the length of the typed prefix?",
      "Now, where does the popularity data driving that precomputation come from, and should it be computed synchronously as part of serving search queries, or separately?",
      "Design the offline side: raw queries get logged somewhere, and an Aggregation Job runs periodically (e.g. hourly, consistent with the 'lag up to an hour' requirement) to recompute frequencies. What does it do with the result?",
      "Notice the pattern here mirrors the news feed problem (precompute expensive work ahead of time, serve reads from the precomputed structure). Why does separating 'compute' from 'serve' matter for keeping read latency both low and predictable, even as the aggregation logic itself grows more complex?",
    ],
    referenceExplanation: `## Design rationale

The read path is deliberately simple and fast: the **Autocomplete Service** looks up a prefix directly in an in-memory **Trie Cache** where each trie node already stores its top-k most popular completions precomputed. This turns "rank all matches" into an O(prefix length) lookup with no ranking work at request time, which is the only way to reliably hit sub-100ms latency.

Popularity data comes from the **Query Log Store** (raw search queries) being periodically processed by an **Aggregation Job** that recomputes frequencies and rebuilds (or incrementally updates) the Trie Cache. Running this offline/batch, off the read path, is what keeps read latency low and predictable regardless of how expensive the ranking computation itself is.

## Trade-offs

This read/write separation (serve from a precomputed structure, update it asynchronously) is the same pattern as the news feed's fan-out-on-write cache, trading a bit of data freshness (suggestions can lag real query trends by up to the aggregation interval) for consistently fast reads that don't degrade as query volume grows.

A full trie rebuild on every aggregation run is simple but wasteful at scale; an incremental update (only touching nodes whose top-k changed) is more efficient but adds implementation complexity, a reasonable trade-off to make as query volume grows past what a full rebuild can complete within the aggregation interval.

## Common mistakes

- Computing suggestions live by scanning and ranking on every keystroke, which might feel fine in a small demo but cannot hit sub-100ms latency once the query log is large.
- Coupling the read path to the aggregation job, e.g. rebuilding the trie synchronously as part of serving a request, defeating the entire purpose of precomputation.
- Not bounding top-k storage per trie node, letting memory usage balloon for very short, common prefixes (e.g. a single letter) that match huge numbers of queries.

## Edge cases

- A brand-new, suddenly popular query (breaking news) won't appear in suggestions until the next aggregation run, worth stating explicitly as an accepted trade-off given the "up to an hour" freshness requirement.
- Prefixes with very few or no historical matches should fall back gracefully (empty or generic suggestions) rather than erroring.
- Personalization (a specific user's own search history influencing their suggestions) is out of scope here but worth naming as a natural follow-up extension, layered on top of the global popularity data rather than replacing it.`,
    solutionSteps: [
      { title: "1. Design the read path for speed", body: "The Client sends each keystroke's prefix to the Autocomplete Service, which does a direct lookup in an in-memory Trie Cache, no ranking computed at request time." },
      { title: "2. Precompute top-k per node", body: "Each trie node stores its own precomputed top-k completions, so the lookup is just a traversal to the node matching the prefix, then reading its stored list." },
      { title: "3. Log queries for later analysis", body: "Every search query gets appended to the Query Log Store, completely separate from the read path, adding no latency to autocomplete requests." },
      { title: "4. Aggregate offline", body: "An Aggregation Job runs periodically (e.g. hourly) over the Query Log Store, recomputing frequency-based rankings." },
      { title: "5. Update the serving structure", body: "The Aggregation Job rebuilds or incrementally updates the Trie Cache with fresh top-k lists, so subsequent reads reflect the new rankings without ever blocking on the aggregation work." },
    ],
  },
];

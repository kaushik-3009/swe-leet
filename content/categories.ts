import type { CategorySpec } from "./schema";

export const categories: CategorySpec[] = [
  // ─── System Design (foundational -> advanced) ─────────────────────────────
  {
    slug: "sd-fundamentals",
    track: "SYSTEM_DESIGN",
    title: "Fundamentals",
    description: "Core building blocks every system design answer draws on: rate limiting, key-value lookups, and API gateways.",
    order: 1,
    articleTitle: "The building blocks you reach for in every answer",
    articleContent: `Almost every system design interview answer, no matter the prompt, is assembled from the same small set of building blocks. Learning these once means you spend your interview time on the parts that are actually specific to the problem, not re-deriving what a load balancer does.

## The request path

A request from a client typically passes through several layers before it touches your business logic:

\`\`\`
client -> DNS -> CDN (static assets) -> load balancer -> API gateway -> application servers -> database
                                                              |
                                                          rate limiter
                                                          auth / authz
\`\`\`

Each hop exists to solve one problem: the CDN keeps static content close to the user, the load balancer spreads traffic across servers so no single machine is a bottleneck, the API gateway centralizes cross-cutting concerns (auth, rate limiting, request routing) instead of duplicating them in every service.

## Rate limiting

A rate limiter protects your system from being overwhelmed, whether by a buggy client, a traffic spike, or an intentional abuser. The two algorithms worth knowing cold:

- **Token bucket**: a bucket holds up to N tokens, refilled at a fixed rate. Each request consumes one token; if the bucket is empty, the request is rejected (or queued). Allows bursts up to the bucket size.
- **Sliding window log/counter**: track request counts in a rolling time window rather than fixed buckets, avoiding the "burst at window boundary" problem of fixed-window counters.

In an interview, state which one you're using and why (token bucket is usually the simplest to defend), and say where the limiter lives (API gateway vs. per-service) and what state store it needs (Redis, typically, for counters shared across servers).

## Key-value lookups

A huge fraction of "design X" prompts reduce to "store a lot of key-value pairs and look them up fast": URL shorteners, session stores, feature flags. The two decisions that matter are the hashing/partitioning scheme (see the Sharding topic) and the consistency model (does every replica need to agree immediately, or is eventual consistency fine?).

## What interviewers are actually listening for

Not "which technology" but "do you know what trade-off you're making." A load balancer choice between round-robin and least-connections is a real trade-off (simplicity vs. accounting for uneven request cost) - say it out loud instead of picking silently.`,
    resources: [
      { kind: "EXTERNAL", title: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer", order: 1 },
      { kind: "EXTERNAL", title: "Rate limiting - Wikipedia", url: "https://en.wikipedia.org/wiki/Rate_limiting", order: 2 },
      { kind: "EXTERNAL", title: "AWS: caching and load balancing overview", url: "https://aws.amazon.com/caching/", order: 3 },
    ],
  },
  {
    slug: "sd-caching",
    track: "SYSTEM_DESIGN",
    title: "Caching",
    description: "Reducing read latency and database load with caches, from a single cache layer to CDN edge caching.",
    order: 2,
    articleTitle: "Caching: the highest-leverage tool in system design",
    articleContent: `If a system is too slow or the database is too loaded, the fastest fix is usually "cache it" - which is exactly why interviewers probe hard on whether you understand what that actually means, not just that you'd add a box labeled "Redis" to your diagram.

## Where a cache can live

\`\`\`
client -> browser cache -> CDN -> app-server local cache -> distributed cache (Redis) -> database
\`\`\`

Each layer trades freshness for speed. A browser cache is free but you don't control invalidation once it's out in the world. A CDN is great for content that's identical for every user (images, video, static JS/CSS). A distributed cache (Redis/Memcached) sits in front of the database and is shared across app servers, so a cache hit on one server benefits requests on all of them.

## Cache-aside vs. write-through vs. write-back

- **Cache-aside (lazy loading)**: application checks the cache first; on a miss, reads from the DB and populates the cache. Simple, and the cache only ever holds data that was actually requested - but the first request after an eviction always pays the full DB latency ("cold" reads).
- **Write-through**: writes go to the cache and the DB together (synchronously). Reads are always fresh, but every write pays cache-write latency too.
- **Write-back (write-behind)**: writes go to the cache immediately and are flushed to the DB asynchronously. Fast writes, but risks data loss if the cache crashes before the flush.

## Eviction policies

When the cache is full, something has to go. **LRU** (evict the least-recently-used entry) is the default answer in most interviews and is what Redis uses by default in \`allkeys-lru\` mode. **LFU** (least-frequently-used) is better when access frequency, not recency, predicts future access. Know the name of at least one, and be ready to say why it fits your workload.

## The hard part: invalidation

"There are only two hard things in computer science: cache invalidation and naming things." The realistic strategies:

- **TTL (time-to-live)**: simplest, accept some staleness in exchange for never having to explicitly invalidate.
- **Explicit invalidation on write**: the write path deletes or updates the cache key. Correct but couples every writer to cache-invalidation logic.
- **Event-driven invalidation**: writes publish an event; a consumer invalidates affected cache keys. Decouples writers from the cache but adds a moving part (see Messaging & Streaming).

## CDN specifics

A CDN is a geographically distributed cache for content that's the same for every user. Cache key design matters: a CDN cache key usually includes the URL and sometimes headers (e.g. \`Accept-Encoding\`) - get this wrong and you either serve stale/wrong content to some users or get a 0% cache hit rate because every request looks unique.`,
    resources: [
      { kind: "EXTERNAL", title: "Cache replacement policies - Wikipedia", url: "https://en.wikipedia.org/wiki/Cache_replacement_policies", order: 1 },
      { kind: "EXTERNAL", title: "Redis docs: caching patterns", url: "https://redis.io/docs/latest/", order: 2 },
      { kind: "EXTERNAL", title: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer", order: 3 },
    ],
  },
  {
    slug: "sd-sharding",
    track: "SYSTEM_DESIGN",
    title: "Sharding & Partitioning",
    description: "Scaling storage horizontally: partitioning strategies and consistent hashing.",
    order: 3,
    articleTitle: "Sharding: what to do when one database isn't enough",
    articleContent: `Vertical scaling (a bigger machine) always runs out of road. Sharding splits your data across many machines so both storage and write throughput scale roughly linearly - at the cost of a lot of new complexity you need to be able to name in an interview.

## Partitioning strategies

- **Range-based**: keys are split by ranges (e.g. user IDs 1-1M on shard A, 1M-2M on shard B). Simple, and range queries stay efficient. Downside: "hot" ranges (e.g. sequential IDs, so all new writes hit the newest shard) cause imbalance.
- **Hash-based**: \`shard = hash(key) % N\`. Spreads load evenly, but resharding (changing N) requires moving almost all keys, and range queries now have to fan out to every shard.
- **Consistent hashing**: keys and shards are placed on a hash ring; a key belongs to the next shard clockwise from its hash position. Adding or removing a shard only remaps the keys between it and its neighbor, not the whole keyspace - this is the standard answer to "how do you reshard without downtime."

\`\`\`
        shard C
       /        \\
  shard B        shard A
       \\        /
       key "user:42" hashes here -> owned by shard A
\`\`\`

Virtual nodes (each physical shard gets many points on the ring) are the detail that turns consistent hashing from a nice idea into something that actually balances load evenly - mention them if you bring up consistent hashing.

## Picking a shard key

The shard key decision drives almost everything else. A good shard key spreads load evenly and keeps together the data that's usually queried together (e.g. shard a multi-tenant system by \`tenant_id\` so a tenant's queries never fan out across shards). A bad shard key creates hot shards, which no amount of infrastructure fixes.

## What gets harder once you shard

- **Cross-shard joins/transactions**: no longer a single SQL query; either avoid them by design (denormalize, or choose a shard key that keeps related data together) or accept a distributed transaction protocol (two-phase commit, sagas).
- **Rebalancing**: moving data between shards without downtime is an operational project, not a config change - this is exactly why consistent hashing is worth the added complexity over naive \`hash % N\`.
- **Secondary indexes**: an index on a non-shard-key field either has to be a scatter-gather across every shard, or you maintain a separate global index service.`,
    resources: [
      { kind: "EXTERNAL", title: "Consistent hashing - Wikipedia", url: "https://en.wikipedia.org/wiki/Consistent_hashing", order: 1 },
      { kind: "EXTERNAL", title: "PostgreSQL docs: table partitioning", url: "https://www.postgresql.org/docs/current/ddl-partitioning.html", order: 2 },
      { kind: "EXTERNAL", title: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer", order: 3 },
    ],
  },
  {
    slug: "sd-consistency",
    track: "SYSTEM_DESIGN",
    title: "Consistency & Consensus",
    description: "Coordinating state across nodes: leader election, distributed locks, and consistency trade-offs.",
    order: 4,
    articleTitle: "Consistency and consensus: when nodes have to agree",
    articleContent: `Any system with more than one node eventually has to answer: what happens when two nodes disagree about the state of the world? This topic is where interviews separate "knows the buzzwords" from "understands the trade-off."

## CAP, in the form you'll actually use

The CAP theorem says a distributed system can't simultaneously guarantee Consistency, Availability, and Partition tolerance - and since network partitions *will* happen, the real choice is between C and A during a partition. In practice, say it as: "if the network splits, do we reject writes until it heals (favor consistency, e.g. a config store like etcd) or keep accepting writes on both sides and reconcile later (favor availability, e.g. a shopping cart service)?"

## Strong vs. eventual consistency

- **Strong consistency**: every read sees the latest write, everywhere. Requires coordination (consensus) on every write, which costs latency.
- **Eventual consistency**: replicas converge "eventually" if writes stop. Much cheaper, and fine for data where a few seconds of staleness doesn't matter (view counts, "last seen" timestamps).

Most real systems mix both: strongly consistent for the operations where being wrong is expensive (payments, inventory decrements), eventually consistent everywhere else.

## Leader election

Many coordination problems reduce to "pick one node to be in charge" - a database primary, a job scheduler, a lock service. The standard building blocks are consensus protocols (Raft, Paxos): nodes vote, a majority (quorum) agreement elects a leader, and the protocol handles the leader crashing and a new election happening without split-brain (two nodes both believing they're the leader).

\`\`\`
 node A --\\
 node B ---+-- majority vote --> node B elected leader
 node C --/
\`\`\`

You don't need to implement Raft in an interview - you need to know that "leader election" means "run a consensus protocol over a quorum," and that tools like etcd/ZooKeeper exist specifically so you don't have to build this yourself.

## Distributed locks

A distributed lock coordinates access to a shared resource across processes on different machines (vs. a regular mutex, which only works within one process). Built on the same primitives as leader election - a lock is really "elect exactly one holder." The classic gotcha: locks need a lease/TTL, or a crashed lock-holder deadlocks everyone else forever.`,
    resources: [
      { kind: "EXTERNAL", title: "CAP theorem - Wikipedia", url: "https://en.wikipedia.org/wiki/CAP_theorem", order: 1 },
      { kind: "EXTERNAL", title: "Paxos - Wikipedia", url: "https://en.wikipedia.org/wiki/Paxos_(computer_science)", order: 2 },
      { kind: "EXTERNAL", title: "Raft consensus algorithm (official site)", url: "https://raft.github.io/", order: 3 },
    ],
  },
  {
    slug: "sd-messaging",
    track: "SYSTEM_DESIGN",
    title: "Messaging & Streaming",
    description: "Decoupling producers and consumers with queues, pub/sub, and real-time delivery.",
    order: 5,
    articleTitle: "Messaging: decoupling producers from consumers",
    articleContent: `A synchronous call chain (service A calls service B calls service C) means A is only as available as the slowest link, and a spike in traffic to A becomes a spike in traffic to C instantly. Messaging breaks that chain: a producer writes a message and moves on; a consumer reads it whenever it's ready.

## Queue vs. pub/sub

- **Queue (point-to-point)**: each message is delivered to and processed by exactly one consumer (or one consumer *group*). Good for work distribution - a pool of workers pulling jobs off a queue.
- **Pub/sub (fan-out)**: each message is delivered to every subscriber. Good for "many parts of the system need to react to this event independently" (an order-placed event triggers inventory update, email, and analytics, each subscribed independently).

\`\`\`
producer -> [ queue ] -> worker 1
                       -> worker 2      (competing consumers: each message goes to ONE worker)

producer -> [ topic ] -> subscriber A
                       -> subscriber B  (pub/sub: each message goes to EVERY subscriber)
\`\`\`

## Delivery guarantees

Say the guarantee out loud, because it changes your consumer's design:

- **At-most-once**: message might be lost, never redelivered. Fine for metrics you can afford to drop.
- **At-least-once**: message is redelivered until acknowledged, so it might be processed twice. This is the common default - it pushes the requirement of **idempotency** onto the consumer (processing the same message twice must be safe, e.g. via a dedup key).
- **Exactly-once**: the hardest and most expensive guarantee; usually "exactly-once processing" is actually implemented as at-least-once delivery plus idempotent consumers, not a magic broker feature.

## Backpressure and dead-letter queues

If consumers can't keep up with producers, the queue grows unboundedly unless something pushes back - either the producer slows down (backpressure) or old messages get dropped/archived. A **dead-letter queue** catches messages that fail processing repeatedly, so one poison message doesn't block the whole queue forever.

## Real-time delivery to clients

For getting events to a browser/mobile client (not another backend service), the usual options are WebSockets (bidirectional, persistent connection - best for chat), Server-Sent Events (one-directional server-to-client over HTTP, simpler than WebSockets), and long polling (works everywhere, highest latency/overhead). Name the trade-off: WebSockets need a persistent-connection-aware load balancer and more server memory per connection; long polling is simplest to deploy but wastes requests.`,
    resources: [
      { kind: "EXTERNAL", title: "Apache Kafka documentation", url: "https://kafka.apache.org/documentation/", order: 1 },
      { kind: "EXTERNAL", title: "Publish-subscribe pattern - Wikipedia", url: "https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern", order: 2 },
      { kind: "EXTERNAL", title: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer", order: 3 },
    ],
  },
  {
    slug: "sd-case-studies",
    track: "SYSTEM_DESIGN",
    title: "Case Studies",
    description: "End-to-end designs that combine caching, sharding, messaging, and consistency into one system.",
    order: 6,
    articleTitle: "Putting it together: how to structure a full design",
    articleContent: `Every topic before this one taught you a tool. A case study interview is where you decide which tools to reach for and in what order - and the order matters as much as the choices.

## A repeatable structure

1. **Clarify requirements** (2-3 minutes). Functional: what must the system do? Non-functional: read-heavy or write-heavy, latency targets, expected scale (users, requests/sec, data size). Do not skip this - designing for the wrong scale is the single most common way to waste the whole interview.
2. **Back-of-envelope estimation**. Rough numbers for QPS, storage growth per day/year, bandwidth. You don't need precision, you need to show the design decisions below are grounded in a number, not a guess.
3. **High-level design**. Draw the request path end to end with the fewest boxes that are still correct - client, gateway, services, datastore(s). Resist adding every component you know; add only what this system needs.
4. **Deep dive** on the 1-2 hardest parts (the interviewer will often tell you where to go deep, or you can pick the part that most differentiates this design from a generic CRUD app).
5. **Identify bottlenecks and trade-offs**. What breaks first as load grows 10x? What did you choose *not* to build, and why?

## Combining the tools

A realistic case study almost always needs several of: a cache (topic: Caching) in front of the hot-read path, a sharding strategy (topic: Sharding & Partitioning) once a single database can't hold the data or the write load, a queue (topic: Messaging & Streaming) to decouple slow/bursty work from the request path, and a consistency decision (topic: Consistency & Consensus) for the one or two operations where correctness really matters.

The skill being tested is picking the *smallest* combination that satisfies the requirements you clarified in step 1 - not maximizing buzzwords per diagram.

## Common mistakes

- Designing for a scale nobody asked for (over-engineering a system for 1B users when the prompt implied 10K).
- Silence on trade-offs - stating a choice without saying what you gave up.
- Skipping estimation and jumping straight to boxes, so the interviewer can't tell if your design matches the actual load.
- Treating every problem as needing a message queue, a cache, *and* sharding, whether or not the requirements call for it.`,
    resources: [
      { kind: "EXTERNAL", title: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer", order: 1 },
      { kind: "EXTERNAL", title: "AWS Well-Architected Framework", url: "https://aws.amazon.com/architecture/well-architected/", order: 2 },
    ],
  },

  // ─── LLD (foundational -> advanced) ────────────────────────────────────────
  {
    slug: "lld-oo-modeling",
    track: "LLD",
    title: "OO Modeling Fundamentals",
    description: "Translating a real-world domain into classes, relationships, and responsibilities.",
    order: 1,
    articleTitle: "From word problem to class diagram",
    articleContent: `Low-level design interviews are graded on whether your class structure would survive a real code review, not on whether you can recall pattern names. The foundation is turning a fuzzy prompt ("design a parking lot") into nouns (classes), verbs (methods), and relationships.

## Finding the classes

Underline the nouns in the prompt - they're usually your first draft of classes. "A parking lot has multiple levels, each with spots of different sizes, and vehicles that park in them" gives you \`ParkingLot\`, \`Level\`, \`Spot\`, \`Vehicle\` immediately. Then ask what each class is *responsible for* (single-responsibility principle) - a \`ParkingLot\` coordinates levels and answers "is there space," a \`Level\` tracks its own spots, a \`Spot\` knows whether it's occupied and by what.

## Relationships: association, aggregation, composition

\`\`\`
ParkingLot ◆──── Level        composition: a Level cannot exist without its ParkingLot
Level      ◇──── Spot         aggregation: a Spot could conceivably outlive its Level
Vehicle    ────── Spot        association: a Vehicle references a Spot, neither owns the other
\`\`\`

Composition (filled diamond) means the child's lifecycle is bound to the parent's - delete the parent, the children go with it. Aggregation (hollow diamond) is a "has-a" without that lifecycle coupling. Getting this distinction right in your diagram (or even just being able to explain it verbally) signals real OO understanding.

## Interfaces vs. concrete classes

Define an interface (or abstract base class) wherever you expect variation: a \`PricingStrategy\` interface lets you swap hourly/flat-rate pricing without touching \`ParkingLot\`; a concrete \`HourlyPricing\` class is one implementation. This is the seed of the Strategy pattern (see Design Patterns) - you don't need to name the pattern to apply the idea.

## SOLID, as a design smell detector rather than a checklist

You don't need to recite the five SOLID principles in an interview. You do need to notice their violations as they happen: a class that changed for three unrelated reasons last sprint (violates single-responsibility), a subclass that throws \`NotImplementedError\` on an inherited method (violates Liskov substitution), a class that \`if/else\`s on type instead of using polymorphism (usually fixable with Strategy or a class hierarchy).

## A concrete method

1. Write the requirements as a short list (functional + a few constraints/edge cases).
2. Identify entities and their core responsibility, in one sentence each.
3. Draw relationships (composition/aggregation/association) between entities.
4. Add the 2-3 methods each class *must* expose to satisfy the requirements - resist adding methods "just in case."
5. Walk through the primary use case end to end against your classes, out loud, to catch gaps before you write code.`,
    resources: [
      { kind: "EXTERNAL", title: "SOLID - Wikipedia", url: "https://en.wikipedia.org/wiki/SOLID", order: 1 },
      { kind: "EXTERNAL", title: "Class diagram - Wikipedia", url: "https://en.wikipedia.org/wiki/Class_diagram", order: 2 },
      { kind: "EXTERNAL", title: "Refactoring Guru: design principles", url: "https://refactoring.guru/design-patterns", order: 3 },
    ],
  },
  {
    slug: "lld-design-patterns",
    track: "LLD",
    title: "Design Patterns",
    description: "Applying classic GoF patterns (Observer, Strategy, Factory) to real interview prompts.",
    order: 2,
    articleTitle: "Design patterns you'll actually use in interviews",
    articleContent: `There are 23 patterns in the original Gang of Four book. In LLD interviews, a handful cover the large majority of real prompts. Knowing *when* to reach for one matters far more than reciting its UML diagram from memory.

## Strategy

Encapsulates an interchangeable algorithm behind a common interface, so the algorithm can vary independently of the class that uses it. Textbook fit for anything with "different ways to calculate/process X": payment processing (credit card vs. wallet vs. points), pricing (hourly vs. flat), sorting/matching logic.

\`\`\`
Context --uses--> PaymentStrategy (interface)
                        ^
              ┌─────────┼─────────┐
        CreditCard   Wallet    Points
\`\`\`

## Observer

One-to-many notification: subjects publish state changes, observers subscribe and react, without the subject knowing anything concrete about its observers. Fits "notify interested parties when X changes" - stock price tickers, event listeners, pub/sub-style in-process notification.

## Factory (and Abstract Factory)

Centralizes object creation so callers depend on an interface, not a concrete class. Reach for it when construction logic is non-trivial (choosing a concrete class based on input) or when you want to be able to swap implementations later without touching every call site - e.g. a \`NotificationFactory\` that returns an \`EmailNotifier\`, \`SmsNotifier\`, or \`PushNotifier\` based on user preference.

## State

Lets an object change its behavior when its internal state changes, by delegating to a state object instead of a sprawling \`if/elif\` chain on a status field. Natural fit for anything with a lifecycle: an order (placed -> paid -> shipped -> delivered), a traffic light, a game piece.

## Singleton (use sparingly)

Guarantees a single instance and a global access point. It's the pattern most often *overused* - interviewers notice when a candidate reaches for Singleton reflexively (e.g. for a logger or config object) without considering that it makes testing harder and hides a dependency. Mention it, but justify it.

## Decorator

Adds behavior to an individual object at runtime by wrapping it, without subclassing. Good for "a base thing plus optional add-ons that combine" - a coffee with add-ins, a text stream with optional compression/encryption layers.

## How to decide which pattern fits

Ask what's varying. Varying *algorithm*: Strategy. Varying *object creation*: Factory. Varying *behavior based on internal state*: State. Need to *react to changes elsewhere*: Observer. Need to *add optional behavior without an explosion of subclasses*: Decorator. If nothing is varying, you probably don't need a pattern at all - and saying so is a good sign in an interview.`,
    resources: [
      { kind: "EXTERNAL", title: "Refactoring Guru: design patterns catalog", url: "https://refactoring.guru/design-patterns", order: 1 },
      { kind: "EXTERNAL", title: "Design Patterns (Gang of Four) - Wikipedia", url: "https://en.wikipedia.org/wiki/Design_Patterns", order: 2 },
    ],
  },
  {
    slug: "lld-state-machines",
    track: "LLD",
    title: "State Machines",
    description: "Modeling entities whose behavior depends on discrete states and transitions.",
    order: 3,
    articleTitle: "State machines: taming lifecycle logic",
    articleContent: `Any entity with a lifecycle - an order, a game, a traffic light, a document under review - is a candidate for explicit state-machine modeling. The alternative (a status field checked by scattered \`if\` statements) is where lifecycle bugs live.

## The core idea

A finite state machine has a fixed set of states, and a fixed set of transitions between them, each usually triggered by an event and optionally guarded by a condition.

\`\`\`
   [Placed] --pay()--> [Paid] --ship()--> [Shipped] --deliver()--> [Delivered]
      |                                        |
   cancel()                                 cancel() [not allowed - guard fails]
      v
  [Cancelled]
\`\`\`

Modeling this explicitly (as a \`State\` interface with one concrete class per state, or a transition table) makes two things trivially checkable that are easy to get wrong with scattered flags: **which transitions are even legal from a given state**, and **what side effects happen on each transition** (sending an email on \`ship()\`, refunding on \`cancel()\` only if not yet shipped).

## Implementation approaches

- **State pattern (OO)**: one class per state, each implementing the same interface (e.g. \`pay()\`, \`ship()\`, \`cancel()\`); illegal transitions either no-op or throw. The context object holds a reference to its current state object and delegates to it.
- **Transition table**: a data structure mapping \`(currentState, event) -> nextState\`, checked before mutating a plain status field. Less "OO," often simpler to reason about and to unit test exhaustively.

Either is a reasonable interview answer - the State pattern demonstrates OO fluency; a transition table demonstrates you can reduce the problem to data. Pick one and be consistent.

## Guards and side effects

Two things distinguish a "real" state machine from a toy one: **guards** (a transition might be conditionally blocked - can't ship an order that hasn't been paid) and **side effects on entry/exit** (entering \`Shipped\` triggers a notification; exiting \`Placed\` might release inventory holds). Naming both explicitly, even informally, is what separates a working design from a diagram that looks right but misses real requirements.

## Where this shows up

Elevator systems (idle / moving-up / moving-down / door-open), traffic lights (red / green / yellow, each with a timer-driven transition), vending machines (idle / coin-inserted / dispensing), and game engines (chess piece move validation, turn order) are all natural state-machine problems - if a prompt has words like "status," "phase," or a described sequence of steps, reach for this topic.`,
    resources: [
      { kind: "EXTERNAL", title: "Finite-state machine - Wikipedia", url: "https://en.wikipedia.org/wiki/Finite-state_machine", order: 1 },
      { kind: "EXTERNAL", title: "Refactoring Guru: State pattern", url: "https://refactoring.guru/design-patterns/state", order: 2 },
    ],
  },
  {
    slug: "lld-concurrency",
    track: "LLD",
    title: "Concurrency Patterns",
    description: "Designing thread-safe components: bounded buffers, locks, and in-process rate limiting.",
    order: 4,
    articleTitle: "Concurrency: making shared state safe",
    articleContent: `LLD concurrency problems ask you to design a component (not a distributed system - that's the System Design track) that's safe when multiple threads use it at once. The core skill is identifying shared mutable state and protecting it correctly, without over-locking and killing throughput.

## Identify the shared state first

Before picking a synchronization primitive, name exactly what's shared: a counter, a fixed-size buffer, a cache map. Everything else follows from that. A component with no shared mutable state needs no locking at all - say so if it's true, it's a legitimate and good answer.

## The core primitives

- **Mutex/lock**: only one thread executes a critical section at a time. Simple, but a lock held too long (or too broadly) serializes work that didn't need to be serialized.
- **Condition variable**: lets a thread sleep until some condition holds (e.g. "the buffer is non-empty") instead of busy-waiting. Producer/consumer queues are built on this.
- **Read-write lock**: many readers can proceed concurrently, but a writer needs exclusive access. Big win when reads vastly outnumber writes.
- **Atomic operations**: hardware-supported compare-and-swap style updates for simple values (counters, flags) without a full lock.

## Bounded blocking queue (the canonical prompt)

\`\`\`
producer thread(s) --put()--> [ fixed-capacity queue ] --take()--> consumer thread(s)
                                     ^ blocks producer when full
                                     ^ blocks consumer when empty
\`\`\`

\`put()\` blocks (rather than errors) when the queue is full; \`take()\` blocks when it's empty. Implemented with a lock plus two condition variables (not-full, not-empty) - or, in most languages, a battle-tested standard library type (Java's \`ArrayBlockingQueue\`, Python's \`queue.Queue\`). Knowing *why* it needs two condition variables, not one, is the actual signal: a single condition variable with \`notify_all\` works but wakes every waiter (producers and consumers) on every change, wasting cycles.

## In-process rate limiting

A single-process token bucket needs its token count updated atomically (or under a lock) across all threads issuing requests, plus a background timer/thread (or lazy refill computed from elapsed-time-since-last-request) to add tokens back. It's a smaller-scale version of the System Design rate limiter topic - the algorithm is identical, the concern here is purely thread safety of the shared counter, not distributing state across machines.

## Common mistakes

- Locking too coarsely (one giant lock around everything) - correct but serializes work that didn't need to be.
- Locking too finely without checking for deadlock (acquiring two locks in inconsistent order across two code paths).
- Busy-waiting (spinning on a flag) instead of blocking on a condition variable - wastes CPU and hides bugs.
- Forgetting that "thread-safe" doesn't mean "no race conditions in the caller's logic" - the component can be correct while callers still misuse it.`,
    resources: [
      { kind: "EXTERNAL", title: "Producer-consumer problem - Wikipedia", url: "https://en.wikipedia.org/wiki/Producer%E2%80%93consumer_problem", order: 1 },
      { kind: "EXTERNAL", title: "Readers-writer lock - Wikipedia", url: "https://en.wikipedia.org/wiki/Readers%E2%80%93writer_lock", order: 2 },
    ],
  },
  {
    slug: "lld-case-studies",
    track: "LLD",
    title: "Case Studies",
    description: "Larger multi-class systems that combine modeling, patterns, state, and concurrency.",
    order: 5,
    articleTitle: "Putting it together: a repeatable LLD method",
    articleContent: `A full LLD case study (parking lot, elevator system, ride-hailing dispatch) combines everything from the earlier topics: entity modeling, at least one design pattern, often a state machine, and sometimes a concurrency concern. The interview is graded on process as much as the final diagram.

## A repeatable structure

1. **Clarify scope and requirements** - functional (what must it do) and explicit non-functional constraints (single-machine or distributed? thread-safe? what's out of scope?). LLD prompts are often deliberately underspecified; asking good questions here is itself signal.
2. **Identify core entities and responsibilities** (see OO Modeling Fundamentals) - one sentence per class stating what it owns.
3. **Draw relationships** between entities (composition/aggregation/association).
4. **Identify where a pattern fits** - don't force one. A varying algorithm suggests Strategy; a lifecycle suggests a State machine; pluggable object creation suggests Factory.
5. **Define the key interfaces/method signatures** for the 2-3 primary use cases, and walk through each use case against your classes out loud.
6. **Call out concurrency explicitly** if the prompt implies multiple simultaneous actors (multiple cars trying to park at once, multiple riders requesting a driver) - even a one-sentence "this map would need a lock/be backed by a concurrent map" is enough to show you noticed.

## Common mistakes

- Jumping straight to code before agreeing on entities and responsibilities - produces a class structure that has to be rewritten halfway through.
- Over-applying patterns (wrapping every class in a Factory "just in case") - a pattern used where nothing is actually varying is a red flag, not a green one.
- Ignoring edge cases the prompt implies but doesn't state outright (what happens when the parking lot is full? What happens if two threads try to book the same elevator at once?).
- Under-specifying method signatures - "handles payment" is not a method signature; \`processPayment(order: Order) -> PaymentResult\` is.

## What "done" looks like

A class diagram (or class list with relationships) that a teammate could hand-implement without asking you clarifying questions, a state machine (if the domain has a lifecycle) with its legal transitions named, and a walkthrough of the primary use case that didn't require inventing a new method mid-sentence.`,
    resources: [
      { kind: "EXTERNAL", title: "System Design Primer: object-oriented design section (GitHub)", url: "https://github.com/donnemartin/system-design-primer", order: 1 },
      { kind: "EXTERNAL", title: "Refactoring Guru: design patterns catalog", url: "https://refactoring.guru/design-patterns", order: 2 },
    ],
  },
];

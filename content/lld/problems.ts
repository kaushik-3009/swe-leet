import type { ProblemSpec } from "../schema";

export const lldProblems: ProblemSpec[] = [
  {
    slug: "parking-lot",
    categorySlug: "lld-oo-modeling",
    track: "LLD",
    title: "Parking Lot System",
    difficulty: "EASY",
    tags: ["oo-design", "modeling"],
    estMinutes: 25,
    order: 1,
    description: `Design the classes for a multi-level parking lot that supports different vehicle sizes (motorcycle, car, bus) and different spot sizes.

**Functional requirements**
- Assign an incoming vehicle to a suitable free spot.
- Support multiple levels, each with multiple spots of different sizes.
- Compute a parking fee on exit based on duration.

Draw the class model: the entities involved and how they relate to each other (not a sequence diagram — class boxes and relationships).`,
    rubric: {
      requiredComponents: ["ParkingLot", "Level", "ParkingSpot", "Vehicle", "Ticket"],
      requiredConnections: [
        { from: "ParkingLot", to: "Level", label: "has many" },
        { from: "Level", to: "ParkingSpot", label: "has many" },
        { from: "ParkingSpot", to: "Vehicle", label: "assigned to" },
        { from: "Vehicle", to: "Ticket", label: "issued" },
      ],
    },
    referenceExplanation: `**ParkingLot** owns a collection of **Level**s, each owning a collection of **ParkingSpot**s typed by size (motorcycle/compact/large) — modeling size as an attribute of the spot (and of the **Vehicle**) rather than separate classes per size avoids class explosion and lets spot-assignment be one polymorphic "does this spot fit this vehicle" check.

On entry, a **Ticket** is created linking the Vehicle to its assigned ParkingSpot and an entry timestamp; on exit, the fee is computed from the Ticket's duration and the spot's rate, and the spot is freed. Keeping the Ticket as its own entity (rather than fields on Vehicle) is what makes fee calculation and spot release clean, symmetric operations.

A common refinement candidates should mention even if not drawn: a spot-assignment strategy (nearest-first vs. best-fit) is a natural Strategy pattern extension point, since the assignment algorithm is likely to change independent of the rest of the model.`,
  },
  {
    slug: "library-management",
    categorySlug: "lld-oo-modeling",
    track: "LLD",
    title: "Library Management System",
    difficulty: "EASY",
    tags: ["oo-design", "modeling"],
    estMinutes: 25,
    order: 2,
    description: `Design the classes for a library system: members can search the catalog, check out books, and return them; the system tracks due dates and late fees.

**Functional requirements**
- Search books by title/author.
- Check out and return a book copy.
- Track due dates and compute late fees.

Draw the class model showing the core entities and their relationships.`,
    rubric: {
      requiredComponents: ["Library", "Book", "BookCopy", "Member", "Loan"],
      requiredConnections: [
        { from: "Library", to: "Book", label: "catalog" },
        { from: "Book", to: "BookCopy", label: "has many physical copies" },
        { from: "Member", to: "Loan", label: "borrows via" },
        { from: "Loan", to: "BookCopy", label: "references" },
      ],
    },
    referenceExplanation: `Separating **Book** (the catalog entry: title, author, ISBN) from **BookCopy** (one physical, checkoutable instance) is the key modeling decision — a library can have five copies of the same Book, each independently on-loan or available, and only BookCopy needs a status/location.

A **Loan** connects a **Member** to a specific BookCopy with checkout and due dates; late fees are a computed property of a Loan (comparing due date to return date), not stored state, which avoids the fee going stale if computed and cached at checkout time.

**Library** acts as the aggregate root exposing search over its Book catalog — search itself is an implementation detail (index, DB query) that doesn't need its own class in a first-pass model, but is worth mentioning as an extension point (e.g. a SearchIndex collaborator) if asked to go deeper.`,
  },
  {
    slug: "observer-stock-ticker",
    categorySlug: "lld-design-patterns",
    track: "LLD",
    title: "Observer Pattern: Stock Ticker",
    difficulty: "EASY",
    tags: ["observer", "design-patterns"],
    estMinutes: 20,
    order: 1,
    description: `Design a stock price ticker where multiple displays (mobile app, web dashboard, alert system) need to be notified whenever a stock's price changes, without the price source knowing about each display's concrete type.

**Functional requirements**
- Multiple subscribers can register/unregister for price updates.
- When a price changes, all current subscribers are notified.

Draw the classes involved and how the subject relates to its observers.`,
    rubric: {
      requiredComponents: ["StockTicker (Subject)", "Observer Interface", "MobileDisplay", "WebDashboard", "AlertSystem"],
      requiredConnections: [
        { from: "StockTicker (Subject)", to: "Observer Interface", label: "notifies" },
        { from: "Observer Interface", to: "MobileDisplay", label: "implemented by" },
        { from: "Observer Interface", to: "WebDashboard", label: "implemented by" },
        { from: "Observer Interface", to: "AlertSystem", label: "implemented by" },
      ],
    },
    referenceExplanation: `**StockTicker** holds a list of **Observer Interface** references (not concrete display types) and calls \`notify()\` on each when a price changes — this is the core of the Observer pattern: the subject depends only on an abstraction, so new subscriber types (a new display, a logging service) can be added without touching StockTicker at all.

**MobileDisplay**, **WebDashboard**, and **AlertSystem** each implement the Observer interface's \`update(price)\` method with their own logic (render on screen, push notification, trigger a trade alert) — the subject has no idea what any of them actually do with the update.

This decoupling is exactly why Observer is the standard answer whenever a prompt says "notify multiple, possibly-changing types of subscribers" — the alternative (StockTicker holding typed references to each display class) would violate open/closed and force a change to StockTicker every time a new display type is added.`,
  },
  {
    slug: "strategy-payment-processor",
    categorySlug: "lld-design-patterns",
    track: "LLD",
    title: "Strategy Pattern: Payment Processor",
    difficulty: "MEDIUM",
    tags: ["strategy", "design-patterns"],
    estMinutes: 25,
    order: 2,
    description: `Design a checkout flow that supports paying by credit card, PayPal, or store credit, where the payment method can be chosen at runtime and new methods added later without modifying checkout logic.

**Functional requirements**
- Checkout accepts an amount and a chosen payment method, and processes payment.
- New payment methods can be added without changing the checkout class.

Draw the class model showing how checkout selects and uses a payment strategy.`,
    rubric: {
      requiredComponents: ["Checkout", "PaymentStrategy Interface", "CreditCardPayment", "PayPalPayment", "StoreCreditPayment"],
      requiredConnections: [
        { from: "Checkout", to: "PaymentStrategy Interface", label: "delegates to" },
        { from: "PaymentStrategy Interface", to: "CreditCardPayment", label: "implemented by" },
        { from: "PaymentStrategy Interface", to: "PayPalPayment", label: "implemented by" },
        { from: "PaymentStrategy Interface", to: "StoreCreditPayment", label: "implemented by" },
      ],
    },
    referenceExplanation: `**Checkout** holds a reference to a **PaymentStrategy Interface** (with a single \`pay(amount)\` method) rather than branching on a payment-type enum internally — the caller injects the concrete strategy (**CreditCardPayment**, **PayPalPayment**, **StoreCreditPayment**) at checkout time, and Checkout never needs an if/else on payment type.

Adding a new payment method (e.g. cryptocurrency) means writing one new class implementing PaymentStrategy — zero changes to Checkout — which is the whole point of the pattern and directly satisfies the "add methods without modifying checkout logic" requirement.

This is easy to confuse with Factory: Strategy is about swapping *behavior* (how payment is processed) chosen by the caller; Factory (next problem) is about *object creation* chosen by internal logic. A checkout system often uses both together — a factory to construct the right strategy from a payment-type string, then Strategy to actually run it.`,
  },
  {
    slug: "factory-notification-service",
    categorySlug: "lld-design-patterns",
    track: "LLD",
    title: "Factory Pattern: Notification Service",
    difficulty: "MEDIUM",
    tags: ["factory", "design-patterns"],
    estMinutes: 25,
    order: 3,
    description: `Design a notification service that creates the right kind of notification object (Email, SMS, Push) based on a type string, without callers needing to know the concrete classes.

**Functional requirements**
- Given a notification type and content, construct and send the correct notification.
- New notification types can be added without changing calling code.

Draw the class model showing the factory and the family of notification types it creates.`,
    rubric: {
      requiredComponents: ["NotificationFactory", "Notification Interface", "EmailNotification", "SMSNotification", "PushNotification"],
      requiredConnections: [
        { from: "NotificationFactory", to: "Notification Interface", label: "creates" },
        { from: "Notification Interface", to: "EmailNotification", label: "implemented by" },
        { from: "Notification Interface", to: "SMSNotification", label: "implemented by" },
        { from: "Notification Interface", to: "PushNotification", label: "implemented by" },
      ],
    },
    referenceExplanation: `**NotificationFactory** exposes a single \`create(type)\` method that internally switches on the type to instantiate the right concrete class (**EmailNotification**, **SMSNotification**, **PushNotification**), all implementing a common **Notification Interface** (e.g. \`send(content)\`) — callers only ever interact with the interface, never the concrete constructors.

This centralizes construction logic in one place: if creating an SMSNotification later requires injecting a Twilio client while EmailNotification needs an SMTP client, that wiring lives inside the factory, not scattered across every call site that needs a notification.

Contrast with Strategy in the previous problem: here the *caller doesn't choose the class directly* (it passes a type string and lets the factory decide/construct), whereas Strategy has the caller explicitly hand in the behavior object it already chose. Factory answers "how do I construct the right thing," Strategy answers "how do I swap behavior."`,
  },
  {
    slug: "traffic-light-controller",
    categorySlug: "lld-state-machines",
    track: "LLD",
    title: "Traffic Light Controller",
    difficulty: "EASY",
    tags: ["state-machine", "modeling"],
    estMinutes: 20,
    order: 1,
    description: `Design a traffic light controller that cycles through Red -> Green -> Yellow -> Red, where each state knows how long it lasts and what state comes next.

**Functional requirements**
- The light transitions through a fixed cycle of states.
- Each state's behavior (duration, next state) is self-contained, so adding a new state (e.g. flashing yellow for night mode) doesn't require rewriting a big switch statement elsewhere.

Draw the state machine: states and the transitions between them.`,
    rubric: {
      requiredComponents: ["TrafficLight (Context)", "RedState", "GreenState", "YellowState"],
      requiredConnections: [
        { from: "RedState", to: "GreenState", label: "transition after timer" },
        { from: "GreenState", to: "YellowState", label: "transition after timer" },
        { from: "YellowState", to: "RedState", label: "transition after timer" },
      ],
    },
    referenceExplanation: `This is the State pattern: **TrafficLight** (the context) holds a reference to its current state object and delegates to it, rather than holding a status enum and a giant switch statement scattered through the class — each of **RedState**, **GreenState**, **YellowState** knows its own duration and which state comes next.

Transitions are self-contained: each state's \`next()\` method returns the following state instance, so TrafficLight's tick loop is just "ask current state for its duration, wait, then advance to \`current.next()\`" — no external logic needs to know the full cycle order.

This is exactly why the "add a new state without touching existing logic" requirement is satisfied: adding \`FlashingYellowState\` for night mode means writing one new class and repointing which state transitions into/out of it, not modifying a central switch statement that enumerates every state.`,
  },
  {
    slug: "elevator-system",
    categorySlug: "lld-state-machines",
    track: "LLD",
    title: "Elevator System",
    difficulty: "MEDIUM",
    tags: ["state-machine", "scheduling", "modeling"],
    estMinutes: 35,
    order: 2,
    description: `Design a single-elevator control system: it receives floor requests (from inside the car and from hall call buttons), decides which to service next, and moves accordingly.

**Functional requirements**
- Accept requests for floors from inside the car and from hallways (up/down).
- Move toward and service the nearest sensible request given current direction (don't reverse direction unnecessarily).
- Track door state (open/closed) and movement state (idle/moving up/moving down).

Draw the class model, including how the elevator's state and its request queue relate.`,
    rubric: {
      requiredComponents: ["Elevator", "ElevatorState", "RequestQueue", "FloorRequest", "Door"],
      requiredConnections: [
        { from: "Elevator", to: "ElevatorState", label: "current state" },
        { from: "Elevator", to: "RequestQueue", label: "consults" },
        { from: "RequestQueue", to: "FloorRequest", label: "holds pending" },
        { from: "Elevator", to: "Door", label: "controls" },
      ],
    },
    referenceExplanation: `**Elevator** delegates its movement behavior to an **ElevatorState** (Idle / MovingUp / MovingDown), following the State pattern from the previous problem — "should I keep going up or stop and reverse" is a decision that depends entirely on current state plus what's in the **RequestQueue**, so keeping that logic inside the state class (rather than a giant conditional in Elevator) keeps each direction's logic isolated.

The **RequestQueue** holds pending **FloorRequest**s and is typically split (or sorted) by direction — the classic "don't reverse unnecessarily" behavior (SCAN/elevator algorithm) comes from always servicing all requests in the current direction of travel before reversing, rather than servicing requests in arrival order.

**Door** is modeled separately because its state (open/closed/obstructed) is orthogonal to the elevator's movement state — the elevator can't move while doors are open, so Elevator checks Door state before transitioning out of Idle, but Door doesn't need to know anything about floor requests.`,
  },
  {
    slug: "vending-machine",
    categorySlug: "lld-state-machines",
    track: "LLD",
    title: "Vending Machine",
    difficulty: "MEDIUM",
    tags: ["state-machine", "modeling"],
    estMinutes: 30,
    order: 3,
    description: `Design a vending machine: a user selects an item, inserts money, and the machine dispenses the item and any change — handling insufficient funds and out-of-stock items.

**Functional requirements**
- Accept item selection and coin/bill insertion in any order.
- Dispense the item and correct change once payment is sufficient.
- Handle out-of-stock and insufficient-payment cases distinctly.

Draw the state machine for the machine's transaction flow.`,
    rubric: {
      requiredComponents: ["VendingMachine (Context)", "IdleState", "ItemSelectedState", "PaymentState", "DispensingState"],
      requiredConnections: [
        { from: "IdleState", to: "ItemSelectedState", label: "select item" },
        { from: "ItemSelectedState", to: "PaymentState", label: "insert payment" },
        { from: "PaymentState", to: "DispensingState", label: "sufficient funds" },
        { from: "DispensingState", to: "IdleState", label: "dispense complete" },
      ],
    },
    referenceExplanation: `**VendingMachine** delegates each user action (select, insert coin, cancel) to its current state object, and each state only allows the transitions that make sense from it — e.g. **IdleState** accepts "select item" but rejects "insert payment" (nothing selected yet), which is a natural way to enforce valid operation ordering without scattering guard conditions through one monolithic class.

**PaymentState** tracks amount inserted so far versus the selected item's price; insufficient funds keeps the machine in PaymentState accepting more coins, while an out-of-stock selection sends it back to IdleState (or a rejection substate) directly from ItemSelectedState rather than ever reaching PaymentState.

**DispensingState** is intentionally its own state, not just an action taken from PaymentState, because dispensing (and making change) can itself fail (e.g. out of change) — modeling it as a state makes that failure a first-class transition rather than an exception buried inside a payment method.`,
  },
  {
    slug: "bounded-blocking-queue",
    categorySlug: "lld-concurrency",
    track: "LLD",
    title: "Thread-safe Bounded Queue",
    difficulty: "MEDIUM",
    tags: ["concurrency", "producer-consumer"],
    estMinutes: 30,
    order: 1,
    description: `Design a fixed-capacity thread-safe queue supporting multiple producer and consumer threads: producers block when the queue is full, consumers block when it's empty.

**Functional requirements**
- \`put(item)\` blocks if the queue is at capacity until space is available.
- \`take()\` blocks if the queue is empty until an item is available.
- Safe under concurrent access from multiple producer and consumer threads.

Draw the class model: the queue and the synchronization primitives it uses to coordinate producers and consumers.`,
    rubric: {
      requiredComponents: ["BoundedBlockingQueue", "Internal Buffer", "Lock", "NotFull Condition", "NotEmpty Condition"],
      requiredConnections: [
        { from: "BoundedBlockingQueue", to: "Internal Buffer", label: "guards" },
        { from: "BoundedBlockingQueue", to: "Lock", label: "acquires on put/take" },
        { from: "BoundedBlockingQueue", to: "NotFull Condition", label: "producers wait on" },
        { from: "BoundedBlockingQueue", to: "NotEmpty Condition", label: "consumers wait on" },
      ],
    },
    referenceExplanation: `**BoundedBlockingQueue** wraps an **Internal Buffer** (a fixed-size array or linked list) and every access to it — from either \`put\` or \`take\` — happens while holding a single **Lock**, which is what makes concurrent access safe; without it, two threads mutating the buffer's head/tail pointers simultaneously would corrupt state.

Blocking behavior comes from two condition variables associated with that lock: a producer calling \`put\` on a full queue waits on **NotFull Condition** until a consumer's \`take\` signals it after removing an item; symmetrically, a consumer waiting on **NotEmpty Condition** is signaled after a producer's \`put\` adds an item. Using two separate conditions (rather than one) avoids waking up threads that still can't proceed (e.g. waking a waiting producer when a *consumer* was actually signaled).

The classic bug to call out even if not diagrammed: using \`if (full) wait()\` instead of \`while (full) wait()\` — spurious wakeups or multiple waiters mean a thread must re-check the condition after waking, not assume it's now true.`,
  },
  {
    slug: "in-process-rate-limiter",
    categorySlug: "lld-concurrency",
    track: "LLD",
    title: "In-Process Rate Limiter (Token Bucket)",
    difficulty: "MEDIUM",
    tags: ["concurrency", "rate-limiting"],
    estMinutes: 30,
    order: 2,
    description: `Design an in-process (single JVM/process, no external store) rate limiter class using the token bucket algorithm, safe for concurrent calls from multiple threads.

**Functional requirements**
- \`tryAcquire()\` returns true if a request is allowed, false if the bucket is empty.
- Tokens refill at a fixed rate up to a max capacity.
- Thread-safe under concurrent callers.

Draw the class model: the limiter, its token state, and the refill mechanism.`,
    rubric: {
      requiredComponents: ["TokenBucketRateLimiter", "Token Count (Atomic)", "Refill Scheduler", "Caller Thread"],
      requiredConnections: [
        { from: "Caller Thread", to: "TokenBucketRateLimiter", label: "tryAcquire()" },
        { from: "TokenBucketRateLimiter", to: "Token Count (Atomic)", label: "decrement on acquire" },
        { from: "Refill Scheduler", to: "Token Count (Atomic)", label: "increment on tick" },
      ],
    },
    referenceExplanation: `**Token Count (Atomic)** must be a genuinely atomic/compare-and-swap counter (not a plain int guarded by intent) because multiple **Caller Thread**s call \`tryAcquire()\` concurrently — a naive "check then decrement" without atomicity lets two threads both pass the check when only one token remains, over-admitting requests.

Two designs for refill are both valid to draw: a **Refill Scheduler** running on a timer that periodically increments the count up to capacity, or a lazy approach where \`tryAcquire()\` itself computes elapsed-time-since-last-refill on each call and tops up before checking — the lazy approach avoids a background thread entirely and is usually preferred in-process, but the scheduler version is easier to reason about and is what's reflected in the diagram.

Either way, the critical section is small and fast (a CAS loop on the token count), which is what keeps \`tryAcquire()\` cheap enough to call on every request without becoming a bottleneck itself.`,
  },
  {
    slug: "movie-ticket-booking",
    categorySlug: "lld-case-studies",
    track: "LLD",
    title: "Movie Ticket Booking System",
    difficulty: "HARD",
    tags: ["oo-design", "concurrency", "case-study"],
    estMinutes: 40,
    order: 1,
    description: `Design a movie ticket booking system: users browse showtimes, select seats, and book — with no two users able to book the same seat for the same showtime.

**Functional requirements**
- Browse movies, theaters, and showtimes.
- Select specific seats for a showtime and book them.
- Prevent double-booking the same seat under concurrent requests.

Draw the class model, including how seat locking prevents double-booking.`,
    rubric: {
      requiredComponents: ["Movie", "Showtime", "Seat", "Booking", "SeatLockManager"],
      requiredConnections: [
        { from: "Movie", to: "Showtime", label: "scheduled as" },
        { from: "Showtime", to: "Seat", label: "has seat map" },
        { from: "Booking", to: "Seat", label: "reserves" },
        { from: "SeatLockManager", to: "Seat", label: "locks during checkout" },
      ],
    },
    referenceExplanation: `**Showtime** owns its own set of **Seat** availability (the same physical Seat in a theater is reused across many Showtimes, so seat status must be per-showtime, not a property of Seat itself) — modeling this as a Showtime-Seat association (or a SeatStatus join entity) is what lets the same theater run multiple showtimes independently.

The double-booking requirement is a concurrency problem, not just a modeling one: **SeatLockManager** places a short-lived lock (or a "held" status with a timeout) on a seat the moment a user starts checkout, before payment completes — this reserves the seat for that user's session and prevents a second user from selecting it, while the timeout releases seats abandoned mid-checkout back to available.

A **Booking** is only created after the lock is confirmed and payment succeeds, linking the user to their reserved Seats for that Showtime; without the lock step, two concurrent Bookings could both pass a naive "is this seat free" check before either commits.`,
  },
  {
    slug: "ride-hailing-dispatch",
    categorySlug: "lld-case-studies",
    track: "LLD",
    title: "Ride-Hailing Dispatch",
    difficulty: "HARD",
    tags: ["oo-design", "matching", "case-study"],
    estMinutes: 40,
    order: 2,
    description: `Design the core matching logic for a ride-hailing app: a rider requests a ride, and the system finds and assigns a nearby available driver.

**Functional requirements**
- Track drivers' live location and availability status.
- Match an incoming ride request to a nearby available driver.
- Update ride and driver state as the ride progresses (requested -> matched -> in-progress -> completed).

Draw the class model showing how a ride request finds a driver.`,
    rubric: {
      requiredComponents: ["Rider", "RideRequest", "DispatchService", "DriverLocationIndex", "Driver", "Ride"],
      requiredConnections: [
        { from: "Rider", to: "RideRequest", label: "creates" },
        { from: "RideRequest", to: "DispatchService", label: "submitted to" },
        { from: "DispatchService", to: "DriverLocationIndex", label: "query nearby available" },
        { from: "DispatchService", to: "Driver", label: "assigns" },
        { from: "DispatchService", to: "Ride", label: "creates on match" },
      ],
    },
    referenceExplanation: `**DriverLocationIndex** is the piece candidates most often skip: matching "nearest available driver" efficiently requires a spatial index (a geohash grid or quadtree) rather than scanning every Driver's coordinates linearly — DispatchService queries it for candidates near the rider's location instead of computing distance to every driver in the system.

**DispatchService** owns the matching algorithm: given nearby candidates from the index, it filters to available drivers, picks one (nearest, or by a scoring function), and — critically — must atomically mark that Driver unavailable as part of assignment, or two simultaneous RideRequests could both match the same driver.

A **Ride** entity is created only on successful match, tracking its own state (matched -> in-progress -> completed) independent of the originating RideRequest — this separation lets a RideRequest that fails to match (no drivers nearby) be retried or expired without ever producing a Ride record.`,
  },
  {
    slug: "chess-game-engine",
    categorySlug: "lld-case-studies",
    track: "LLD",
    title: "Chess Game Engine",
    difficulty: "HARD",
    tags: ["oo-design", "case-study"],
    estMinutes: 40,
    order: 3,
    description: `Design the class model for a chess game: the board, pieces with their distinct movement rules, turn management, and move validation (including check detection).

**Functional requirements**
- Represent the board and all piece types with their movement rules.
- Validate whether a proposed move is legal (including not leaving your own king in check).
- Track turn order and detect check/checkmate.

Draw the class model, showing how piece-specific movement logic is organized.`,
    rubric: {
      requiredComponents: ["Board", "Piece (abstract)", "King", "Queen", "Pawn", "Game"],
      requiredConnections: [
        { from: "Board", to: "Piece (abstract)", label: "positions" },
        { from: "Piece (abstract)", to: "King", label: "subclass" },
        { from: "Piece (abstract)", to: "Queen", label: "subclass" },
        { from: "Piece (abstract)", to: "Pawn", label: "subclass" },
        { from: "Game", to: "Board", label: "manages" },
      ],
    },
    referenceExplanation: `**Piece (abstract)** defines a common \`getLegalMoves(board)\` method that each concrete subclass (**King**, **Queen**, **Pawn**, and the others) overrides with its own movement rules — this polymorphism is what avoids a giant switch-on-piece-type inside Board or Game every time legality needs checking.

**Board** is a fairly dumb 8x8 grid of squares/pieces exposing queries like "what's at this square" and "is this square attacked by the opponent" (the latter needed by every piece's move validation, and especially by King for check detection) — it holds state but delegates movement logic entirely to Piece.

**Game** sits above Board managing turn order and overall game state: it asks the current player's piece for legal moves, applies the chosen one, then must additionally verify the move doesn't leave that player's own King in check (typically by simulating the move and re-checking attacked squares) before finalizing it — this "simulate then validate" step is the part of check detection candidates most often forget, since a move can be legal for the piece in isolation but illegal because it exposes the king.`,
  },
  {
    slug: "splitwise-expense-sharing",
    categorySlug: "lld-case-studies",
    track: "LLD",
    title: "Splitwise / Expense Sharing",
    difficulty: "MEDIUM",
    tags: ["oo-design", "case-study"],
    estMinutes: 35,
    order: 4,
    description: `Design a Splitwise-like system: a group of users share expenses, each expense is split among some subset of the group (equally, by percentage, or by exact amount), and the system tracks who owes whom.

**Functional requirements**
- Create an expense paid by one user and split among others (equal / percentage / exact split strategies).
- Compute simplified balances: who owes whom, minimizing the number of settling transactions.

Draw the class model, including how different split strategies are represented.`,
    rubric: {
      requiredComponents: ["Group", "Expense", "SplitStrategy Interface", "EqualSplit", "PercentageSplit", "BalanceSheet"],
      requiredConnections: [
        { from: "Group", to: "Expense", label: "has many" },
        { from: "Expense", to: "SplitStrategy Interface", label: "uses to divide amount" },
        { from: "SplitStrategy Interface", to: "EqualSplit", label: "implemented by" },
        { from: "SplitStrategy Interface", to: "PercentageSplit", label: "implemented by" },
        { from: "Expense", to: "BalanceSheet", label: "updates" },
      ],
    },
    referenceExplanation: `Each **Expense** delegates "how much does each participant owe" to a **SplitStrategy Interface** (Strategy pattern again) — **EqualSplit**, **PercentageSplit**, and an ExactAmountSplit all implement the same \`computeShares(amount, participants)\` method, so Expense's creation logic never branches on split type.

**BalanceSheet** is the aggregate that turns a stream of Expenses into net balances per user pair — the naive approach (a ledger entry per expense-participant pair) works but produces many small pairwise debts; the "minimize settling transactions" requirement needs an additional simplification pass (net each user's total owed vs. owing, then greedily match the largest creditor with the largest debtor) run over BalanceSheet's raw data.

Keeping SplitStrategy separate from Expense also makes the system easy to extend (e.g. adding a "split by shares/weights" strategy) without touching Expense, Group, or BalanceSheet at all — the same open/closed benefit seen in the payment-processor Strategy problem.`,
  },
];

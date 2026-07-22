import type { ProblemSpec } from "../schema";


const ParkingLotHarness = `from datetime import datetime, timedelta

lot = ParkingLot([Level(1, [ParkingSpot("m1", VehicleSize.MOTORCYCLE), ParkingSpot("c1", VehicleSize.CAR)])], rate_per_hour=3.0)
car = Vehicle("CAR-1", VehicleSize.CAR)
ticket = lot.park(car)
assert ticket is not None and ticket.spot.spot_id == "c1"
assert lot.park(Vehicle("BUS-1", VehicleSize.BUS)) is None
ticket.entry_time = datetime(2020, 1, 1, 0, 0)
ticket.exit_time = datetime(2020, 1, 2, 2, 0)
assert ticket.fee(3.0) == 78.0
charged = lot.exit("CAR-1")
assert charged >= 3.0 and ticket.spot.vehicle is None
`;

const LibraryManagementHarness = `from datetime import date, timedelta

book = Book("978-1", "A Tale", "Author")
copy = BookCopy("copy-1", book)
member = Member("member-1", "Reader")
library = Library()
library.add_copy(copy)
assert [b.isbn for b in library.search("tale")] == ["978-1"]
loan = library.checkout(member, "978-1")
assert loan is not None and copy.status == CopyStatus.ON_LOAN
assert library.checkout(Member("member-2", "Other"), "978-1") is None
loan.due_date = date.today() + timedelta(days=1)
assert library.return_copy("copy-1") == 0.0
assert copy.status == CopyStatus.AVAILABLE
assert library.checkout(member, "978-1") is not None
`;

const ObserverStockTickerHarness = `class RecordingObserver(Observer):
    def __init__(self):
        self.updates = []
    def update(self, symbol, price):
        self.updates.append((symbol, price))

first = RecordingObserver()
second = RecordingObserver()
ticker = StockTicker()
ticker.subscribe(first)
ticker.subscribe(second)
ticker.set_price("ACME", 10.0)
assert first.updates == [("ACME", 10.0)] and second.updates == [("ACME", 10.0)]
ticker.unsubscribe(second)
ticker.set_price("ACME", 11.0)
assert first.updates[-1] == ("ACME", 11.0) and len(second.updates) == 1
class BrokenObserver(Observer):
    def update(self, symbol, price):
        raise RuntimeError("broken observer")
ticker.subscribe(BrokenObserver())
ticker.set_price("ACME", 12.0)
assert first.updates[-1] == ("ACME", 12.0)
`;

const StrategyPaymentProcessorHarness = `checkout = Checkout()
card = checkout.process(12.5, CreditCardPayment("4111111111111111"))
assert card.success and "1111" in card.message
paypal = checkout.process(4.0, PayPalPayment("buyer@example.com"))
assert paypal.success and "PayPal" in paypal.message
credit = StoreCreditPayment(10.0)
assert not checkout.process(11.0, credit).success
assert credit.available_balance == 10.0
assert checkout.process(6.0, credit).success and credit.available_balance == 4.0
assert not checkout.process(0.0, credit).success
`;

const FactoryNotificationServiceHarness = `class FakeClient:
    def __init__(self):
        self.calls = []
    def send_mail(self, content): self.calls.append(("email", content))
    def send_text(self, content): self.calls.append(("sms", content))
    def push(self, content): self.calls.append(("push", content))

smtp, sms, push = FakeClient(), FakeClient(), FakeClient()
factory = NotificationFactory(smtp, sms, push)
for kind, client in (("email", smtp), ("sms", sms), ("push", push)):
    notification = factory.create(kind)
    notification.send("hello")
    assert client.calls == [(kind, "hello")]
try:
    factory.create("carrier-pigeon")
    assert False, "unknown notification type should fail"
except ValueError:
    pass
`;

const TrafficLightControllerHarness = `light = TrafficLight()
assert light.current.name == "RED" and light.current.duration_seconds() == 30
assert light.advance().name == "GREEN"
assert light.advance().name == "YELLOW"
assert light.advance().name == "RED"
`;

const ElevatorSystemHarness = `elevator = Elevator()
elevator.request_floor(1)
elevator.request_floor(3)
assert elevator.direction == Direction.UP
elevator.step()
assert elevator.current_floor == 1 and elevator.door == DoorState.OPEN
# The farther request is serviced after the nearer request in the same direction.
elevator.close_doors()
elevator.step()
elevator.step()
assert elevator.current_floor == 3 and elevator.door == DoorState.OPEN
`;

const VendingMachineHarness = `machine = VendingMachine({"A": Item("Snack", 1.25, 1), "B": Item("Sold out", 2.0, 0)})
try:
    machine.insert_payment(1.0)
    assert False, "payment before selection should fail"
except ValueError:
    pass
try:
    machine.select("B")
    assert False, "out-of-stock item should fail"
except ValueError:
    pass
machine.select("A")
machine.insert_payment(0.25)
assert isinstance(machine.state, PaymentState)
assert machine.cancel() == 0.25 and isinstance(machine.state, IdleState)
machine.select("A")
machine.insert_payment(2.0)
assert machine.inventory["A"].stock == 0
assert machine.change_due == 0.75 and isinstance(machine.state, IdleState)
`;

const BoundedBlockingQueueHarness = `import threading
import time

queue = BoundedBlockingQueue(1)
queue.put("first")
finished = []
producer = threading.Thread(target=lambda: (queue.put("second"), finished.append(True)))
producer.start()
time.sleep(0.05)
assert not finished
assert queue.take() == "first"
producer.join(1.0)
assert finished == [True] and queue.take() == "second"
`;

const InProcessRateLimiterHarness = `import threading

limiter = TokenBucketRateLimiter(2, 0.0)
results = []
threads = [threading.Thread(target=lambda: results.append(limiter.try_acquire())) for _ in range(8)]
for thread in threads: thread.start()
for thread in threads: thread.join(1.0)
assert sum(results) == 2
assert not limiter.try_acquire()
`;

const MovieTicketBookingHarness = `movie = Movie("Example")
seat_a, seat_b = Seat("A1"), Seat("A2")
showtime = Showtime(movie, "Theater 1", "20:00", [seat_a, seat_b])
other_showtime = Showtime(movie, "Theater 1", "22:00", [seat_a, seat_b])
manager = SeatLockManager()
service = BookingService(manager)
assert manager.hold(showtime, "A1")
assert not manager.hold(showtime, "A1")
assert manager.confirm(showtime, "A1", "user-1")
assert not manager.hold(showtime, "A1")
assert manager.hold(other_showtime, "A1")
booking = service.book(showtime, ["A2"], "user-2")
assert booking is not None and booking.seat_ids == ["A2"]
assert showtime._booked == {"A1", "A2"}
assert service.book(showtime, ["A1"], "user-3") is None
`;

const RideHailingDispatchHarness = `index = DriverLocationIndex()
near = Driver("d-near", Location(0.5, 0.0))
far = Driver("d-far", Location(2.0, 0.0))
index.upsert(near)
index.upsert(far)
dispatch = DispatchService(index)
first = dispatch.match("rider-1", Location(0.0, 0.0), search_radius=3.0)
assert first is not None and first.driver.driver_id == "d-near"
second = dispatch.match("rider-2", Location(0.0, 0.0), search_radius=3.0)
assert second is not None and second.driver.driver_id == "d-far"
assert dispatch.match("rider-3", Location(0.0, 0.0), search_radius=0.1) is None
dispatch.complete(first)
assert near.status == DriverStatus.AVAILABLE and first.status == "completed"
`;

const ChessGameEngineHarness = `board = Board()
white_king = Position(0, 0)
black_king = Position(7, 7)
queen_at = Position(1, 1)
pawn_at = Position(2, 2)
board.squares[white_king] = King("white")
board.squares[black_king] = King("black")
board.squares[queen_at] = Queen("white")
board.squares[pawn_at] = Pawn("black")
assert Position(2, 2) in board.squares[queen_at].get_legal_moves(board, queen_at)
assert Position(1, 2) in board.squares[queen_at].get_legal_moves(board, queen_at)
game = Game(board)
assert game.try_move(queen_at, pawn_at)
assert game.turn == "black" and isinstance(board.squares[pawn_at], Queen)
assert not game.try_move(white_king, Position(0, 1))
`;

const SplitwiseExpenseSharingHarness = `equal = EqualSplit()
assert equal.compute_shares(30.0, ["a", "b", "c"]) == {"a": 10.0, "b": 10.0, "c": 10.0}
percentage = PercentageSplit({"a": 50.0, "b": 50.0})
assert percentage.compute_shares(20.0, ["a", "b"]) == {"a": 10.0, "b": 10.0}
try:
    PercentageSplit({"a": 20.0, "b": 20.0})
    assert False, "percentages must total 100"
except ValueError:
    pass
sheet = BalanceSheet()
sheet.apply(Expense("a", 30.0, ["a", "b", "c"], equal))
sheet.apply(Expense("b", 10.0, ["a", "b"], ExactAmountSplit({"a": 10.0, "b": 0.0})))
settlements = sheet.simplified_balances()
assert settlements == [("c", "a", 10.0)]
`;

const LruCacheDesignHarness = `cache = LRUCache(2)
cache.put("a", 1)
cache.put("b", 2)
assert cache.get("a") == 1
cache.put("c", 3)
assert cache.get("b") is None
assert cache.get("a") == 1 and cache.get("c") == 3
cache.put("a", 10)
assert cache.get("a") == 10
`;

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
    inStudyPlanSubset: true,
    generalHint: "Start by separating the physical entities (lot, level, spot, vehicle) from the transactional entity that records a visit (the ticket). Size compatibility between vehicle and spot is a single polymorphic check, not a class per size.",
    stepHints: [
      "List the nouns in the prompt: ParkingLot, Level, ParkingSpot, Vehicle, Ticket. What does each one own?",
      "Model spot size and vehicle size as an attribute (an enum), not a subclass per size - a Motorcycle and a Car are both just Vehicles with a size.",
      "A Ticket links a Vehicle to the Spot it was assigned, plus an entry timestamp - fee calculation reads from the Ticket, not from Vehicle or ParkingSpot directly.",
      "Think about spot assignment as a pluggable strategy (nearest-first vs. best-fit) even if you don't fully implement it - it's the natural extension point.",
    ],
    description: `Design the classes for a multi-level parking lot that supports different vehicle sizes (motorcycle, car, bus) and different spot sizes.

**Functional requirements**
- Assign an incoming vehicle to a suitable free spot.
- Support multiple levels, each with multiple spots of different sizes.
- Compute a parking fee on exit based on duration.

**Constraints and edge cases**
- A vehicle can only occupy a spot at least as large as itself (a bus cannot use a motorcycle spot; a motorcycle *can* use a car spot, wastefully, if nothing smaller is free).
- The lot may be full - assignment must be able to fail cleanly.
- Fee calculation must be based on actual duration, not a flat rate.

Draw the class model: the entities involved and how they relate to each other (not a sequence diagram, class boxes and relationships).`,
    rubric: {
      requiredComponents: ["ParkingLot", "Level", "ParkingSpot", "Vehicle", "Ticket"],
      requiredConnections: [
        { from: "ParkingLot", to: "Level", label: "has many" },
        { from: "Level", to: "ParkingSpot", label: "has many" },
        { from: "ParkingSpot", to: "Vehicle", label: "assigned to" },
        { from: "Vehicle", to: "Ticket", label: "issued" },
      ],
    },
    referenceExplanation: `## Design rationale

**ParkingLot** owns a collection of **Level**s, each owning a collection of **ParkingSpot**s typed by size (motorcycle/compact/large). Modeling size as an attribute of the spot (and of the **Vehicle**) rather than separate classes per size avoids class explosion and lets spot-assignment be one polymorphic "does this spot fit this vehicle" check.

On entry, a **Ticket** is created linking the Vehicle to its assigned ParkingSpot and an entry timestamp. On exit, the fee is computed from the Ticket's duration and the spot's rate, and the spot is freed. Keeping the Ticket as its own entity (rather than fields on Vehicle) is what makes fee calculation and spot release clean, symmetric operations.

## Trade-offs

A spot-assignment strategy (nearest-first vs. best-fit) is a natural Strategy-pattern extension point, since the assignment algorithm is likely to change independent of the rest of the model. Best-fit (smallest spot that still fits) minimizes wasted large spots but costs more to compute (needs to scan for the tightest fit instead of the first fit).

## Common mistakes

- Making a subclass per vehicle/spot size instead of an enum attribute - this doesn't scale and duplicates logic across subclasses.
- Putting fee logic on Vehicle instead of Ticket - Vehicle can move between many tickets over its lifetime, so fee state doesn't belong there.
- Forgetting the "lot is full" case entirely - assignment needs an explicit failure path, not an unchecked assumption a spot is always available.

## Edge cases to watch for

- A vehicle re-entering while an unpaid ticket from a previous visit is still open (should this be allowed?).
- Multiple entrances/exits needing to agree on spot availability concurrently (a hint that spot assignment needs to be atomic under concurrent entry attempts).`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: ParkingLotHarness },
    solutionCode: `from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Optional


class VehicleSize(Enum):
    MOTORCYCLE = 1
    CAR = 2
    BUS = 3


@dataclass
class Vehicle:
    license_plate: str
    size: VehicleSize


class ParkingSpot:
    def __init__(self, spot_id: str, size: VehicleSize):
        self.spot_id = spot_id
        self.size = size
        self.vehicle: Optional[Vehicle] = None

    def fits(self, vehicle: Vehicle) -> bool:
        return self.vehicle is None and vehicle.size.value <= self.size.value

    def assign(self, vehicle: Vehicle) -> None:
        self.vehicle = vehicle

    def release(self) -> None:
        self.vehicle = None


class Level:
    def __init__(self, level_id: int, spots: list[ParkingSpot]):
        self.level_id = level_id
        self.spots = spots

    def find_spot(self, vehicle: Vehicle) -> Optional[ParkingSpot]:
        candidates = [s for s in self.spots if s.fits(vehicle)]
        if not candidates:
            return None
        # Best-fit: smallest spot that still accommodates the vehicle.
        return min(candidates, key=lambda s: s.size.value)


@dataclass
class Ticket:
    vehicle: Vehicle
    spot: ParkingSpot
    entry_time: datetime
    exit_time: Optional[datetime] = None

    def fee(self, rate_per_hour: float) -> float:
        end = self.exit_time or datetime.now()
        duration_seconds = max(0.0, (end - self.entry_time).total_seconds())
        hours = max(1, int((duration_seconds + 3599) // 3600))
        return hours * rate_per_hour


class ParkingLot:
    def __init__(self, levels: list[Level], rate_per_hour: float = 2.0):
        self.levels = levels
        self.rate_per_hour = rate_per_hour
        self._open_tickets: dict[str, Ticket] = {}

    def park(self, vehicle: Vehicle) -> Optional[Ticket]:
        for level in self.levels:
            spot = level.find_spot(vehicle)
            if spot:
                spot.assign(vehicle)
                ticket = Ticket(vehicle=vehicle, spot=spot, entry_time=datetime.now())
                self._open_tickets[vehicle.license_plate] = ticket
                return ticket
        return None  # lot full for this vehicle size

    def exit(self, license_plate: str) -> float:
        ticket = self._open_tickets.pop(license_plate)
        ticket.exit_time = datetime.now()
        ticket.spot.release()
        return ticket.fee(self.rate_per_hour)
`,
    solutionSteps: [
      { title: "1. Identify the entities", body: "ParkingLot, Level, ParkingSpot, Vehicle, Ticket - one sentence of responsibility each before writing any code." },
      { title: "2. Model size compatibility", body: "VehicleSize as an ordered enum; a spot fits a vehicle if the spot's size value is >= the vehicle's, and the spot is free." },
      { title: "3. Spot assignment strategy", body: "Iterate levels, then find the tightest-fitting free spot on each (best-fit) rather than just the first free spot." },
      { title: "4. Ticket lifecycle", body: "park() creates a Ticket with entry_time; exit() looks up the open ticket, stamps exit_time, releases the spot, and returns the computed fee." },
      { title: "5. Handle the full-lot case", body: "park() returns None (or raises a specific exception) when no spot fits anywhere, rather than assuming success." },
    ],
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
    generalHint: "The single most important modeling decision is separating the catalog entry (Book) from a specific physical copy (BookCopy) - only the copy has a loan status.",
    stepHints: [
      "A Library has many Books; each Book can have many BookCopy instances.",
      "A Loan links a Member to one specific BookCopy, with checkout and due dates.",
      "Late fee should be a computed property (comparing due date to return date), not a stored field that can go stale.",
      "Search is an implementation detail of Library's catalog - don't over-design it unless asked to go deeper.",
    ],
    description: `Design the classes for a library system: members can search the catalog, check out books, and return them; the system tracks due dates and late fees.

**Functional requirements**
- Search books by title/author.
- Check out and return a book copy.
- Track due dates and compute late fees.

**Constraints and edge cases**
- The library may own multiple physical copies of the same book; some may be on loan while others are available.
- A member should not be able to check out a copy that's already on loan.
- Returning a copy after its due date must compute a late fee based on how overdue it is.

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
    referenceExplanation: `## Design rationale

Separating **Book** (the catalog entry: title, author, ISBN) from **BookCopy** (one physical, checkoutable instance) is the key modeling decision. A library can have five copies of the same Book, each independently on-loan or available, and only BookCopy needs a status/location.

A **Loan** connects a **Member** to a specific BookCopy with checkout and due dates. Late fees are a computed property of a Loan (comparing due date to return date), not stored state, which avoids the fee going stale if computed and cached at checkout time.

## Trade-offs

**Library** acts as the aggregate root exposing search over its Book catalog. Search itself is an implementation detail (index, DB query) that doesn't need its own class in a first-pass model, but is worth mentioning as an extension point (e.g. a SearchIndex collaborator) if asked to go deeper.

## Common mistakes

- Putting "available" as a boolean on Book instead of per-BookCopy - loses the ability to track which specific copy is out.
- Storing a computed late fee instead of computing it on demand from due/return dates.
- Allowing a Loan to be created for a BookCopy that already has an open Loan - checkout must check for this.

## Edge cases

- A member losing a book (a copy that never gets returned) - does the system need a "lost" BookCopy status?
- Renewing a loan (extending the due date) while it's still active vs. after it's already overdue.`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: LibraryManagementHarness },
    solutionCode: `from dataclasses import dataclass
from datetime import date, timedelta
from enum import Enum
from typing import Optional


class CopyStatus(Enum):
    AVAILABLE = "available"
    ON_LOAN = "on_loan"
    LOST = "lost"


@dataclass
class Book:
    isbn: str
    title: str
    author: str


class BookCopy:
    def __init__(self, copy_id: str, book: Book):
        self.copy_id = copy_id
        self.book = book
        self.status = CopyStatus.AVAILABLE


@dataclass
class Member:
    member_id: str
    name: str


class Loan:
    def __init__(self, member: Member, copy: BookCopy, checkout_date: date, loan_days: int = 14):
        self.member = member
        self.copy = copy
        self.checkout_date = checkout_date
        self.due_date = checkout_date + timedelta(days=loan_days)
        self.return_date: Optional[date] = None

    def late_fee(self, fee_per_day: float = 0.25) -> float:
        end = self.return_date or date.today()
        overdue_days = max(0, (end - self.due_date).days)
        return overdue_days * fee_per_day


class Library:
    def __init__(self):
        self._copies_by_isbn: dict[str, list[BookCopy]] = {}
        self._open_loans: dict[str, Loan] = {}  # copy_id -> Loan

    def add_copy(self, copy: BookCopy) -> None:
        self._copies_by_isbn.setdefault(copy.book.isbn, []).append(copy)

    def search(self, query: str) -> list[Book]:
        seen: dict[str, Book] = {}
        for copies in self._copies_by_isbn.values():
            for c in copies:
                if query.lower() in c.book.title.lower() or query.lower() in c.book.author.lower():
                    seen[c.book.isbn] = c.book
        return list(seen.values())

    def checkout(self, member: Member, isbn: str) -> Optional[Loan]:
        for copy in self._copies_by_isbn.get(isbn, []):
            if copy.status == CopyStatus.AVAILABLE:
                copy.status = CopyStatus.ON_LOAN
                loan = Loan(member, copy, date.today())
                self._open_loans[copy.copy_id] = loan
                return loan
        return None  # no available copy

    def return_copy(self, copy_id: str) -> float:
        loan = self._open_loans.pop(copy_id)
        loan.return_date = date.today()
        loan.copy.status = CopyStatus.AVAILABLE
        return loan.late_fee()
`,
    solutionSteps: [
      { title: "1. Separate Book from BookCopy", body: "Book is the catalog entry; BookCopy is one physical, checkoutable instance with its own status." },
      { title: "2. Model the Loan", body: "A Loan references exactly one Member and one BookCopy, with checkout_date and a computed due_date." },
      { title: "3. Compute, don't store, late fees", body: "late_fee() compares due_date to return_date (or today, if still out) - never a cached numeric field." },
      { title: "4. Checkout must find an available copy", body: "Scan the ISBN's copies for one with AVAILABLE status; return None/raise if none exist." },
      { title: "5. Return flips status back", body: "return_copy() sets return_date, frees the BookCopy, and returns the computed fee." },
    ],
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
    inStudyPlanSubset: true,
    generalHint: "The subject should only ever hold a list of the Observer interface, never concrete display types - that's the entire point of the pattern.",
    stepHints: [
      "Define an Observer interface with a single update(price) method.",
      "StockTicker holds a list of Observer references and a subscribe/unsubscribe method.",
      "When price changes, StockTicker loops the list calling update() on each - it never checks what kind of observer it's talking to.",
      "Each concrete observer (MobileDisplay, WebDashboard, AlertSystem) implements update() with its own side effect.",
    ],
    description: `Design a stock price ticker where multiple displays (mobile app, web dashboard, alert system) need to be notified whenever a stock's price changes, without the price source knowing about each display's concrete type.

**Functional requirements**
- Multiple subscribers can register/unregister for price updates.
- When a price changes, all current subscribers are notified.

**Constraints and edge cases**
- New subscriber types must be addable without modifying the price source's code.
- A subscriber that unregisters mid-update should not receive that update (or crash the notification loop).

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
    referenceExplanation: `## Design rationale

**StockTicker** holds a list of **Observer Interface** references (not concrete display types) and calls \`update()\` on each when a price changes. This is the core of the Observer pattern: the subject depends only on an abstraction, so new subscriber types (a new display, a logging service) can be added without touching StockTicker at all.

**MobileDisplay**, **WebDashboard**, and **AlertSystem** each implement the Observer interface's \`update(price)\` method with their own logic (render on screen, push notification, trigger a trade alert). The subject has no idea what any of them actually do with the update.

## Trade-offs

This decoupling is exactly why Observer is the standard answer whenever a prompt says "notify multiple, possibly-changing types of subscribers." The alternative (StockTicker holding typed references to each display class) would violate open/closed and force a change to StockTicker every time a new display type is added.

## Common mistakes

- Iterating and mutating the subscriber list in the same loop (unsubscribing during notification) - copy the list before iterating, or use a data structure safe for concurrent modification.
- Letting one observer's exception break notification for the rest - wrap each \`update()\` call so one bad subscriber doesn't stop delivery to others.

## Edge cases

- Thread safety if subscribe/unsubscribe can happen concurrently with a price update (worth a one-line callout even if not implemented).
- Whether observers get the full price object or just a delta - affects how much logic lives in the observer vs. the subject.`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: ObserverStockTickerHarness },
    solutionCode: `from abc import ABC, abstractmethod


class Observer(ABC):
    @abstractmethod
    def update(self, symbol: str, price: float) -> None: ...


class StockTicker:
    def __init__(self):
        self._observers: list[Observer] = []
        self._prices: dict[str, float] = {}

    def subscribe(self, observer: Observer) -> None:
        self._observers.append(observer)

    def unsubscribe(self, observer: Observer) -> None:
        if observer in self._observers:
            self._observers.remove(observer)

    def set_price(self, symbol: str, price: float) -> None:
        self._prices[symbol] = price
        for observer in list(self._observers):  # snapshot: safe if a handler unsubscribes
            try:
                observer.update(symbol, price)
            except Exception:
                continue  # one bad observer shouldn't break the rest


class MobileDisplay(Observer):
    def update(self, symbol: str, price: float) -> None:
        print(f"[mobile] {symbol}: {price}")


class WebDashboard(Observer):
    def update(self, symbol: str, price: float) -> None:
        print(f"[web] {symbol}: {price}")


class AlertSystem(Observer):
    def __init__(self, threshold: float):
        self.threshold = threshold

    def update(self, symbol: str, price: float) -> None:
        if price >= self.threshold:
            print(f"[alert] {symbol} crossed {self.threshold}: now {price}")
`,
    solutionSteps: [
      { title: "1. Define the Observer interface", body: "One abstract method, update(symbol, price), with no other assumptions about the subscriber." },
      { title: "2. StockTicker holds only the interface", body: "A list[Observer] field, plus subscribe()/unsubscribe()." },
      { title: "3. Notify on change", body: "set_price() updates internal state, then loops a snapshot of subscribers calling update() on each." },
      { title: "4. Concrete observers", body: "MobileDisplay, WebDashboard, AlertSystem each implement update() with their own side effect - StockTicker never branches on type." },
    ],
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
    generalHint: "Checkout should hold a PaymentStrategy reference chosen by the caller, and call one method on it - it should never branch on payment type internally.",
    stepHints: [
      "Define a PaymentStrategy interface with a single pay(amount) method.",
      "Checkout takes a PaymentStrategy instance (constructor or method parameter), not a type string.",
      "Each concrete strategy (CreditCardPayment, PayPalPayment, StoreCreditPayment) implements pay() with its own logic.",
      "Adding a new payment method should require writing exactly one new class - verify this by tracing through your design.",
    ],
    description: `Design a checkout flow that supports paying by credit card, PayPal, or store credit, where the payment method can be chosen at runtime and new methods added later without modifying checkout logic.

**Functional requirements**
- Checkout accepts an amount and a chosen payment method, and processes payment.
- New payment methods can be added without changing the checkout class.

**Constraints and edge cases**
- A payment can fail (insufficient funds/declined card) - checkout needs to handle that outcome distinctly from success.
- Store credit has a maximum available balance that must be checked before charging.

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
    referenceExplanation: `## Design rationale

**Checkout** holds a reference to a **PaymentStrategy Interface** (with a single \`pay(amount)\` method) rather than branching on a payment-type enum internally. The caller injects the concrete strategy (**CreditCardPayment**, **PayPalPayment**, **StoreCreditPayment**) at checkout time, and Checkout never needs an if/else on payment type.

Adding a new payment method (e.g. cryptocurrency) means writing one new class implementing PaymentStrategy, zero changes to Checkout, which is the whole point of the pattern and directly satisfies the "add methods without modifying checkout logic" requirement.

## Trade-offs

This is easy to confuse with Factory: Strategy is about swapping *behavior* (how payment is processed) chosen by the caller; Factory (next problem) is about *object creation* chosen by internal logic. A checkout system often uses both together: a factory to construct the right strategy from a payment-type string, then Strategy to actually run it.

## Common mistakes

- Having \`pay()\` return just a boolean instead of a result type that distinguishes "declined" from "network error" from "success" - checkout needs to react differently to each.
- Putting balance-checking logic for store credit inside Checkout instead of inside StoreCreditPayment - it's payment-method-specific and belongs in that strategy.

## Edge cases

- Partial payment across two strategies (splitting a charge between store credit and a card) - a good "what if" to raise even if out of scope.
- Idempotency: what happens if \`pay()\` is called twice for the same order due to a client retry?`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: StrategyPaymentProcessorHarness },
    solutionCode: `from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class PaymentResult:
    success: bool
    message: str


class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount: float) -> PaymentResult: ...


class CreditCardPayment(PaymentStrategy):
    def __init__(self, card_number: str):
        self.card_number = card_number

    def pay(self, amount: float) -> PaymentResult:
        # In reality: call a payment gateway here.
        return PaymentResult(True, f"Charged {amount} to card ending {self.card_number[-4:]}")


class PayPalPayment(PaymentStrategy):
    def __init__(self, email: str):
        self.email = email

    def pay(self, amount: float) -> PaymentResult:
        return PaymentResult(True, f"Charged {amount} via PayPal ({self.email})")


class StoreCreditPayment(PaymentStrategy):
    def __init__(self, available_balance: float):
        self.available_balance = available_balance

    def pay(self, amount: float) -> PaymentResult:
        if amount > self.available_balance:
            return PaymentResult(False, "Insufficient store credit")
        self.available_balance -= amount
        return PaymentResult(True, f"Charged {amount} to store credit")


class Checkout:
    def process(self, amount: float, strategy: PaymentStrategy) -> PaymentResult:
        if amount <= 0:
            return PaymentResult(False, "Invalid amount")
        return strategy.pay(amount)
`,
    solutionSteps: [
      { title: "1. Define PaymentStrategy", body: "One abstract method pay(amount) -> PaymentResult, where PaymentResult distinguishes success/failure with a message." },
      { title: "2. Checkout depends only on the interface", body: "process(amount, strategy: PaymentStrategy) - no knowledge of concrete payment types." },
      { title: "3. Implement each concrete strategy", body: "CreditCardPayment, PayPalPayment, StoreCreditPayment each hold their own method-specific state (card number, balance) and pay() logic." },
      { title: "4. Verify open/closed", body: "Add a fourth strategy (e.g. CryptoPayment) and confirm Checkout needs zero changes." },
    ],
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
    generalHint: "The factory's whole job is centralizing construction logic in one place - callers should never call a concrete notification class's constructor directly.",
    stepHints: [
      "Define a Notification interface with a send(content) method.",
      "NotificationFactory exposes create(type) -> Notification, switching internally on type.",
      "EmailNotification, SMSNotification, PushNotification each implement send() with their own delivery mechanism.",
      "Contrast with Strategy: here the caller passes a type string and lets the factory decide, rather than handing in an already-chosen behavior object.",
    ],
    description: `Design a notification service that creates the right kind of notification object (Email, SMS, Push) based on a type string, without callers needing to know the concrete classes.

**Functional requirements**
- Given a notification type and content, construct and send the correct notification.
- New notification types can be added without changing calling code.

**Constraints and edge cases**
- Different notification types may need different construction-time dependencies (an SMTP client for email, a provider client for SMS).
- An unknown type string should fail predictably, not silently construct the wrong thing.

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
    referenceExplanation: `## Design rationale

**NotificationFactory** exposes a single \`create(type)\` method that internally switches on the type to instantiate the right concrete class (**EmailNotification**, **SMSNotification**, **PushNotification**), all implementing a common **Notification Interface** (e.g. \`send(content)\`). Callers only ever interact with the interface, never the concrete constructors.

This centralizes construction logic in one place: if creating an SMSNotification later requires injecting a Twilio client while EmailNotification needs an SMTP client, that wiring lives inside the factory, not scattered across every call site that needs a notification.

## Trade-offs

Contrast with Strategy in the previous problem: here the *caller doesn't choose the class directly* (it passes a type string and lets the factory decide/construct), whereas Strategy has the caller explicitly hand in the behavior object it already chose. Factory answers "how do I construct the right thing," Strategy answers "how do I swap behavior."

## Common mistakes

- Putting delivery logic (actually sending the email/SMS) inside the factory instead of inside each concrete Notification class - the factory should only construct, not execute.
- Silently falling back to a default type on an unrecognized type string instead of raising - hides bugs at the call site.

## Edge cases

- What happens when construction itself fails (invalid phone number format for SMS)? The factory or the constructor should surface that clearly.`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: FactoryNotificationServiceHarness },
    solutionCode: `from abc import ABC, abstractmethod


class Notification(ABC):
    @abstractmethod
    def send(self, content: str) -> None: ...


class EmailNotification(Notification):
    def __init__(self, smtp_client):
        self.smtp_client = smtp_client

    def send(self, content: str) -> None:
        self.smtp_client.send_mail(content)


class SMSNotification(Notification):
    def __init__(self, sms_client):
        self.sms_client = sms_client

    def send(self, content: str) -> None:
        self.sms_client.send_text(content)


class PushNotification(Notification):
    def __init__(self, push_client):
        self.push_client = push_client

    def send(self, content: str) -> None:
        self.push_client.push(content)


class NotificationFactory:
    def __init__(self, smtp_client, sms_client, push_client):
        self._smtp_client = smtp_client
        self._sms_client = sms_client
        self._push_client = push_client

    def create(self, notification_type: str) -> Notification:
        if notification_type == "email":
            return EmailNotification(self._smtp_client)
        if notification_type == "sms":
            return SMSNotification(self._sms_client)
        if notification_type == "push":
            return PushNotification(self._push_client)
        raise ValueError(f"Unknown notification type: {notification_type}")
`,
    solutionSteps: [
      { title: "1. Define the Notification interface", body: "One method, send(content), implemented differently per channel." },
      { title: "2. Give the factory the shared dependencies", body: "NotificationFactory is constructed once with the clients each concrete type needs (SMTP, SMS provider, push provider)." },
      { title: "3. create() switches on type", body: "One branch per known type, constructing the right class with its dependency already wired in." },
      { title: "4. Fail loudly on unknown types", body: "Raise rather than defaulting, so a typo in a type string doesn't silently no-op." },
    ],
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
    inStudyPlanSubset: true,
    generalHint: "Give the context (TrafficLight) a reference to its current state object, and let each state know its own duration and what comes next - no central switch statement.",
    stepHints: [
      "Define a State interface with duration() and next_state() methods.",
      "TrafficLight holds a `current` state reference and a tick/advance loop.",
      "RedState, GreenState, YellowState each hardcode their own duration and which state they transition to.",
      "Verify: adding a fourth state (flashing yellow) should only mean writing one new class.",
    ],
    description: `Design a traffic light controller that cycles through Red -> Green -> Yellow -> Red, where each state knows how long it lasts and what state comes next.

**Functional requirements**
- The light transitions through a fixed cycle of states.
- Each state's behavior (duration, next state) is self-contained, so adding a new state (e.g. flashing yellow for night mode) doesn't require rewriting a big switch statement elsewhere.

**Constraints and edge cases**
- The controller must always be in exactly one state.
- Duration is state-specific (yellow is typically much shorter than red or green).

Draw the state machine: states and the transitions between them.`,
    rubric: {
      requiredComponents: ["TrafficLight (Context)", "RedState", "GreenState", "YellowState"],
      requiredConnections: [
        { from: "RedState", to: "GreenState", label: "transition after timer" },
        { from: "GreenState", to: "YellowState", label: "transition after timer" },
        { from: "YellowState", to: "RedState", label: "transition after timer" },
      ],
    },
    referenceExplanation: `## Design rationale

This is the State pattern: **TrafficLight** (the context) holds a reference to its current state object and delegates to it, rather than holding a status enum and a giant switch statement scattered through the class. Each of **RedState**, **GreenState**, **YellowState** knows its own duration and which state comes next.

Transitions are self-contained: each state's \`next()\` method returns the following state instance, so TrafficLight's tick loop is just "ask current state for its duration, wait, then advance to \`current.next()\`" - no external logic needs to know the full cycle order.

## Trade-offs

This is exactly why the "add a new state without touching existing logic" requirement is satisfied: adding \`FlashingYellowState\` for night mode means writing one new class and repointing which state transitions into/out of it, not modifying a central switch statement that enumerates every state.

## Common mistakes

- Putting the cycle order in TrafficLight (a list of states it iterates) instead of in each state's \`next()\` - reintroduces the central-switch problem the pattern is meant to avoid.
- Making states stateless singletons that also hold mutable timer data - keep timing as a parameter/return value, not instance state shared across the whole light.

## Edge cases

- An emergency override (force red immediately) - a good extension to discuss: does it bypass the normal next() chain, and how does state resume afterward?`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: TrafficLightControllerHarness },
    solutionCode: `from abc import ABC, abstractmethod


class LightState(ABC):
    @abstractmethod
    def duration_seconds(self) -> int: ...

    @abstractmethod
    def next_state(self) -> "LightState": ...

    name: str


class RedState(LightState):
    name = "RED"

    def duration_seconds(self) -> int:
        return 30

    def next_state(self) -> LightState:
        return GreenState()


class GreenState(LightState):
    name = "GREEN"

    def duration_seconds(self) -> int:
        return 25

    def next_state(self) -> LightState:
        return YellowState()


class YellowState(LightState):
    name = "YELLOW"

    def duration_seconds(self) -> int:
        return 5

    def next_state(self) -> LightState:
        return RedState()


class TrafficLight:
    def __init__(self):
        self.current: LightState = RedState()

    def advance(self) -> LightState:
        self.current = self.current.next_state()
        return self.current
`,
    solutionSteps: [
      { title: "1. Define the State interface", body: "duration_seconds() and next_state() - both delegate entirely to whichever concrete state is active." },
      { title: "2. Implement each state", body: "RedState -> GreenState -> YellowState -> RedState, each returning the next concrete instance." },
      { title: "3. TrafficLight just delegates", body: "Holds `current`, and advance() replaces it with current.next_state() - no knowledge of the full cycle." },
      { title: "4. Add a new state to prove the design", body: "FlashingYellowState only requires writing one class and repointing one transition, nothing in TrafficLight changes." },
    ],
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
    generalHint: "Separate the elevator's movement state (idle/moving up/moving down) from its door state (open/closed) - they're orthogonal concerns that interact but aren't the same state machine.",
    stepHints: [
      "Elevator delegates movement decisions to an ElevatorState (Idle, MovingUp, MovingDown).",
      "RequestQueue holds pending FloorRequests, typically split or sorted by direction.",
      "The 'don't reverse unnecessarily' rule (SCAN algorithm) means: service all requests in the current direction before reversing.",
      "Door state blocks movement transitions - check it before leaving Idle, but Door doesn't need to know about floor requests.",
    ],
    description: `Design a single-elevator control system: it receives floor requests (from inside the car and from hall call buttons), decides which to service next, and moves accordingly.

**Functional requirements**
- Accept requests for floors from inside the car and from hallways (up/down).
- Move toward and service the nearest sensible request given current direction (don't reverse direction unnecessarily).
- Track door state (open/closed) and movement state (idle/moving up/moving down).

**Constraints and edge cases**
- The elevator should not reverse direction while there are still unserviced requests in its current direction (the SCAN/elevator algorithm).
- The elevator cannot move while its doors are open.
- Simultaneous up and down hall requests at the same floor should both eventually be served.

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
    referenceExplanation: `## Design rationale

**Elevator** delegates its movement behavior to an **ElevatorState** (Idle / MovingUp / MovingDown), following the State pattern from the previous problem. "Should I keep going up or stop and reverse" is a decision that depends entirely on current state plus what's in the **RequestQueue**, so keeping that logic inside the state class (rather than a giant conditional in Elevator) keeps each direction's logic isolated.

The **RequestQueue** holds pending **FloorRequest**s and is typically split (or sorted) by direction. The classic "don't reverse unnecessarily" behavior (SCAN/elevator algorithm) comes from always servicing all requests in the current direction of travel before reversing, rather than servicing requests in arrival order.

**Door** is modeled separately because its state (open/closed/obstructed) is orthogonal to the elevator's movement state. The elevator can't move while doors are open, so Elevator checks Door state before transitioning out of Idle, but Door doesn't need to know anything about floor requests.

## Trade-offs

A single RequestQueue with client-side sorting is simpler to implement than two separate up/down queues, but two queues make "am I done in this direction" an O(1) emptiness check instead of a scan.

## Common mistakes

- Servicing requests in arrival (FIFO) order instead of direction-order - this is the single most common bug in elevator LLD answers and defeats the point of the SCAN algorithm.
- Letting the elevator start moving with doors open.

## Edge cases

- A request for the floor the elevator is currently idling at (should open doors immediately, no movement needed).
- What happens to an in-flight request if the elevator is taken out of service mid-cycle.`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: ElevatorSystemHarness },
    solutionCode: `from abc import ABC, abstractmethod
from enum import Enum


class Direction(Enum):
    UP = 1
    DOWN = -1
    IDLE = 0


class DoorState(Enum):
    OPEN = "open"
    CLOSED = "closed"


class RequestQueue:
    def __init__(self):
        self._floors: set[int] = set()

    def add(self, floor: int) -> None:
        self._floors.add(floor)

    def remove(self, floor: int) -> None:
        self._floors.discard(floor)

    def next_in_direction(self, current_floor: int, direction: Direction) -> int | None:
        candidates = [f for f in self._floors if (f - current_floor) * direction.value > 0]
        if not candidates:
            return None
        return min(candidates, key=lambda f: abs(f - current_floor))

    def is_empty(self) -> bool:
        return not self._floors


class Elevator:
    def __init__(self):
        self.current_floor = 0
        self.direction = Direction.IDLE
        self.door = DoorState.CLOSED
        self.queue = RequestQueue()

    def request_floor(self, floor: int) -> None:
        self.queue.add(floor)
        if self.direction == Direction.IDLE:
            self.direction = Direction.UP if floor > self.current_floor else Direction.DOWN

    def step(self) -> None:
        if self.door == DoorState.OPEN:
            return  # cannot move with doors open
        target = self.queue.next_in_direction(self.current_floor, self.direction)
        if target is None:
            # nothing left in this direction: try reversing, else go idle
            reversed_dir = Direction.DOWN if self.direction == Direction.UP else Direction.UP
            target = self.queue.next_in_direction(self.current_floor, reversed_dir)
            self.direction = reversed_dir if target is not None else Direction.IDLE
            if target is None:
                return
        self.current_floor += self.direction.value
        if self.current_floor == target:
            self.queue.remove(target)
            self.door = DoorState.OPEN

    def close_doors(self) -> None:
        self.door = DoorState.CLOSED
`,
    solutionSteps: [
      { title: "1. Separate movement state from door state", body: "Direction (idle/up/down) and DoorState (open/closed) are independent - track them as two fields, not one combined enum." },
      { title: "2. RequestQueue answers 'next floor in this direction'", body: "next_in_direction() filters to floors ahead of the current position in the current direction and picks the nearest." },
      { title: "3. step() implements SCAN", body: "Keep moving in the current direction while there are requests ahead; only reverse when none remain, and go idle only when both directions are empty." },
      { title: "4. Doors block movement", body: "step() returns immediately if the door is open - movement and door state interact but aren't the same state machine." },
    ],
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
    generalHint: "Model dispensing as its own state, not just an action taken from PaymentState - dispensing can itself fail (out of change), which needs to be a first-class transition.",
    stepHints: [
      "IdleState only allows 'select item'; it rejects 'insert payment' since nothing is selected yet.",
      "PaymentState tracks amount inserted vs. the selected item's price.",
      "An out-of-stock item should reject the selection before ever reaching PaymentState.",
      "DispensingState needs to handle its own failure (no change available) as a distinct transition, not an exception.",
    ],
    description: `Design a vending machine: a user selects an item, inserts money, and the machine dispenses the item and any change, handling insufficient funds and out-of-stock items.

**Functional requirements**
- Accept item selection and coin/bill insertion in any order the machine's state allows.
- Dispense the item and correct change once payment is sufficient.
- Handle out-of-stock and insufficient-payment cases distinctly.

**Constraints and edge cases**
- A user must be able to cancel and get their money back before the item is dispensed.
- The machine may run out of change to give back - this must not silently dispense the wrong change or lose the user's money.

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
    referenceExplanation: `## Design rationale

**VendingMachine** delegates each user action (select, insert coin, cancel) to its current state object, and each state only allows the transitions that make sense from it. **IdleState** accepts "select item" but rejects "insert payment" (nothing selected yet), which is a natural way to enforce valid operation ordering without scattering guard conditions through one monolithic class.

**PaymentState** tracks amount inserted so far versus the selected item's price. Insufficient funds keeps the machine in PaymentState accepting more coins, while an out-of-stock selection sends it back to IdleState (or a rejection substate) directly from ItemSelectedState rather than ever reaching PaymentState.

**DispensingState** is intentionally its own state, not just an action taken from PaymentState, because dispensing (and making change) can itself fail (e.g. out of change). Modeling it as a state makes that failure a first-class transition rather than an exception buried inside a payment method.

## Trade-offs

Allowing cancel from every state (returning to Idle, refunding any inserted money) adds a transition out of nearly every state - worth drawing explicitly since it's easy to forget and is a common interview follow-up question.

## Common mistakes

- Not modeling the "insufficient change available" failure at all - a real machine must never dispense an item without correct change, or must refuse the sale and refund instead.
- Allowing payment insertion before an item is selected.

## Edge cases

- Multiple items with different prices selected in sequence without completing a purchase.
- A coin returned mid-insertion (jam) - does the machine's state need to account for partial/failed insertion?`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: VendingMachineHarness },
    solutionCode: `from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class Item:
    name: str
    price: float
    stock: int


class VendingState(ABC):
    def select(self, machine: "VendingMachine", item_code: str) -> None:
        raise ValueError("Cannot select an item right now")

    def insert_payment(self, machine: "VendingMachine", amount: float) -> None:
        raise ValueError("Cannot insert payment right now")

    def cancel(self, machine: "VendingMachine") -> float:
        return 0.0


class IdleState(VendingState):
    def select(self, machine: "VendingMachine", item_code: str) -> None:
        item = machine.inventory.get(item_code)
        if not item or item.stock <= 0:
            raise ValueError("Item unavailable")
        machine.selected_item = item
        machine.inserted = 0.0
        machine.state = ItemSelectedState()


class ItemSelectedState(VendingState):
    def insert_payment(self, machine: "VendingMachine", amount: float) -> None:
        machine.inserted += amount
        machine.state = PaymentState()
        machine.state.insert_payment(machine, 0)  # re-check sufficiency immediately

    def cancel(self, machine: "VendingMachine") -> float:
        machine.selected_item = None
        machine.state = IdleState()
        return 0.0


class PaymentState(VendingState):
    def insert_payment(self, machine: "VendingMachine", amount: float) -> None:
        machine.inserted += amount
        if machine.inserted >= machine.selected_item.price:
            machine.state = DispensingState()
            machine.state.dispense(machine)

    def cancel(self, machine: "VendingMachine") -> float:
        refund = machine.inserted
        machine.selected_item = None
        machine.inserted = 0.0
        machine.state = IdleState()
        return refund


class DispensingState:
    def dispense(self, machine: "VendingMachine") -> None:
        item = machine.selected_item
        item.stock -= 1
        machine.change_due = round(machine.inserted - item.price, 2)
        machine.inserted = 0.0
        machine.selected_item = None
        machine.state = IdleState()


class VendingMachine:
    def __init__(self, inventory: dict[str, Item]):
        self.inventory = inventory
        self.state: VendingState = IdleState()
        self.selected_item: Item | None = None
        self.inserted = 0.0
        self.change_due = 0.0

    def select(self, item_code: str) -> None:
        self.state.select(self, item_code)

    def insert_payment(self, amount: float) -> None:
        self.state.insert_payment(self, amount)

    def cancel(self) -> float:
        return self.state.cancel(self)
`,
    solutionSteps: [
      { title: "1. Define state-specific guards", body: "Each state overrides only the actions valid from it; the base class raises for everything else." },
      { title: "2. IdleState -> ItemSelectedState", body: "select() checks stock, records the item, and transitions." },
      { title: "3. ItemSelectedState/PaymentState accumulate payment", body: "insert_payment() adds to a running total and checks against the item's price on every insertion." },
      { title: "4. DispensingState finalizes the sale", body: "Decrements stock, computes change_due, resets, and returns to Idle - modeled as a state so a future 'out of change' check has somewhere to live." },
      { title: "5. cancel() is available from most states", body: "Refunds whatever was inserted and returns to Idle." },
    ],
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
    inStudyPlanSubset: true,
    generalHint: "You need two condition variables, not one - a single condition wakes every waiter (producers and consumers alike) on every change, wasting cycles and requiring extra re-checks.",
    stepHints: [
      "Wrap a fixed-size buffer; every access to it happens under one Lock.",
      "put() on a full queue waits on a 'not full' condition; take() on an empty queue waits on a 'not empty' condition.",
      "A successful take() signals 'not full'; a successful put() signals 'not empty'.",
      "Always re-check the wait condition in a while loop after waking, never assume it's true just because you were woken.",
    ],
    description: `Design a fixed-capacity thread-safe queue supporting multiple producer and consumer threads: producers block when the queue is full, consumers block when it's empty.

**Functional requirements**
- \`put(item)\` blocks if the queue is at capacity until space is available.
- \`take()\` blocks if the queue is empty until an item is available.
- Safe under concurrent access from multiple producer and consumer threads.

**Constraints and edge cases**
- Spurious wakeups (a thread waking without the condition actually being true) must not cause incorrect behavior.
- Multiple waiting producers and multiple waiting consumers should each eventually make progress (no starvation).

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
    referenceExplanation: `## Design rationale

**BoundedBlockingQueue** wraps an **Internal Buffer** (a fixed-size array or linked list), and every access to it, from either \`put\` or \`take\`, happens while holding a single **Lock**. This is what makes concurrent access safe; without it, two threads mutating the buffer's head/tail pointers simultaneously would corrupt state.

Blocking behavior comes from two condition variables associated with that lock: a producer calling \`put\` on a full queue waits on **NotFull Condition** until a consumer's \`take\` signals it after removing an item; symmetrically, a consumer waiting on **NotEmpty Condition** is signaled after a producer's \`put\` adds an item. Using two separate conditions (rather than one) avoids waking up threads that still can't proceed (e.g. waking a waiting producer when a *consumer* was actually signaled).

## Trade-offs

A single condition variable is simpler to implement but wakes every waiter (including ones that still can't proceed) on every signal, wasting CPU under high contention. Two conditions cost a little extra bookkeeping for a real throughput win.

## Common mistakes

- Using \`if (full) wait()\` instead of \`while (full) wait()\`. Spurious wakeups or multiple waiters mean a thread must re-check the condition after waking, not assume it's now true.
- Forgetting to release the lock while waiting (condition variables do this automatically in most languages, but it's worth stating explicitly why it's necessary: otherwise no other thread could ever make progress to satisfy the condition).

## Edge cases

- Capacity of zero (a "rendezvous" queue where put and take must happen simultaneously) - a good edge case to raise even if not required.`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: BoundedBlockingQueueHarness },
    solutionCode: `import threading
from collections import deque


class BoundedBlockingQueue:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self._buffer: deque = deque()
        self._lock = threading.Lock()
        self._not_full = threading.Condition(self._lock)
        self._not_empty = threading.Condition(self._lock)

    def put(self, item) -> None:
        with self._not_full:
            while len(self._buffer) >= self.capacity:
                self._not_full.wait()
            self._buffer.append(item)
            self._not_empty.notify()

    def take(self):
        with self._not_empty:
            while not self._buffer:
                self._not_empty.wait()
            item = self._buffer.popleft()
            self._not_full.notify()
            return item

    def size(self) -> int:
        with self._lock:
            return len(self._buffer)
`,
    solutionSteps: [
      { title: "1. One lock guards the buffer", body: "A single threading.Lock protects every read/write of the internal deque." },
      { title: "2. Two condition variables, sharing that lock", body: "not_full for producers, not_empty for consumers - both built on the same underlying lock." },
      { title: "3. put() waits, appends, signals", body: "While full, wait() on not_full (releasing the lock); once space exists, append and notify a waiting consumer via not_empty." },
      { title: "4. take() is the mirror image", body: "While empty, wait() on not_empty; once an item exists, pop it and notify a waiting producer via not_full." },
      { title: "5. Always wait() in a while loop", body: "Re-check the condition after waking - never assume the wakeup means the condition is still true." },
    ],
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
    generalHint: "The token count needs to be updated atomically under concurrent callers - a naive 'check then decrement' lets two threads both pass the check when only one token remains.",
    stepHints: [
      "Track token count and last-refill timestamp as state protected by a lock (or use atomic/CAS operations).",
      "On every tryAcquire(), first compute elapsed time since the last refill and top up tokens (capped at capacity) - this is the 'lazy refill' approach.",
      "Only after refilling, check and decrement atomically.",
      "Keep the critical section tiny - it should be cheap enough to call on every request.",
    ],
    description: `Design an in-process (single JVM/process, no external store) rate limiter class using the token bucket algorithm, safe for concurrent calls from multiple threads.

**Functional requirements**
- \`tryAcquire()\` returns true if a request is allowed, false if the bucket is empty.
- Tokens refill at a fixed rate up to a max capacity.
- Thread-safe under concurrent callers.

**Constraints and edge cases**
- Refilling must not require a dedicated background thread if it can be avoided (prefer lazy, on-demand refill).
- The critical section must stay small so \`tryAcquire()\` doesn't itself become a bottleneck.

Draw the class model: the limiter, its token state, and the refill mechanism.`,
    rubric: {
      requiredComponents: ["TokenBucketRateLimiter", "Token Count (Atomic)", "Refill Scheduler", "Caller Thread"],
      requiredConnections: [
        { from: "Caller Thread", to: "TokenBucketRateLimiter", label: "tryAcquire()" },
        { from: "TokenBucketRateLimiter", to: "Token Count (Atomic)", label: "decrement on acquire" },
        { from: "Refill Scheduler", to: "Token Count (Atomic)", label: "increment on tick" },
      ],
    },
    referenceExplanation: `## Design rationale

**Token Count (Atomic)** must be a genuinely atomic/compare-and-swap counter (not a plain int guarded by intent) because multiple **Caller Thread**s call \`tryAcquire()\` concurrently. A naive "check then decrement" without atomicity lets two threads both pass the check when only one token remains, over-admitting requests.

Two designs for refill are both valid to draw: a **Refill Scheduler** running on a timer that periodically increments the count up to capacity, or a lazy approach where \`tryAcquire()\` itself computes elapsed-time-since-last-refill on each call and tops up before checking. The lazy approach avoids a background thread entirely and is usually preferred in-process, but the scheduler version is easier to reason about and is what's reflected in the diagram.

## Trade-offs

Either way, the critical section is small and fast (a lock or CAS loop around the token count), which is what keeps \`tryAcquire()\` cheap enough to call on every request without becoming a bottleneck itself.

## Common mistakes

- Refilling with a plain (non-atomic) read-modify-write under concurrent access - loses updates the same way the check-then-decrement bug does.
- Recomputing elapsed time from "now minus creation time" instead of "now minus last refill time" - double-counts already-granted tokens.

## Edge cases

- Clock going backward (NTP adjustment) - elapsed-time computation should treat a negative delta as zero, not as "refill nothing forever."`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: InProcessRateLimiterHarness },
    solutionCode: `import threading
import time


class TokenBucketRateLimiter:
    def __init__(self, capacity: int, refill_rate_per_sec: float):
        self.capacity = capacity
        self.refill_rate_per_sec = refill_rate_per_sec
        self._tokens = float(capacity)
        self._last_refill = time.monotonic()
        self._lock = threading.Lock()

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = max(0.0, now - self._last_refill)
        self._tokens = min(self.capacity, self._tokens + elapsed * self.refill_rate_per_sec)
        self._last_refill = now

    def try_acquire(self) -> bool:
        with self._lock:
            self._refill()
            if self._tokens >= 1.0:
                self._tokens -= 1.0
                return True
            return False
`,
    solutionSteps: [
      { title: "1. Track tokens as a float plus last-refill timestamp", body: "A float lets partial refills accumulate correctly between calls rather than only on whole-second boundaries." },
      { title: "2. Refill lazily on every call", body: "_refill() computes elapsed time since last_refill, adds elapsed * rate tokens (capped at capacity), and updates the timestamp." },
      { title: "3. Guard the whole check-and-decrement with one lock", body: "try_acquire() refills, then checks >= 1 and decrements, all inside the same critical section - no window for two threads to both pass the check." },
      { title: "4. Keep the critical section tiny", body: "No I/O, no allocation beyond a float subtraction - this is what keeps the limiter cheap under high call volume." },
    ],
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
    generalHint: "Seat availability must be per-showtime, not a property of Seat itself - the same physical seat is reused across many showtimes. Preventing double-booking is a concurrency problem layered on top of the model.",
    stepHints: [
      "Showtime owns its own seat availability map, keyed by Seat.",
      "SeatLockManager places a short-lived hold on a seat the instant checkout starts, before payment completes.",
      "A Booking is only created after the lock is confirmed and payment succeeds.",
      "A hold that's never converted to a Booking must expire and release the seat automatically.",
    ],
    description: `Design a movie ticket booking system: users browse showtimes, select seats, and book, with no two users able to book the same seat for the same showtime.

**Functional requirements**
- Browse movies, theaters, and showtimes.
- Select specific seats for a showtime and book them.
- Prevent double-booking the same seat under concurrent requests.

**Constraints and edge cases**
- A user who starts checkout but abandons it should not permanently block that seat for others.
- The same theater seat must be independently bookable across different showtimes.

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
    referenceExplanation: `## Design rationale

**Showtime** owns its own set of **Seat** availability (the same physical Seat in a theater is reused across many Showtimes, so seat status must be per-showtime, not a property of Seat itself). Modeling this as a Showtime-Seat association (or a SeatStatus join entity) is what lets the same theater run multiple showtimes independently.

The double-booking requirement is a concurrency problem, not just a modeling one: **SeatLockManager** places a short-lived lock (or a "held" status with a timeout) on a seat the moment a user starts checkout, before payment completes. This reserves the seat for that user's session and prevents a second user from selecting it, while the timeout releases seats abandoned mid-checkout back to available.

A **Booking** is only created after the lock is confirmed and payment succeeds, linking the user to their reserved Seats for that Showtime. Without the lock step, two concurrent Bookings could both pass a naive "is this seat free" check before either commits.

## Trade-offs

A pessimistic lock (hold the seat the instant selection starts) gives better user experience (no "sorry, someone else got it" at payment time) at the cost of seats being unavailable to others during someone's abandoned checkout, mitigated by a short timeout.

## Common mistakes

- Checking seat availability and creating the Booking as two separate, non-atomic steps - the classic TOCTOU (time-of-check to time-of-use) race that lets two users both "succeed."
- Modeling seat status on Seat instead of per-(Showtime, Seat) pair.

## Edge cases

- A refund/cancellation after booking needs to release the seat back to available for that showtime.`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: MovieTicketBookingHarness },
    solutionCode: `import threading
import time
from dataclasses import dataclass, field


@dataclass
class Movie:
    title: str


@dataclass
class Seat:
    seat_id: str


@dataclass
class Showtime:
    movie: Movie
    theater: str
    start_time: str
    seats: list[Seat]
    _held: dict[str, float] = field(default_factory=dict)   # seat_id -> hold expiry
    _booked: set[str] = field(default_factory=set)           # seat_id


@dataclass
class Booking:
    showtime: Showtime
    seat_ids: list[str]
    user_id: str


class SeatLockManager:
    HOLD_SECONDS = 120

    def __init__(self):
        self._lock = threading.Lock()

    def hold(self, showtime: Showtime, seat_id: str) -> bool:
        with self._lock:
            now = time.monotonic()
            if seat_id in showtime._booked:
                return False
            expiry = showtime._held.get(seat_id)
            if expiry and expiry > now:
                return False  # currently held by someone else
            showtime._held[seat_id] = now + self.HOLD_SECONDS
            return True

    def confirm(self, showtime: Showtime, seat_id: str, user_id: str) -> bool:
        with self._lock:
            now = time.monotonic()
            expiry = showtime._held.get(seat_id)
            if not expiry or expiry <= now or seat_id in showtime._booked:
                return False  # hold expired or already booked
            showtime._booked.add(seat_id)
            del showtime._held[seat_id]
            return True


class BookingService:
    def __init__(self, lock_manager: SeatLockManager):
        self.lock_manager = lock_manager

    def book(self, showtime: Showtime, seat_ids: list[str], user_id: str) -> Booking | None:
        held = []
        for seat_id in seat_ids:
            if self.lock_manager.hold(showtime, seat_id):
                held.append(seat_id)
            else:
                return None  # could not hold all requested seats
        # payment would happen here
        if all(self.lock_manager.confirm(showtime, s, user_id) for s in held):
            return Booking(showtime=showtime, seat_ids=held, user_id=user_id)
        return None
`,
    solutionSteps: [
      { title: "1. Seat availability lives on Showtime", body: "_held (temporary) and _booked (final) sets belong to Showtime, not Seat - the same Seat is independent across Showtimes." },
      { title: "2. hold() atomically checks and reserves", body: "Under one lock: reject if already booked or held by someone else (and not expired), else record a hold with an expiry timestamp." },
      { title: "3. confirm() finalizes after payment", body: "Only succeeds if the caller's hold is still valid; moves the seat from _held to _booked atomically." },
      { title: "4. BookingService orchestrates", body: "Hold every requested seat first (abort if any fails), then confirm all after payment succeeds - a Booking is only created on full success." },
    ],
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
    generalHint: "Matching 'nearest available driver' efficiently needs a spatial index, not a linear scan over every driver's coordinates - and marking the matched driver unavailable must be atomic with the match itself.",
    stepHints: [
      "DriverLocationIndex answers 'which available drivers are near this point' without scanning every driver.",
      "DispatchService queries the index, filters to available drivers, and picks one (nearest or by a scoring function).",
      "Marking the chosen Driver unavailable must happen atomically as part of assignment, or two requests can match the same driver.",
      "A Ride is only created on successful match - a RideRequest that fails to match can be retried or expired independently.",
    ],
    description: `Design the core matching logic for a ride-hailing app: a rider requests a ride, and the system finds and assigns a nearby available driver.

**Functional requirements**
- Track drivers' live location and availability status.
- Match an incoming ride request to a nearby available driver.
- Update ride and driver state as the ride progresses (requested -> matched -> in-progress -> completed).

**Constraints and edge cases**
- Two simultaneous ride requests must never both be matched to the same driver.
- No nearby driver being available should fail gracefully, not throw an unhandled error.

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
    referenceExplanation: `## Design rationale

**DriverLocationIndex** is the piece candidates most often skip: matching "nearest available driver" efficiently requires a spatial index (a geohash grid or quadtree) rather than scanning every Driver's coordinates linearly. DispatchService queries it for candidates near the rider's location instead of computing distance to every driver in the system.

**DispatchService** owns the matching algorithm: given nearby candidates from the index, it filters to available drivers, picks one (nearest, or by a scoring function), and, critically, must atomically mark that Driver unavailable as part of assignment, or two simultaneous RideRequests could both match the same driver.

A **Ride** entity is created only on successful match, tracking its own state (matched -> in-progress -> completed) independent of the originating RideRequest. This separation lets a RideRequest that fails to match (no drivers nearby) be retried or expired without ever producing a Ride record.

## Trade-offs

A geohash-based index is simpler to implement than a full quadtree and works well enough for city-scale matching; a quadtree pays off at larger scale or very uneven driver density.

## Common mistakes

- Matching (finding a candidate) and assigning (marking unavailable) as two non-atomic steps - the same race condition as the seat-booking problem.
- Modeling Ride and RideRequest as the same entity - conflates "an intent to find a driver" with "an actual trip in progress," making retry/expiry logic awkward.

## Edge cases

- A driver going offline (or their app crashing) mid-assignment, after being marked unavailable but before the ride starts - needs a way to release them back to available.`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: RideHailingDispatchHarness },
    solutionCode: `import math
import threading
from dataclasses import dataclass
from enum import Enum


@dataclass
class Location:
    lat: float
    lng: float

    def distance_to(self, other: "Location") -> float:
        return math.hypot(self.lat - other.lat, self.lng - other.lng)


class DriverStatus(Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    OFFLINE = "offline"


@dataclass
class Driver:
    driver_id: str
    location: Location
    status: DriverStatus = DriverStatus.AVAILABLE


class DriverLocationIndex:
    """Simplified: a flat scan bucketed by rounded geohash-like cell.
    A production system would use a real geohash/quadtree, but the interface
    (nearby(location, radius) -> candidate drivers) is what matters here."""

    def __init__(self):
        self._drivers: dict[str, Driver] = {}

    def upsert(self, driver: Driver) -> None:
        self._drivers[driver.driver_id] = driver

    def nearby(self, location: Location, radius: float) -> list[Driver]:
        return [
            d for d in self._drivers.values()
            if d.status == DriverStatus.AVAILABLE and d.location.distance_to(location) <= radius
        ]


@dataclass
class Ride:
    ride_id: str
    rider_id: str
    driver: Driver
    status: str = "matched"


class DispatchService:
    def __init__(self, index: DriverLocationIndex):
        self.index = index
        self._lock = threading.Lock()
        self._ride_counter = 0

    def match(self, rider_id: str, pickup: Location, search_radius: float = 5.0) -> Ride | None:
        with self._lock:
            candidates = self.index.nearby(pickup, search_radius)
            if not candidates:
                return None
            best = min(candidates, key=lambda d: d.location.distance_to(pickup))
            best.status = DriverStatus.ASSIGNED  # atomic with the match, inside the same lock
            self._ride_counter += 1
            return Ride(ride_id=f"ride-{self._ride_counter}", rider_id=rider_id, driver=best)

    def complete(self, ride: Ride) -> None:
        with self._lock:
            ride.status = "completed"
            ride.driver.status = DriverStatus.AVAILABLE
`,
    solutionSteps: [
      { title: "1. Index answers 'nearby available drivers'", body: "DriverLocationIndex.nearby() filters by status and distance - a real system swaps the scan for a geohash/quadtree without changing this interface." },
      { title: "2. Match and assign under one lock", body: "DispatchService.match() finds the best candidate and flips their status to ASSIGNED inside the same critical section - no gap for a second request to grab the same driver." },
      { title: "3. Ride is separate from RideRequest", body: "A Ride only exists after a successful match; a failed match returns None and the caller can retry or expire the original request." },
      { title: "4. complete() releases the driver", body: "Marks the Ride completed and flips the driver back to AVAILABLE for the next match." },
    ],
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
    generalHint: "Give every Piece subclass its own get_legal_moves(board) - this polymorphism is what avoids a giant switch-on-piece-type every time legality needs checking.",
    stepHints: [
      "Piece (abstract) defines get_legal_moves(board); each concrete piece overrides it with its own movement rules.",
      "Board is a fairly dumb grid exposing 'what's at this square' and 'is this square attacked' queries.",
      "Game manages turn order and asks the current player's piece for legal moves.",
      "A move that's legal for the piece in isolation can still be illegal if it exposes the mover's own king - simulate the move, then re-check before finalizing.",
    ],
    description: `Design the class model for a chess game: the board, pieces with their distinct movement rules, turn management, and move validation (including check detection).

**Functional requirements**
- Represent the board and all piece types with their movement rules.
- Validate whether a proposed move is legal (including not leaving your own king in check).
- Track turn order and detect check/checkmate.

**Constraints and edge cases**
- A move that is legal for the piece type alone can still be illegal if it leaves the mover's own king in check.
- Turn order must be enforced (a player cannot move the opponent's pieces).

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
    referenceExplanation: `## Design rationale

**Piece (abstract)** defines a common \`get_legal_moves(board)\` method that each concrete subclass (**King**, **Queen**, **Pawn**, and the others) overrides with its own movement rules. This polymorphism is what avoids a giant switch-on-piece-type inside Board or Game every time legality needs checking.

**Board** is a fairly dumb 8x8 grid of squares/pieces exposing queries like "what's at this square" and "is this square attacked by the opponent" (the latter needed by every piece's move validation, and especially by King for check detection). It holds state but delegates movement logic entirely to Piece.

**Game** sits above Board managing turn order and overall game state: it asks the current player's piece for legal moves, applies the chosen one, then must additionally verify the move doesn't leave that player's own King in check (typically by simulating the move and re-checking attacked squares) before finalizing it.

## Trade-offs

"Simulate then validate" (apply the move to a copy of the board, check if your king is attacked, then commit or reject) is simpler to reason about than trying to precompute pins/discovered checks analytically, at the cost of being more computationally expensive per move check.

## Common mistakes

- Forgetting the simulate-then-validate step entirely - a move can be legal for the piece in isolation but illegal because it exposes the king (this is the part candidates most often miss).
- Special-casing castling and en passant as one-off hacks in Game instead of as part of each piece's legal-move generation.

## Edge cases

- Pawn promotion (reaching the last rank) - the pawn becomes a different piece type, worth a one-line callout.
- Stalemate (no legal moves but not in check) vs. checkmate (no legal moves and in check) are different end states that share the "no legal moves" check.`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: ChessGameEngineHarness },
    solutionCode: `from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Position:
    row: int
    col: int


class Piece(ABC):
    def __init__(self, color: str):
        self.color = color

    @abstractmethod
    def get_legal_moves(self, board: "Board", at: Position) -> list[Position]: ...


class Pawn(Piece):
    def get_legal_moves(self, board: "Board", at: Position) -> list[Position]:
        direction = 1 if self.color == "white" else -1
        moves = []
        forward = Position(at.row + direction, at.col)
        if board.is_empty(forward):
            moves.append(forward)
        for dc in (-1, 1):
            diag = Position(at.row + direction, at.col + dc)
            if board.has_opponent(diag, self.color):
                moves.append(diag)
        return [m for m in moves if board.in_bounds(m)]


class King(Piece):
    def get_legal_moves(self, board: "Board", at: Position) -> list[Position]:
        candidates = [
            Position(at.row + dr, at.col + dc)
            for dr in (-1, 0, 1) for dc in (-1, 0, 1) if (dr, dc) != (0, 0)
        ]
        return [c for c in candidates if board.in_bounds(c) and not board.has_own(c, self.color)]


class Queen(Piece):
    def get_legal_moves(self, board: "Board", at: Position) -> list[Position]:
        directions = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
        return board.sliding_moves(at, directions, self.color)


class Board:
    def __init__(self):
        self.squares: dict[Position, Piece] = {}

    def in_bounds(self, p: Position) -> bool:
        return 0 <= p.row < 8 and 0 <= p.col < 8

    def is_empty(self, p: Position) -> bool:
        return self.in_bounds(p) and p not in self.squares

    def has_own(self, p: Position, color: str) -> bool:
        piece = self.squares.get(p)
        return piece is not None and piece.color == color

    def has_opponent(self, p: Position, color: str) -> bool:
        piece = self.squares.get(p)
        return piece is not None and piece.color != color

    def sliding_moves(self, at: Position, directions: list[tuple[int, int]], color: str) -> list[Position]:
        moves = []
        for dr, dc in directions:
            r, c = at.row + dr, at.col + dc
            while self.in_bounds(Position(r, c)):
                pos = Position(r, c)
                if self.has_own(pos, color):
                    break
                moves.append(pos)
                if self.has_opponent(pos, color):
                    break
                r, c = r + dr, c + dc
        return moves

    def is_square_attacked(self, pos: Position, by_color: str) -> bool:
        for square, piece in self.squares.items():
            if piece.color == by_color and pos in piece.get_legal_moves(self, square):
                return True
        return False

    def move(self, frm: Position, to: Position) -> None:
        self.squares[to] = self.squares.pop(frm)


class Game:
    def __init__(self, board: Board):
        self.board = board
        self.turn = "white"

    def try_move(self, frm: Position, to: Position) -> bool:
        piece = self.board.squares.get(frm)
        if not piece or piece.color != self.turn or to not in piece.get_legal_moves(self.board, frm):
            return False

        # Simulate, then validate: does this move leave our own king in check?
        captured = self.board.squares.get(to)
        self.board.move(frm, to)
        king_pos = next(p for p, pc in self.board.squares.items() if isinstance(pc, King) and pc.color == self.turn)
        leaves_in_check = self.board.is_square_attacked(king_pos, "black" if self.turn == "white" else "white")
        if leaves_in_check:
            self.board.move(to, frm)  # undo
            if captured:
                self.board.squares[to] = captured
            return False

        self.turn = "black" if self.turn == "white" else "white"
        return True
`,
    solutionSteps: [
      { title: "1. Piece is polymorphic", body: "get_legal_moves(board, at) is the only method Game/Board need - each subclass implements its own movement shape (Pawn's diagonal captures, Queen's sliding lines, King's single step)." },
      { title: "2. Board exposes queries, not rules", body: "in_bounds, is_empty, has_own, has_opponent, sliding_moves (shared by rook/bishop/queen), and is_square_attacked (scans all opposing pieces' legal moves)." },
      { title: "3. try_move checks piece-level legality first", body: "Wrong turn or not in get_legal_moves() rejects immediately, cheaply, before any simulation." },
      { title: "4. Simulate, then validate for check", body: "Apply the move, find your own king, ask is_square_attacked() by the opponent - undo and reject if true, otherwise commit and flip turn." },
    ],
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
    generalHint: "Each Expense delegates 'how much does each participant owe' to a SplitStrategy - and simplifying balances into the minimum number of settling transactions is a separate pass over the raw ledger, not something computed per-expense.",
    stepHints: [
      "SplitStrategy interface: computeShares(amount, participants) -> {participant: share}.",
      "EqualSplit, PercentageSplit, ExactAmountSplit each implement that one method.",
      "BalanceSheet accumulates net balances per user pair from a stream of Expenses.",
      "Minimizing settling transactions needs an extra pass: net each user's total owed vs. owing, then greedily match the largest creditor with the largest debtor.",
    ],
    description: `Design a Splitwise-like system: a group of users share expenses, each expense is split among some subset of the group (equally, by percentage, or by exact amount), and the system tracks who owes whom.

**Functional requirements**
- Create an expense paid by one user and split among others (equal / percentage / exact split strategies).
- Compute simplified balances: who owes whom, minimizing the number of settling transactions.

**Constraints and edge cases**
- A percentage split must sum to 100%; an exact split must sum to the total expense amount - both should be validated at creation time.
- Balances must net correctly across many expenses between the same pair of users (A owing B for one expense and B owing A for another should net down to one direction).

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
    referenceExplanation: `## Design rationale

Each **Expense** delegates "how much does each participant owe" to a **SplitStrategy Interface** (Strategy pattern again). **EqualSplit**, **PercentageSplit**, and an ExactAmountSplit all implement the same \`compute_shares(amount, participants)\` method, so Expense's creation logic never branches on split type.

**BalanceSheet** is the aggregate that turns a stream of Expenses into net balances per user pair. The naive approach (a ledger entry per expense-participant pair) works but produces many small pairwise debts; the "minimize settling transactions" requirement needs an additional simplification pass (net each user's total owed vs. owing, then greedily match the largest creditor with the largest debtor) run over BalanceSheet's raw data.

## Trade-offs

Keeping SplitStrategy separate from Expense also makes the system easy to extend (e.g. adding a "split by shares/weights" strategy) without touching Expense, Group, or BalanceSheet at all, the same open/closed benefit seen in the payment-processor Strategy problem.

The greedy creditor/debtor matching algorithm minimizes transaction *count* but not necessarily amounts moved - worth stating that trade-off explicitly if asked to optimize further.

## Common mistakes

- Validating percentage/exact splits sum correctly *after* creating the Expense instead of before, allowing an invalid expense into the ledger.
- Computing simplified balances per-expense instead of accumulating raw balances first and simplifying once, at read time.

## Edge cases

- Removing a member from a group with outstanding balances - what happens to their share of past expenses?`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: SplitwiseExpenseSharingHarness },
    solutionCode: `from abc import ABC, abstractmethod
from dataclasses import dataclass, field


class SplitStrategy(ABC):
    @abstractmethod
    def compute_shares(self, amount: float, participants: list[str]) -> dict[str, float]: ...


class EqualSplit(SplitStrategy):
    def compute_shares(self, amount: float, participants: list[str]) -> dict[str, float]:
        share = round(amount / len(participants), 2)
        return {p: share for p in participants}


class PercentageSplit(SplitStrategy):
    def __init__(self, percentages: dict[str, float]):
        if abs(sum(percentages.values()) - 100.0) > 0.01:
            raise ValueError("Percentages must sum to 100")
        self.percentages = percentages

    def compute_shares(self, amount: float, participants: list[str]) -> dict[str, float]:
        return {p: round(amount * self.percentages[p] / 100, 2) for p in participants}


class ExactAmountSplit(SplitStrategy):
    def __init__(self, amounts: dict[str, float]):
        self.amounts = amounts

    def compute_shares(self, amount: float, participants: list[str]) -> dict[str, float]:
        if abs(sum(self.amounts.values()) - amount) > 0.01:
            raise ValueError("Exact amounts must sum to the expense total")
        return dict(self.amounts)


@dataclass
class Expense:
    paid_by: str
    amount: float
    participants: list[str]
    strategy: SplitStrategy


class BalanceSheet:
    def __init__(self):
        self._net: dict[tuple[str, str], float] = {}  # (debtor, creditor) -> amount

    def apply(self, expense: Expense) -> None:
        shares = expense.strategy.compute_shares(expense.amount, expense.participants)
        for participant, share in shares.items():
            if participant == expense.paid_by:
                continue
            self._adjust(participant, expense.paid_by, share)

    def _adjust(self, debtor: str, creditor: str, amount: float) -> None:
        # Net against any existing balance in the opposite direction first.
        opposite = self._net.get((creditor, debtor), 0.0)
        if opposite >= amount:
            self._net[(creditor, debtor)] = round(opposite - amount, 2)
        else:
            self._net.pop((creditor, debtor), None)
            self._net[(debtor, creditor)] = round(self._net.get((debtor, creditor), 0.0) + (amount - opposite), 2)

    def simplified_balances(self) -> list[tuple[str, str, float]]:
        totals: dict[str, float] = {}
        for (debtor, creditor), amount in self._net.items():
            totals[debtor] = totals.get(debtor, 0.0) - amount
            totals[creditor] = totals.get(creditor, 0.0) + amount

        creditors = sorted([(u, b) for u, b in totals.items() if b > 0.01], key=lambda x: -x[1])
        debtors = sorted([(u, -b) for u, b in totals.items() if b < -0.01], key=lambda x: -x[1])

        result = []
        i = j = 0
        while i < len(debtors) and j < len(creditors):
            debtor, owe = debtors[i]
            creditor, owed = creditors[j]
            settle = min(owe, owed)
            result.append((debtor, creditor, round(settle, 2)))
            debtors[i] = (debtor, owe - settle)
            creditors[j] = (creditor, owed - settle)
            if debtors[i][1] <= 0.01:
                i += 1
            if creditors[j][1] <= 0.01:
                j += 1
        return result
`,
    solutionSteps: [
      { title: "1. SplitStrategy computes shares only", body: "compute_shares(amount, participants) -> {participant: share}; validation of percentages/exact amounts happens at strategy construction time." },
      { title: "2. Expense holds a strategy, not split logic", body: "Creating an Expense never branches on split type - it just calls strategy.compute_shares() when applied to the ledger." },
      { title: "3. BalanceSheet nets pairwise debts as they're applied", body: "_adjust() collapses opposing-direction debts between the same two users immediately, rather than storing them separately." },
      { title: "4. simplified_balances() is a separate pass", body: "Reduce all pairwise balances to one net total per user, then greedily match the largest creditor against the largest debtor to minimize the number of settling transactions." },
    ],
  },
  {
    slug: "lru-cache-design",
    categorySlug: "lld-oo-modeling",
    track: "LLD",
    title: "LRU Cache",
    difficulty: "MEDIUM",
    tags: ["oo-design", "data-structures"],
    estMinutes: 25,
    order: 3,
    inStudyPlanSubset: true,
    generalHint: "Both get() and put() must run in O(1) - that rules out a plain list scan for recency and points at combining a hash map with a doubly linked list.",
    stepHints: [
      "A HashMap gives O(1) key lookup; a DoublyLinkedList gives O(1) move-to-front and O(1) removal from anywhere given a node reference.",
      "The map stores key -> node (not key -> value directly), so a hit can relocate the node in the list without a search.",
      "On get(), move the accessed node to the front (most-recently-used end).",
      "On put() at capacity, evict the node at the back (least-recently-used end) before inserting the new one.",
    ],
    description: `Design an LRU (least-recently-used) cache: a fixed-capacity key-value store that evicts the least-recently-used entry when full, with O(1) get and put.

**Functional requirements**
- \`get(key)\` returns the value and marks the key as most-recently-used, or indicates a miss.
- \`put(key, value)\` inserts/updates a key, evicting the least-recently-used entry if the cache is at capacity.

**Constraints and edge cases**
- Both operations must run in O(1) time.
- Updating an existing key's value should also mark it as most-recently-used.

Draw the class model: the data structures combined to achieve O(1) access with recency tracking.`,
    rubric: {
      requiredComponents: ["LRUCache", "HashMap (key -> node)", "DoublyLinkedList", "Node"],
      requiredConnections: [
        { from: "LRUCache", to: "HashMap (key -> node)", label: "O(1) lookup" },
        { from: "LRUCache", to: "DoublyLinkedList", label: "tracks recency order" },
        { from: "HashMap (key -> node)", to: "Node", label: "points into" },
        { from: "DoublyLinkedList", to: "Node", label: "ordered by recency" },
      ],
    },
    referenceExplanation: `## Design rationale

Neither structure alone is enough: a **HashMap** gives O(1) lookup by key but no ordering; a plain list gives ordering but O(n) lookup. Combining them, a **HashMap (key -> node)** pointing directly into nodes of a **DoublyLinkedList**, gives O(1) for both: the map finds the node instantly, and a doubly linked list lets that node be unlinked and relinked at the front in O(1) without shifting anything (which an array-based list would require).

On \`get(key)\`, the map finds the **Node** in O(1); the LRUCache then unlinks it from its current position and relinks it at the front of the list (most-recently-used end), also O(1) since a doubly linked list tracks both neighbors.

## Trade-offs

Using a doubly (not singly) linked list is what makes removal O(1): removing a node from a singly linked list requires knowing its predecessor, which means an O(n) scan unless you separately track it.

## Common mistakes

- Using an array or singly linked list for the ordering structure - breaks the O(1) removal/reinsertion guarantee.
- Forgetting that \`put()\` on an already-present key must also move it to most-recently-used, not just update its value in place.
- Off-by-one in eviction: evicting *before* checking whether the key already exists (which shouldn't count against capacity) versus *after* inserting a genuinely new key.

## Edge cases

- Capacity of zero or one - special-case worth mentioning even if not implemented.
- Thread safety if accessed concurrently (out of scope here, but worth a one-line callout, tying back to the Concurrency Patterns topic).`,
    solutionCodeLanguage: "python",
    executionSpec: { language: "python", harness: LruCacheDesignHarness },
    solutionCode: `class Node:
    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.prev: "Node | None" = None
        self.next: "Node | None" = None


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self._map: dict[object, Node] = {}
        # Sentinel head/tail simplify edge cases (empty list, single node).
        self.head = Node(None, None)
        self.tail = Node(None, None)
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node: Node) -> None:
        node.prev.next = node.next
        node.next.prev = node.prev

    def _insert_front(self, node: Node) -> None:
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self._map:
            return None
        node = self._map[key]
        self._remove(node)
        self._insert_front(node)
        return node.value

    def put(self, key, value) -> None:
        if key in self._map:
            self._remove(self._map[key])

        node = Node(key, value)
        self._map[key] = node
        self._insert_front(node)

        if len(self._map) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self._map[lru.key]
`,
    solutionSteps: [
      { title: "1. Sentinel head/tail nodes", body: "A doubly linked list with dummy head and tail nodes avoids null-checking edge cases when the list is empty or has one element." },
      { title: "2. Map stores key -> Node, not key -> value", body: "This is what lets get() relocate a node in O(1) without a list search." },
      { title: "3. get() moves the node to front", body: "Remove from its current position, reinsert right after head - both O(1) given a direct node reference." },
      { title: "4. put() removes-then-reinserts on update, evicts on overflow", body: "If the key exists, remove its old node first; always insert the new/updated node at front; if now over capacity, remove and delete the node just before tail." },
    ],
  },
];

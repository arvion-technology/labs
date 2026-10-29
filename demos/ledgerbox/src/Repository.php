<?php

declare(strict_types=1);

namespace Ledgerbox;

use DateTimeImmutable;
use InvalidArgumentException;
use PDO;

/**
 * All persistence lives here, and every money value that crosses this boundary
 * is an integer minor unit. The repository is the only class that knows SQL; the
 * rest of the app works with Invoice, Payment and plain arrays.
 */
final class Repository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /* ------------------------------------------------------------ customers */

    /** @return list<array<string, mixed>> */
    public function customers(): array
    {
        $rows = $this->pdo->query('SELECT * FROM customers ORDER BY name COLLATE NOCASE')->fetchAll();
        $invoices = $this->allInvoices();
        $open = [];
        $count = [];
        foreach ($invoices as $invoice) {
            $open[$invoice->customerId] = ($open[$invoice->customerId] ?? 0) + $invoice->balanceMinor();
            $count[$invoice->customerId] = ($count[$invoice->customerId] ?? 0) + 1;
        }
        foreach ($rows as &$row) {
            $id = (int) $row['id'];
            $row['id'] = $id;
            $row['open_balance_minor'] = $open[$id] ?? 0;
            $row['invoice_count'] = $count[$id] ?? 0;
        }

        return $rows;
    }

    /** @return array<string, mixed>|null */
    public function customer(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM customers WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    public function createCustomer(string $name, string $email, string $city): int
    {
        $name = trim($name);
        if ($name === '') {
            throw new InvalidArgumentException('A customer needs a name');
        }
        $email = trim($email);
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException('That email address does not look valid');
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO customers (name, email, city, currency, created_at) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$name, $email, trim($city), 'NPR', (new DateTimeImmutable('today'))->format('Y-m-d')]);

        return (int) $this->pdo->lastInsertId();
    }

    /* ------------------------------------------------------------- invoices */

    /** @return list<Invoice> */
    public function allInvoices(): array
    {
        $rows = $this->pdo->query(
            'SELECT i.*, c.name AS customer_name
             FROM invoices i JOIN customers c ON c.id = i.customer_id
             ORDER BY i.issue_date DESC, i.id DESC'
        )->fetchAll();

        return $this->hydrate($rows);
    }

    /** @return list<Invoice> */
    public function invoicesForCustomer(int $customerId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT i.*, c.name AS customer_name
             FROM invoices i JOIN customers c ON c.id = i.customer_id
             WHERE i.customer_id = ? ORDER BY i.issue_date DESC, i.id DESC'
        );
        $stmt->execute([$customerId]);

        return $this->hydrate($stmt->fetchAll());
    }

    public function invoice(int $id): ?Invoice
    {
        $stmt = $this->pdo->prepare(
            'SELECT i.*, c.name AS customer_name
             FROM invoices i JOIN customers c ON c.id = i.customer_id WHERE i.id = ?'
        );
        $stmt->execute([$id]);
        $rows = $stmt->fetchAll();

        return $this->hydrate($rows)[0] ?? null;
    }

    public function invoiceByNumber(string $number): ?Invoice
    {
        $stmt = $this->pdo->prepare(
            'SELECT i.*, c.name AS customer_name
             FROM invoices i JOIN customers c ON c.id = i.customer_id WHERE i.number = ?'
        );
        $stmt->execute([$number]);
        $rows = $stmt->fetchAll();

        return $this->hydrate($rows)[0] ?? null;
    }

    /**
     * @param list<array{description: string, quantity: int, unitPriceMinor: int}> $items
     */
    public function createInvoice(
        int $customerId,
        string $issueDate,
        string $dueDate,
        int $taxRateBp,
        array $items,
        ?string $notes = null,
    ): int {
        $customer = $this->customer($customerId);
        if ($customer === null) {
            throw new InvalidArgumentException('Unknown customer');
        }
        $issue = $this->requireDate($issueDate, 'Issue date');
        $due = $this->requireDate($dueDate, 'Due date');
        if ($due < $issue) {
            throw new InvalidArgumentException('The due date cannot be before the issue date');
        }
        if ($taxRateBp < 0 || $taxRateBp > 10000) {
            throw new InvalidArgumentException('Tax rate must be between 0 and 100 percent');
        }
        if ($items === []) {
            throw new InvalidArgumentException('An invoice needs at least one line item');
        }
        foreach ($items as $item) {
            if (trim((string) ($item['description'] ?? '')) === '') {
                throw new InvalidArgumentException('Every line item needs a description');
            }
            if ((int) ($item['quantity'] ?? 0) <= 0) {
                throw new InvalidArgumentException('Line item quantity must be positive');
            }
            if ((int) ($item['unitPriceMinor'] ?? -1) < 0) {
                throw new InvalidArgumentException('Line item price cannot be negative');
            }
        }

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO invoices (customer_id, number, issue_date, due_date, currency, tax_rate_bp, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $customerId,
                $this->nextInvoiceNumber(),
                $issue->format('Y-m-d'),
                $due->format('Y-m-d'),
                (string) $customer['currency'],
                $taxRateBp,
                $notes,
            ]);
            $invoiceId = (int) $this->pdo->lastInsertId();

            $itemStmt = $this->pdo->prepare(
                'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_minor, position)
                 VALUES (?, ?, ?, ?, ?)'
            );
            foreach (array_values($items) as $position => $item) {
                $itemStmt->execute([
                    $invoiceId,
                    trim((string) $item['description']),
                    (int) $item['quantity'],
                    (int) $item['unitPriceMinor'],
                    $position,
                ]);
            }

            $this->pdo->commit();
            return $invoiceId;
        } catch (\Throwable $error) {
            $this->pdo->rollBack();
            throw $error;
        }
    }

    public function nextInvoiceNumber(): string
    {
        $last = $this->pdo->query('SELECT number FROM invoices ORDER BY id DESC LIMIT 1')->fetchColumn();
        if (is_string($last) && preg_match('/^LB-(\d+)$/', $last, $matches) === 1) {
            return 'LB-' . str_pad((string) ((int) $matches[1] + 1), 4, '0', STR_PAD_LEFT);
        }

        return 'LB-1001';
    }

    /* ------------------------------------------------------------- payments */

    /** @return list<Payment> */
    public function payments(): array
    {
        $rows = $this->pdo->query(
            'SELECT p.*, c.name AS customer_name FROM payments p
             JOIN customers c ON c.id = p.customer_id
             ORDER BY p.paid_on DESC, p.id DESC'
        )->fetchAll();

        return $this->hydratePayments($rows);
    }

    /** @return list<Payment> */
    public function paymentsForCustomer(int $customerId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT p.*, c.name AS customer_name FROM payments p
             JOIN customers c ON c.id = p.customer_id
             WHERE p.customer_id = ? ORDER BY p.paid_on DESC, p.id DESC'
        );
        $stmt->execute([$customerId]);

        return $this->hydratePayments($stmt->fetchAll());
    }

    /** @return list<array<string, mixed>> */
    public function paymentsForInvoice(int $invoiceId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT p.*, pa.amount_minor AS allocated_minor, c.name AS customer_name
             FROM payments p
             JOIN payment_allocations pa ON pa.payment_id = p.id
             JOIN customers c ON c.id = p.customer_id
             WHERE pa.invoice_id = ?
             ORDER BY p.paid_on DESC, p.id DESC'
        );
        $stmt->execute([$invoiceId]);

        return $stmt->fetchAll();
    }

    /**
     * Record a customer payment. Without explicit allocations the amount is
     * spread across the customer's open invoices oldest first. A payment that
     * cannot be fully allocated is rejected: unapplied cash on the ledger is a
     * reconciliation problem, not a feature.
     *
     * @param list<array{invoiceId: int, amountMinor: int}>|null $allocations
     */
    public function recordPayment(
        int $customerId,
        int $amountMinor,
        string $paidOn,
        string $method = 'bank',
        ?string $reference = null,
        ?array $allocations = null,
        ?int $payFirstInvoiceId = null,
    ): int {
        if ($customerId <= 0 || $this->customer($customerId) === null) {
            throw new InvalidArgumentException('Unknown customer');
        }
        if ($amountMinor <= 0) {
            throw new InvalidArgumentException('A payment must be greater than zero');
        }
        $paid = $this->requireDate($paidOn, 'Payment date');
        $method = trim($method) === '' ? 'bank' : trim($method);
        $reference = $reference === null ? null : (trim($reference) ?: null);

        $open = array_values(array_filter(
            $this->invoicesForCustomer($customerId),
            static fn (Invoice $invoice): bool => $invoice->balanceMinor() > 0,
        ));
        $balances = [];
        foreach ($open as $invoice) {
            $balances[$invoice->id] = $invoice->balanceMinor();
        }

        if ($allocations === null) {
            $plan = Payment::planAllocation(array_map(
                static fn (Invoice $invoice): array => [
                    'id' => $invoice->id,
                    'dueDate' => $invoice->dueDate,
                    'balanceMinor' => $invoice->balanceMinor(),
                ],
                $open,
            ), $amountMinor, $payFirstInvoiceId);
            if ($plan['leftoverMinor'] > 0) {
                throw new InvalidArgumentException(
                    'Payment is larger than the outstanding balance by ' . Money::format($plan['leftoverMinor'])
                );
            }
            $allocations = $plan['allocations'];
        } else {
            if ($allocations === []) {
                throw new InvalidArgumentException('A payment needs at least one allocation');
            }
            $total = 0;
            foreach ($allocations as $allocation) {
                $invoiceId = (int) ($allocation['invoiceId'] ?? 0);
                $amount = (int) ($allocation['amountMinor'] ?? 0);
                if (!isset($balances[$invoiceId])) {
                    throw new InvalidArgumentException('An allocation points at an invoice that is not open for this customer');
                }
                if ($amount <= 0 || $amount > $balances[$invoiceId]) {
                    throw new InvalidArgumentException('An allocation is larger than the invoice balance');
                }
                $total += $amount;
            }
            if ($total !== $amountMinor) {
                throw new InvalidArgumentException('Allocations must add up to the payment amount');
            }
        }

        $this->pdo->beginTransaction();
        try {
            $paymentStmt = $this->pdo->prepare(
                'INSERT INTO payments (customer_id, amount_minor, paid_on, method, reference) VALUES (?, ?, ?, ?, ?)'
            );
            $paymentStmt->execute([$customerId, $amountMinor, $paid->format('Y-m-d'), $method, $reference]);
            $paymentId = (int) $this->pdo->lastInsertId();

            $allocationStmt = $this->pdo->prepare(
                'INSERT INTO payment_allocations (payment_id, invoice_id, amount_minor) VALUES (?, ?, ?)'
            );
            foreach ($allocations as $allocation) {
                $allocationStmt->execute([$paymentId, (int) $allocation['invoiceId'], (int) $allocation['amountMinor']]);
            }

            $this->pdo->commit();
            return $paymentId;
        } catch (\Throwable $error) {
            $this->pdo->rollBack();
            throw $error;
        }
    }

    /* ------------------------------------------------------------ reporting */

    /** @return array<string, mixed> */
    public function dashboardStats(DateTimeImmutable $today): array
    {
        $invoices = $this->allInvoices();
        $outstanding = 0;
        $overdue = 0;
        $openCount = 0;
        $overdueCount = 0;
        foreach ($invoices as $invoice) {
            $balance = $invoice->balanceMinor();
            if ($balance <= 0) {
                continue;
            }
            $openCount++;
            $outstanding += $balance;
            if ($invoice->daysOverdue($today) > 0) {
                $overdue += $balance;
                $overdueCount++;
            }
        }

        $monthStart = $today->modify('first day of this month')->format('Y-m-d');
        $monthEnd = $today->format('Y-m-d');
        $collected = 0;
        foreach ($this->payments() as $payment) {
            if ($payment->paidOn >= $monthStart && $payment->paidOn <= $monthEnd) {
                $collected += $payment->amountMinor;
            }
        }

        return [
            'outstanding_minor' => $outstanding,
            'overdue_minor' => $overdue,
            'collected_this_month_minor' => $collected,
            'open_invoices' => $openCount,
            'overdue_invoices' => $overdueCount,
            'customers' => (int) $this->pdo->query('SELECT COUNT(*) FROM customers')->fetchColumn(),
            'payments' => (int) $this->pdo->query('SELECT COUNT(*) FROM payments')->fetchColumn(),
            'aging' => Aging::summary($invoices, $today),
        ];
    }

    /** @return array<string, mixed> */
    public function agingReport(DateTimeImmutable $today): array
    {
        return Aging::report($this->allInvoices(), $today);
    }

    public function invoiceCsv(DateTimeImmutable $today): string
    {
        $rows = [];
        foreach ($this->allInvoices() as $invoice) {
            $rows[] = [
                $invoice->number,
                $invoice->customerName,
                $invoice->issueDate,
                $invoice->dueDate,
                $invoice->status($today),
                Money::toDecimal($invoice->subtotalMinor()),
                Money::toDecimal($invoice->taxMinor()),
                Money::toDecimal($invoice->totalMinor()),
                Money::toDecimal($invoice->paidMinor),
                Money::toDecimal($invoice->balanceMinor()),
                $invoice->currency,
            ];
        }

        return Csv::render(
            ['invoice', 'customer', 'issued', 'due', 'status', 'subtotal', 'tax', 'total', 'paid', 'balance', 'currency'],
            $rows,
        );
    }

    public function paymentCsv(): string
    {
        $rows = [];
        foreach ($this->payments() as $payment) {
            $numbers = array_map(static fn (array $row): string => (string) ($row['number'] ?? ''), $payment->allocations);
            $rows[] = [
                $payment->id,
                $payment->paidOn,
                $payment->customerId,
                $payment->method,
                $payment->reference ?? '',
                Money::toDecimal($payment->amountMinor),
                implode(' | ', $numbers),
            ];
        }

        return Csv::render(['payment', 'paid_on', 'customer_id', 'method', 'reference', 'amount', 'invoices'], $rows);
    }

    /* -------------------------------------------------------------- helpers */

    /**
     * @param list<array<string, mixed>> $rows
     * @return list<Invoice>
     */
    private function hydrate(array $rows): array
    {
        if ($rows === []) {
            return [];
        }
        $ids = array_map(static fn (array $row): int => (int) $row['id'], $rows);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $itemStmt = $this->pdo->prepare(
            "SELECT invoice_id, description, quantity, unit_price_minor
             FROM invoice_items WHERE invoice_id IN ({$placeholders})
             ORDER BY invoice_id, position, id"
        );
        $itemStmt->execute($ids);
        $items = [];
        foreach ($itemStmt->fetchAll() as $item) {
            $items[(int) $item['invoice_id']][] = [
                'description' => (string) $item['description'],
                'quantity' => (int) $item['quantity'],
                'unitPriceMinor' => (int) $item['unit_price_minor'],
            ];
        }

        $paidStmt = $this->pdo->prepare(
            "SELECT invoice_id, SUM(amount_minor) AS paid FROM payment_allocations
             WHERE invoice_id IN ({$placeholders}) GROUP BY invoice_id"
        );
        $paidStmt->execute($ids);
        $paid = [];
        foreach ($paidStmt->fetchAll() as $row) {
            $paid[(int) $row['invoice_id']] = (int) $row['paid'];
        }

        return array_map(
            static fn (array $row): Invoice => Invoice::fromRow(
                $row,
                $items[(int) $row['id']] ?? [],
                $paid[(int) $row['id']] ?? 0,
            ),
            $rows,
        );
    }

    /**
     * @param list<array<string, mixed>> $rows
     * @return list<Payment>
     */
    private function hydratePayments(array $rows): array
    {
        if ($rows === []) {
            return [];
        }
        $ids = array_map(static fn (array $row): int => (int) $row['id'], $rows);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->pdo->prepare(
            "SELECT pa.payment_id, pa.invoice_id, pa.amount_minor, i.number
             FROM payment_allocations pa JOIN invoices i ON i.id = pa.invoice_id
             WHERE pa.payment_id IN ({$placeholders})
             ORDER BY pa.payment_id, pa.id"
        );
        $stmt->execute($ids);
        $allocations = [];
        foreach ($stmt->fetchAll() as $row) {
            $allocations[(int) $row['payment_id']][] = [
                'invoiceId' => (int) $row['invoice_id'],
                'amountMinor' => (int) $row['amount_minor'],
                'number' => (string) $row['number'],
            ];
        }

        return array_map(
            static fn (array $row): Payment => Payment::fromRow($row, $allocations[(int) $row['id']] ?? []),
            $rows,
        );
    }

    private function requireDate(string $value, string $label): DateTimeImmutable
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            throw new InvalidArgumentException("{$label} must be a date in YYYY-MM-DD form");
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if ($date === false || $date->format('Y-m-d') !== $value) {
            throw new InvalidArgumentException("{$label} is not a valid calendar date");
        }

        return $date;
    }
}

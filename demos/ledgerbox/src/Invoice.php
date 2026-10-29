<?php

declare(strict_types=1);

namespace Ledgerbox;

use DateTimeImmutable;

/**
 * An invoice with its line items and how much has been allocated to it.
 *
 * Totals are computed, never stored. A stored total can drift from its lines
 * after an edit; computing it from integer line totals means the number in the
 * database and the number on screen cannot disagree.
 */
final class Invoice
{
    /**
     * @param list<array{description: string, quantity: int, unitPriceMinor: int}> $items
     */
    public function __construct(
        public readonly int $id,
        public readonly int $customerId,
        public readonly string $number,
        public readonly string $customerName,
        public readonly string $issueDate,
        public readonly string $dueDate,
        public readonly string $currency,
        public readonly int $taxRateBp,
        public readonly array $items,
        public readonly int $paidMinor,
        public readonly ?string $notes = null,
    ) {
    }

    /**
     * @param array<string, mixed> $row
     * @param list<array{description: string, quantity: int, unitPriceMinor: int}> $items
     */
    public static function fromRow(array $row, array $items, int $paidMinor): self
    {
        return new self(
            id: (int) $row['id'],
            customerId: (int) $row['customer_id'],
            number: (string) $row['number'],
            customerName: (string) ($row['customer_name'] ?? ''),
            issueDate: (string) $row['issue_date'],
            dueDate: (string) $row['due_date'],
            currency: (string) $row['currency'],
            taxRateBp: (int) $row['tax_rate_bp'],
            items: $items,
            paidMinor: $paidMinor,
            notes: isset($row['notes']) ? (string) $row['notes'] : null,
        );
    }

    public function subtotalMinor(): int
    {
        $total = 0;
        foreach ($this->items as $item) {
            $total += $item['quantity'] * $item['unitPriceMinor'];
        }

        return $total;
    }

    public function taxMinor(): int
    {
        return Money::tax($this->subtotalMinor(), $this->taxRateBp);
    }

    public function totalMinor(): int
    {
        return $this->subtotalMinor() + $this->taxMinor();
    }

    public function balanceMinor(): int
    {
        return max(0, $this->totalMinor() - $this->paidMinor);
    }

    public function isPaid(): bool
    {
        return $this->balanceMinor() === 0;
    }

    /** Whole days past the due date; zero while the invoice is not overdue. */
    public function daysOverdue(DateTimeImmutable $today): int
    {
        $due = parse_date($this->dueDate);
        if ($due >= $today) {
            return 0;
        }

        return (int) $due->diff($today)->days;
    }

    /**
     * Status is derived, never stored. Overdue wins over part paid because a
     * part payment on a late invoice is still a collection problem.
     */
    public function status(DateTimeImmutable $today): string
    {
        if ($this->items === []) {
            return 'open';
        }
        if ($this->isPaid()) {
            return 'paid';
        }
        if ($this->daysOverdue($today) > 0) {
            return 'overdue';
        }
        if ($this->paidMinor > 0) {
            return 'partial';
        }

        return 'open';
    }

    /** @return array<string, mixed> */
    public function toArray(DateTimeImmutable $today): array
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customerId,
            'number' => $this->number,
            'customer_name' => $this->customerName,
            'issue_date' => $this->issueDate,
            'due_date' => $this->dueDate,
            'currency' => $this->currency,
            'tax_rate_bp' => $this->taxRateBp,
            'items' => $this->items,
            'subtotal_minor' => $this->subtotalMinor(),
            'tax_minor' => $this->taxMinor(),
            'total_minor' => $this->totalMinor(),
            'paid_minor' => $this->paidMinor,
            'balance_minor' => $this->balanceMinor(),
            'status' => $this->status($today),
            'days_overdue' => $this->daysOverdue($today),
        ];
    }
}

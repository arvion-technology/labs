<?php

declare(strict_types=1);

namespace Ledgerbox;

use InvalidArgumentException;

/**
 * A customer payment and the invoice allocations it was split into.
 *
 * The app records payments against a customer, not an invoice, because that is
 * how bank transfers arrive: one amount, several open invoices. Allocation is
 * oldest invoice first and is planned before anything is written, so the caller
 * can reject a payment that cannot be fully applied instead of leaving cash
 * unapplied on the ledger.
 */
final class Payment
{
    /**
     * @param list<array{invoiceId: int, amountMinor: int}> $allocations
     */
    public function __construct(
        public readonly int $id,
        public readonly int $customerId,
        public readonly int $amountMinor,
        public readonly string $paidOn,
        public readonly string $method,
        public readonly ?string $reference,
        public readonly array $allocations,
    ) {
    }

    /**
     * @param array<string, mixed> $row
     * @param list<array{invoiceId: int, amountMinor: int}> $allocations
     */
    public static function fromRow(array $row, array $allocations): self
    {
        return new self(
            id: (int) $row['id'],
            customerId: (int) $row['customer_id'],
            amountMinor: (int) $row['amount_minor'],
            paidOn: (string) $row['paid_on'],
            method: (string) $row['method'],
            reference: isset($row['reference']) && $row['reference'] !== '' ? (string) $row['reference'] : null,
            allocations: $allocations,
        );
    }

    /**
     * Split a payment across open invoices. When the cashier is looking at a
     * specific invoice, that invoice is paid first; the remainder goes to the
     * customer's other open invoices, oldest due date first.
     *
     * @param list<array{id: int, dueDate: string, balanceMinor: int}> $openInvoices
     * @return array{allocations: list<array{invoiceId: int, amountMinor: int}>, leftoverMinor: int}
     */
    public static function planAllocation(array $openInvoices, int $amountMinor, ?int $payFirstInvoiceId = null): array
    {
        if ($amountMinor <= 0) {
            throw new InvalidArgumentException('A payment must be greater than zero');
        }

        $ordered = $openInvoices;
        usort($ordered, static function (array $left, array $right): int {
            return [$left['dueDate'], $left['id']] <=> [$right['dueDate'], $right['id']];
        });

        if ($payFirstInvoiceId !== null) {
            foreach ($ordered as $index => $candidate) {
                if ((int) $candidate['id'] !== $payFirstInvoiceId || (int) $candidate['balanceMinor'] <= 0) {
                    continue;
                }
                $first = $candidate;
                array_splice($ordered, $index, 1);
                array_unshift($ordered, $first);
                break;
            }
        }

        $remaining = $amountMinor;
        $allocations = [];
        foreach ($ordered as $invoice) {
            if ($remaining === 0) {
                break;
            }
            $balance = (int) $invoice['balanceMinor'];
            if ($balance <= 0) {
                continue;
            }
            $amount = min($balance, $remaining);
            $allocations[] = ['invoiceId' => (int) $invoice['id'], 'amountMinor' => $amount];
            $remaining -= $amount;
        }

        return ['allocations' => $allocations, 'leftoverMinor' => $remaining];
    }

    public function allocatedMinor(): int
    {
        return array_sum(array_map(static fn (array $row): int => $row['amountMinor'], $this->allocations));
    }
}

<?php

declare(strict_types=1);

namespace Ledgerbox;

use DateTimeImmutable;

/**
 * Accounts-receivable aging.
 *
 * Buckets are decided by days past the due date, not by issue date: an invoice
 * issued 90 days ago but due tomorrow is current. Each bucket owns the lower
 * bound and excludes the upper one, so a 30-day-late invoice lands in 1-30 and a
 * 31-day-late one moves to 31-60 with no gaps and no double counting.
 */
final class Aging
{
    public const BUCKETS = ['current', '1-30', '31-60', '61-90', '90+'];

    public static function label(string $bucket): string
    {
        return match ($bucket) {
            'current' => 'Current',
            '1-30' => '1-30 days',
            '31-60' => '31-60 days',
            '61-90' => '61-90 days',
            default => '90+ days',
        };
    }

    public static function bucket(int $daysOverdue): string
    {
        return match (true) {
            $daysOverdue <= 0 => 'current',
            $daysOverdue <= 30 => '1-30',
            $daysOverdue <= 60 => '31-60',
            $daysOverdue <= 90 => '61-90',
            default => '90+',
        };
    }

    /**
     * @param list<Invoice> $invoices
     * @return array{buckets: list<array{key: string, label: string, amountMinor: int}>, totalMinor: int}
     */
    public static function summary(array $invoices, DateTimeImmutable $asOf): array
    {
        $totals = array_fill_keys(self::BUCKETS, 0);
        foreach ($invoices as $invoice) {
            $balance = $invoice->balanceMinor();
            if ($balance <= 0) {
                continue;
            }
            $bucket = self::bucket($invoice->daysOverdue($asOf));
            $totals[$bucket] += $balance;
        }

        $buckets = [];
        $grand = 0;
        foreach (self::BUCKETS as $key) {
            $buckets[] = ['key' => $key, 'label' => self::label($key), 'amountMinor' => $totals[$key]];
            $grand += $totals[$key];
        }

        return ['buckets' => $buckets, 'totalMinor' => $grand];
    }

    /**
     * Per-customer aging rows, largest exposure first. This is the report a
     * finance team actually chases from: who owes what, and how late.
     *
     * @param list<Invoice> $invoices
     * @return array{customers: list<array<string, mixed>>, totals: array<string, int>, asOf: string}
     */
    public static function report(array $invoices, DateTimeImmutable $asOf): array
    {
        $rows = [];
        foreach ($invoices as $invoice) {
            $balance = $invoice->balanceMinor();
            if ($balance <= 0) {
                continue;
            }
            $key = $invoice->customerId;
            if (!isset($rows[$key])) {
                $rows[$key] = [
                    'customerId' => $key,
                    'customerName' => $invoice->customerName,
                    'buckets' => array_fill_keys(self::BUCKETS, 0),
                    'totalMinor' => 0,
                    'invoiceCount' => 0,
                ];
            }
            $bucket = self::bucket($invoice->daysOverdue($asOf));
            $rows[$key]['buckets'][$bucket] += $balance;
            $rows[$key]['totalMinor'] += $balance;
            $rows[$key]['invoiceCount']++;
        }

        usort($rows, static fn (array $left, array $right): int => $right['totalMinor'] <=> $left['totalMinor']);

        $totals = array_fill_keys(self::BUCKETS, 0);
        $grand = 0;
        foreach ($rows as $row) {
            foreach (self::BUCKETS as $bucket) {
                $totals[$bucket] += $row['buckets'][$bucket];
            }
            $grand += $row['totalMinor'];
        }
        $totals['total'] = $grand;

        return ['customers' => array_values($rows), 'totals' => $totals, 'asOf' => $asOf->format('Y-m-d')];
    }
}

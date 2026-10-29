<?php

declare(strict_types=1);

namespace Ledgerbox;

use InvalidArgumentException;

/**
 * Money in integer minor units.
 *
 * There is no float anywhere in the money path. Parsing a decimal string,
 * applying tax and formatting for a template all work on integers, because
 * 0.1 + 0.2 is not 0.3 and an invoice that is one cent out is an invoice that
 * does not reconcile. The only rounding happens once, in tax().
 */
final class Money
{
    /** Currencies the app can format. The workspace reports in NPR. */
    private const SYMBOLS = [
        'NPR' => 'Rs.',
        'USD' => '$',
        'EUR' => '€',
        'GBP' => '£',
        'INR' => '₹',
    ];

    public static function fromDecimal(string $amount): int
    {
        $clean = str_replace([',', ' '], '', trim($amount));
        if ($clean === '' || preg_match('/^-?\d+(?:\.\d{1,2})?$/', $clean) !== 1) {
            throw new InvalidArgumentException("Not an amount: {$amount}");
        }

        $negative = str_starts_with($clean, '-');
        $unsigned = ltrim($clean, '+-');
        [$whole, $fraction] = array_pad(explode('.', $unsigned, 2), 2, '');
        $minor = ((int) $whole) * 100 + (int) str_pad($fraction, 2, '0');

        return $negative ? -$minor : $minor;
    }

    /** Two-decimal representation without a currency symbol, for CSV export. */
    public static function toDecimal(int $minor): string
    {
        $sign = $minor < 0 ? '-' : '';
        $absolute = abs($minor);

        return $sign . intdiv($absolute, 100) . '.' . str_pad((string) ($absolute % 100), 2, '0', STR_PAD_LEFT);
    }

    public static function format(int $minor, string $currency = 'NPR'): string
    {
        $symbol = self::SYMBOLS[$currency] ?? $currency . ' ';
        $sign = $minor < 0 ? '-' : '';
        $absolute = abs($minor);
        $whole = number_format(intdiv($absolute, 100));
        $cents = str_pad((string) ($absolute % 100), 2, '0', STR_PAD_LEFT);

        return "{$sign}{$symbol} {$whole}.{$cents}";
    }

    /** Tax on a subtotal. Round half up, once, in integer space. */
    public static function tax(int $subtotalMinor, int $rateBasisPoints): int
    {
        if ($subtotalMinor < 0) {
            throw new InvalidArgumentException('Tax subtotal cannot be negative');
        }
        if ($rateBasisPoints < 0 || $rateBasisPoints > 10000) {
            throw new InvalidArgumentException('Tax rate must be between 0 and 100 percent');
        }

        return intdiv($subtotalMinor * $rateBasisPoints + 5000, 10000);
    }

    public static function add(int $left, int $right): int
    {
        return $left + $right;
    }

    public static function subtract(int $left, int $right): int
    {
        return $left - $right;
    }

    public static function max(int $left, int $right): int
    {
        return max($left, $right);
    }
}

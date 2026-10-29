<?php

declare(strict_types=1);

/**
 * Small helpers shared by the web app and the views.
 *
 * The project deliberately avoids a template engine, so these are the only
 * functions available inside views: escaping, money formatting, date labels and
 * the status badge metadata. Keeping them tiny is what makes the templates
 * readable without a framework.
 */

use Ledgerbox\CsrfException;
use Ledgerbox\Money;

/** Escape a value for HTML. Every dynamic value in a view goes through this. */
function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function money(int $minor, string $currency = 'NPR'): string
{
    return Money::format($minor, $currency);
}

function decimal(int $minor): string
{
    return Money::toDecimal($minor);
}

/** Basis points as a percentage string: 1300 becomes "13", 750 becomes "7.5". */
function decimal_rate(int $basisPoints): string
{
    $whole = intdiv($basisPoints, 100);
    $fraction = $basisPoints % 100;
    if ($fraction === 0) {
        return (string) $whole;
    }

    return rtrim($whole . '.' . str_pad((string) $fraction, 2, '0', STR_PAD_LEFT), '0');
}

/** Parse an ISO date from the database. The `!` resets time to midnight. */
function parse_date(string $iso): DateTimeImmutable
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $iso);
    if ($date === false) {
        throw new InvalidArgumentException("Invalid date: {$iso}");
    }

    return $date;
}

function date_label(string $iso): string
{
    return parse_date($iso)->format('j M Y');
}

/** Badge copy and tone for an invoice status. */
function status_meta(string $status): array
{
    return match ($status) {
        'paid' => ['label' => 'Paid', 'tone' => 'green'],
        'partial' => ['label' => 'Part paid', 'tone' => 'blue'],
        'overdue' => ['label' => 'Overdue', 'tone' => 'red'],
        default => ['label' => 'Open', 'tone' => 'gold'],
    };
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }

    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="_token" value="' . e(csrf_token()) . '">';
}

function verify_csrf(): void
{
    $sent = $_POST['_token'] ?? '';
    if (!is_string($sent) || !hash_equals($_SESSION['csrf'] ?? '', $sent)) {
        throw new CsrfException('The form expired. Reload the page and try again.');
    }
}

function redirect(string $path): never
{
    header('Location: ' . $path, true, 303);
    exit;
}

function flash(string $type, string $message): void
{
    $_SESSION['flash'][] = ['type' => $type, 'message' => $message];
}

function take_flashes(): array
{
    $flashes = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);

    return $flashes;
}

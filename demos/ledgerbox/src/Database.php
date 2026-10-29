<?php

declare(strict_types=1);

namespace Ledgerbox;

use DateTimeImmutable;
use PDO;
use RuntimeException;

/**
 * Database bootstrap: connection, schema and demo seed.
 *
 * Migrations are one SQL file applied with IF NOT EXISTS, which is enough for a
 * single-file SQLite app. The seed is written in PHP rather than SQL so invoice
 * dates can be relative to today; a finance demo whose aging buckets are empty
 * because the seed is a year old is not a demo.
 */
final class Database
{
    public static function connect(string $dsn): PDO
    {
        $pdo = new PDO($dsn, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA busy_timeout = 5000');

        return $pdo;
    }

    public static function defaultPath(): string
    {
        return dirname(__DIR__) . '/var/ledgerbox.sqlite';
    }

    public static function connectFile(?string $path = null): PDO
    {
        $path = $path ?? self::defaultPath();
        if (!is_dir(dirname($path))) {
            mkdir(dirname($path), 0775, true);
        }

        return self::connect('sqlite:' . $path);
    }

    public static function migrate(PDO $pdo): void
    {
        $schema = file_get_contents(dirname(__DIR__) . '/migrations/001_schema.sql');
        if ($schema === false) {
            throw new RuntimeException('Could not read the schema migration');
        }
        $pdo->exec($schema);
    }

    /** Connect, migrate and seed on first run. Safe to call on every request. */
    public static function bootstrap(?string $path = null): PDO
    {
        $pdo = self::connectFile($path);
        self::migrate($pdo);
        $count = (int) $pdo->query('SELECT COUNT(*) FROM customers')->fetchColumn();
        if ($count === 0) {
            self::seed($pdo);
        }

        return $pdo;
    }

    public static function seed(PDO $pdo, ?DateTimeImmutable $today = null): void
    {
        $today ??= new DateTimeImmutable('today');
        $date = static fn (int $offset): string => $today->modify(($offset >= 0 ? '+' : '') . $offset . ' days')->format('Y-m-d');

        $customers = [
            ['Himalaya Coffee Roasters', 'accounts@himalayacoffee.test', 'Kathmandu'],
            ['Patan Craft Collective', 'finance@patancraft.test', 'Lalitpur'],
            ['Northline Studio', 'hello@northline.test', 'Pokhara'],
            ['Koshi Logistics', 'billing@koshilogistics.test', 'Biratnagar'],
            ['Bagmati Analytics', 'accounts@bagmatianalytics.test', 'Kathmandu'],
            ['Everest Provisions', 'ap@everestprovisions.test', 'Bhaktapur'],
        ];

        // [customer index, issue offset, due offset, tax bp, items, paid minor]
        $invoices = [
            [0, -10, 20, 1300, [['Coffee beans, 1 kg', 12, 8500], ['Packaging', 1, 4500]], 0],
            [1, -20, 5, 1300, [['Handicraft order', 8, 15000], ['Shipping', 1, 2500]], 50000],
            [2, -45, -15, 1300, [['Design retainer', 1, 180000]], 0],
            [3, -60, -30, 1300, [['Freight handling', 1, 200000], ['Warehouse', 1, 90000]], 100000],
            [4, -75, -45, 1300, [['Analytics workshop', 1, 240000]], 0],
            [5, -95, -65, 0, [['Export consultancy', 1, 90000]], 0],
            [0, -110, -80, 1300, [['Coffee beans, 1 kg', 20, 5000], ['Roasting service', 1, 55000]], 50000],
            [1, -130, -100, 1300, [['Craft fair production', 1, 300000]], 0],
            [2, -150, -120, 1300, [['Brand system', 1, 150000], ['Photography', 1, 60000]], 0],
            [3, -5, 25, 1300, [['Route planning', 1, 60000], ['Driver hours', 1, 36000]], 0],
            [4, -35, -3, 1300, [['Dashboard build', 1, 120000]], 0],
            [5, -70, -40, 0, [['Kitchen supplies', 1, 150000]], 0],
            [2, -100, -70, 1300, [['Campaign design', 1, 180000]], 0],
            [0, -40, -10, 1300, [['Wholesale order', 1, 120000], ['Delivery', 1, 90000], ['Packaging', 1, 60000]], 0],
        ];

        // [customer index, amount minor, paid-on offset, method, reference, [[invoice index, amount minor]]]
        $payments = [
            [1, 50000, -8, 'bank', 'TRX-1041', [[1, 50000]]],
            [3, 100000, -25, 'bank', 'TRX-1038', [[3, 100000]]],
            [5, 90000, -60, 'cash', 'RCPT-77', [[5, 90000]]],
            [0, 50000, -85, 'bank', 'TRX-1002', [[6, 50000]]],
            [2, 237300, -100, 'bank', 'TRX-0991', [[8, 237300]]],
            [2, 203400, -60, 'bank', 'TRX-1020', [[12, 203400]]],
            [4, 300000, -20, 'bank', 'TRX-1050', [[4, 271200], [10, 28800]]],
            [5, 75000, -45, 'bank', 'TRX-1010', [[11, 75000]]],
            [0, 10000, -1, 'bank', 'TRX-1061', [[0, 10000]]],
        ];

        $pdo->beginTransaction();
        try {
            $customerStmt = $pdo->prepare(
                'INSERT INTO customers (name, email, city, currency, created_at) VALUES (?, ?, ?, ?, ?)'
            );
            $customerIds = [];
            foreach ($customers as $customer) {
                $customerStmt->execute([$customer[0], $customer[1], $customer[2], 'NPR', $date(-200)]);
                $customerIds[] = (int) $pdo->lastInsertId();
            }

            $invoiceStmt = $pdo->prepare(
                'INSERT INTO invoices (customer_id, number, issue_date, due_date, currency, tax_rate_bp, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $itemStmt = $pdo->prepare(
                'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_minor, position)
                 VALUES (?, ?, ?, ?, ?)'
            );
            $invoiceIds = [];
            foreach ($invoices as $index => $invoice) {
                $invoiceStmt->execute([
                    $customerIds[$invoice[0]],
                    sprintf('LB-%04d', 1001 + $index),
                    $date($invoice[1]),
                    $date($invoice[2]),
                    'NPR',
                    $invoice[3],
                    null,
                ]);
                $invoiceId = (int) $pdo->lastInsertId();
                $invoiceIds[] = $invoiceId;
                foreach ($invoice[4] as $position => $item) {
                    $itemStmt->execute([$invoiceId, $item[0], $item[1], $item[2], $position]);
                }
            }

            $paymentStmt = $pdo->prepare(
                'INSERT INTO payments (customer_id, amount_minor, paid_on, method, reference) VALUES (?, ?, ?, ?, ?)'
            );
            $allocationStmt = $pdo->prepare(
                'INSERT INTO payment_allocations (payment_id, invoice_id, amount_minor) VALUES (?, ?, ?)'
            );
            foreach ($payments as $payment) {
                $paymentStmt->execute([
                    $customerIds[$payment[0]],
                    $payment[1],
                    $date($payment[2]),
                    $payment[3],
                    $payment[4],
                ]);
                $paymentId = (int) $pdo->lastInsertId();
                foreach ($payment[5] as $allocation) {
                    $allocationStmt->execute([$paymentId, $invoiceIds[$allocation[0]], $allocation[1]]);
                }
            }

            $pdo->commit();
        } catch (\Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }
    }
}

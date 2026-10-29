<?php

declare(strict_types=1);

namespace Ledgerbox;

/**
 * CSV rendering.
 *
 * fputcsv handles quoting and embedded newlines, which a hand-rolled implode
 * gets wrong as soon as a customer name contains a comma. Amounts are exported
 * as plain decimals in the invoice currency, not as formatted strings with a
 * symbol, so the file can be imported by a spreadsheet or an accounting tool.
 */
final class Csv
{
    /**
     * @param list<string> $headers
     * @param list<list<string|int|float|null>> $rows
     */
    public static function render(array $headers, array $rows): string
    {
        $handle = fopen('php://temp', 'r+');
        if ($handle === false) {
            throw new \RuntimeException('Could not open a temporary stream for CSV output');
        }

        fputcsv($handle, $headers, ',', '"', '\\');
        foreach ($rows as $row) {
            fputcsv($handle, $row, ',', '"', '\\');
        }
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return $csv === false ? '' : $csv;
    }

    public static function send(string $filename, string $csv): never
    {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . strlen($csv));
        echo $csv;
        exit;
    }
}

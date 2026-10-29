<?php

declare(strict_types=1);

/**
 * Shared bootstrap for the web front controller and the test runner.
 *
 * No Composer: the autoloader maps one namespace to this directory. That is
 * enough for twenty classes and keeps `bash scripts/test.sh` runnable on a bare
 * PHP install.
 */
require_once __DIR__ . '/helpers.php';

spl_autoload_register(static function (string $class): void {
    $prefix = 'Ledgerbox\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $file = __DIR__ . '/' . substr($class, strlen($prefix)) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

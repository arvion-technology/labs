<?php

declare(strict_types=1);

namespace Ledgerbox;

use RuntimeException;

/**
 * Template rendering with plain PHP files and an optional layout.
 *
 * Views receive their data as local variables via extract() and are included
 * inside an output buffer. That is the whole engine. Errors in a template throw,
 * so a broken view fails loudly instead of producing half a page.
 */
final class View
{
    public function __construct(private readonly string $root)
    {
    }

    /** @param array<string, mixed> $data */
    public function render(string $template, array $data = [], ?string $layout = 'layout'): string
    {
        $content = $this->capture($template, $data);
        if ($layout === null) {
            return $content;
        }

        return $this->capture($layout, $data + ['content' => $content]);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function capture(string $template, array $data): string
    {
        $path = $this->root . '/' . $template . '.php';
        if (!is_file($path)) {
            throw new RuntimeException("View not found: {$template}");
        }

        extract($data, EXTR_SKIP);
        ob_start();
        try {
            require $path;

            return (string) ob_get_clean();
        } catch (\Throwable $error) {
            ob_end_clean();
            throw $error;
        }
    }
}

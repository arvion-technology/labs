<?php

declare(strict_types=1);

namespace Ledgerbox;

/**
 * A very small router.
 *
 * Patterns support `{name}` segments and static paths. There are no middleware,
 * route groups or regex routes, because the app has eleven routes and a larger
 * router would be more code than the app it routes for.
 */
final class Router
{
    /** @var list<array{method: string, pattern: string, regex: string, handler: callable}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $normalized = rtrim($pattern, '/') ?: '/';
        $quoted = preg_quote($normalized, '#');
        $regex = preg_replace('#\\\\\{([a-zA-Z_][a-zA-Z0-9_]*)\\\\\}#', '(?P<$1>[^/]+)', $quoted);
        if ($regex === null) {
            throw new \RuntimeException('Could not compile route pattern');
        }

        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $normalized,
            'regex' => '#^' . $regex . '$#',
            'handler' => $handler,
        ];
    }

    /**
     * @return array{handler: callable, params: array<string, string>}
     */
    public function dispatch(string $method, string $path): array
    {
        $clean = parse_url($path, PHP_URL_PATH) ?: '/';
        $clean = rtrim($clean, '/') ?: '/';
        $method = strtoupper($method);

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }
            if (preg_match($route['regex'], $clean, $matches) !== 1) {
                continue;
            }
            $params = [];
            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $params[$key] = rawurldecode((string) $value);
                }
            }

            return ['handler' => $route['handler'], 'params' => $params];
        }

        throw new HttpNotFoundException("No route for {$method} {$clean}");
    }

    /** @return list<array{method: string, pattern: string}> */
    public function routes(): array
    {
        return array_map(
            static fn (array $route): array => ['method' => $route['method'], 'pattern' => $route['pattern']],
            $this->routes,
        );
    }
}

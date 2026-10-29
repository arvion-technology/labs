<?php

declare(strict_types=1);

namespace Ledgerbox;

/** Thrown by the router when no route matches; the front controller renders a 404. */
final class HttpNotFoundException extends \RuntimeException
{
}

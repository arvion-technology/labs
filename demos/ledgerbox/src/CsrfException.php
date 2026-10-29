<?php

declare(strict_types=1);

namespace Ledgerbox;

/** A POST failed the session token check; the front controller answers 419. */
final class CsrfException extends \RuntimeException
{
}

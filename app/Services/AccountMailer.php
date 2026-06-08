<?php

namespace App\Services;

use App\Mail\ProposalHtmlMail;
use Illuminate\Support\Facades\Mail;
use InvalidArgumentException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class AccountMailer
{
    public static function isConfigured(?array $email): bool
    {
        if (! is_array($email)) {
            return false;
        }

        return filled($email['smtpHost'] ?? null)
            && filled($email['smtpUser'] ?? null)
            && filled($email['fromEmail'] ?? null)
            && filled($email['smtpPassword'] ?? null);
    }

    /**
     * @throws InvalidArgumentException
     */
    public static function send(?array $email, string $to, string $subject, string $html, array $cc = []): void
    {
        if (! self::isConfigured($email)) {
            throw new InvalidArgumentException(
                'SMTP is not fully configured. Open Settings → Email Config and save your SMTP details.'
            );
        }

        $port = (int) ($email['smtpPort'] ?? 587);
        $encryption = $email['smtpEncryption'] ?? 'tls';
        if ($encryption === 'none') {
            $encryption = null;
        }

        config([
            'mail.default' => 'account_smtp',
            'mail.mailers.account_smtp' => [
                'transport' => 'smtp',
                'host' => $email['smtpHost'],
                'port' => $port,
                'encryption' => $encryption,
                'username' => $email['smtpUser'],
                'password' => $email['smtpPassword'],
                'timeout' => 30,
            ],
        ]);

        $fromAddress = $email['fromEmail'];
        $fromName = $email['fromName'] ?? '';

        // Validate and de-duplicate CC addresses; also remove To address from CC
        $validCc = array_values(array_filter(
            $cc,
            fn ($addr) => is_string($addr)
                && filter_var($addr, FILTER_VALIDATE_EMAIL)
                && $addr !== $to
        ));

        try {
            $mailer = Mail::mailer('account_smtp')->to($to);

            if (! empty($validCc)) {
                $mailer = $mailer->cc($validCc);
            }

            $mailer->send(new ProposalHtmlMail($subject, $html, $fromAddress, $fromName));
        } catch (TransportExceptionInterface $e) {
            throw new InvalidArgumentException(
                'Could not send email. Check SMTP host, port, username, password, and encryption in Settings.',
                previous: $e
            );
        }
    }
}

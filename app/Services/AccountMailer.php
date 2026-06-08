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

        try {
            Mail::mailer('account_smtp')
                ->to($to)
                ->send(new ProposalHtmlMail($subject, $html, $fromAddress, $fromName, $cc));
        } catch (TransportExceptionInterface $e) {
            throw new InvalidArgumentException(
                'Could not send email. Check SMTP host, port, username, password, and encryption in Settings.',
                previous: $e
            );
        }
    }
}

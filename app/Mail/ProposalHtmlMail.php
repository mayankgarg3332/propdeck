<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProposalHtmlMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $mailSubject,
        public string $htmlBody,
        public string $fromAddress,
        public string $fromName = '',
        public array $cc = [],
    ) {}

    public function envelope(): Envelope
    {
        $cc = array_map(
            fn (string $addr) => new Address($addr),
            array_filter($this->cc, fn ($a) => filter_var($a, FILTER_VALIDATE_EMAIL))
        );

        return new Envelope(
            from: new Address($this->fromAddress, $this->fromName),
            cc: array_values($cc),
            subject: $this->mailSubject,
        );
    }

    public function content(): Content
    {
        return new Content(htmlString: $this->htmlBody);
    }
}

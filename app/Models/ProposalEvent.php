<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['proposal_id', 'user_id', 'type', 'meta'])]
class ProposalEvent extends Model
{
    public $timestamps = false;

    const TYPE_EMAILED = 'emailed';

    const TYPE_GMAIL_OPENED = 'gmail_opened';

    const TYPE_PDF_DOWNLOADED = 'pdf_downloaded';

    const TYPE_WHATSAPP_SHARED = 'whatsapp_shared';

    const TYPE_PUBLIC_VIEWED = 'link_viewed';

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function booted(): void
    {
        static::creating(function (self $event) {
            $event->created_at ??= now();
        });
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Proposal extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'user_id', 'created_by_user_id', 'client_id', 'products', 'amount', 'subtotal', 'gst', 'status',
        'date', 'rep_id', 'frequency', 'extras_heading', 'extras_text', 'line_items_snapshot', 'status_updated_at', 'created_at_custom',
    ];

    protected function casts(): array
    {
        return [
            'products' => 'array',
            'line_items_snapshot' => 'array',
            'date' => 'date',
            'amount' => 'float',
            'subtotal' => 'float',
            'gst' => 'float',
            'status_updated_at' => 'datetime',
            'created_at_custom' => 'datetime',
        ];
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }
}

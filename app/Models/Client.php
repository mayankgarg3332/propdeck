<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'user_id', 'created_by_user_id', 'agency', 'contact', 'email', 'phone', 'city', 'state', 'gst', 'notes',
    ];

    public function proposals()
    {
        return $this->hasMany(Proposal::class, 'client_id');
    }
}

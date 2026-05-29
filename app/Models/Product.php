<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id', 'user_id', 'created_by_user_id', 'name', 'category', 'color', 'description', 'plans',
    ];

    protected function casts(): array
    {
        return [
            'plans' => 'array',
        ];
    }
}

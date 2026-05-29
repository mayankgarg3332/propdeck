<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rep extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'user_id', 'name', 'email', 'phone', 'role'];
}

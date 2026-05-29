<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPermission extends Model
{
    public const SECTION_CLIENTS = 'clients';

    public const SECTION_PROPOSALS = 'proposals';

    public const SECTION_PRODUCTS = 'products';

    public const SECTION_SETTINGS_COMPANY = 'settings_company';

    public const SECTION_SETTINGS_PAYMENT = 'settings_payment';

    public const SECTION_SETTINGS_EMAIL = 'settings_email';

    public const SECTION_SETTINGS_DEFAULTS = 'settings_defaults';

    /** Company fields sub-users may edit when they have settings_company write. */
    public static function companySubUserWritableFields(): array
    {
        return ['signatory', 'designation', 'phone', 'email', 'about'];
    }

    public static function sections(): array
    {
        return [
            self::SECTION_CLIENTS,
            self::SECTION_PROPOSALS,
            self::SECTION_PRODUCTS,
            self::SECTION_SETTINGS_COMPANY,
            self::SECTION_SETTINGS_PAYMENT,
            self::SECTION_SETTINGS_EMAIL,
            self::SECTION_SETTINGS_DEFAULTS,
        ];
    }

    protected $fillable = [
        'user_id',
        'section',
        'can_read',
        'can_write',
    ];

    protected function casts(): array
    {
        return [
            'can_read' => 'boolean',
            'can_write' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

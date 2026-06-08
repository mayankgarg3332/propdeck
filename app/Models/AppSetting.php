<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $table = 'app_settings';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'user_id', 'company', 'payment', 'email', 'defaults'];

    public static function accountKey(int $accountId): string
    {
        return 'default:'.$accountId;
    }

    public static function userKey(int $userId): string
    {
        return 'user:'.$userId;
    }

    public static function findForAccount(int $accountId): ?self
    {
        $scoped = static::query()->where('user_id', $accountId)->first();
        if ($scoped) {
            return $scoped;
        }

        return static::query()->find(static::accountKey($accountId));
    }

    public static function findForUser(int $userId): ?self
    {
        $scoped = static::query()->where('user_id', $userId)->first();
        if ($scoped) {
            return $scoped;
        }

        return static::query()->find(static::userKey($userId));
    }

    /**
     * Load or create settings for an account (one row per user_id; id is unique per account).
     */
    public static function forAccount(int $accountId): self
    {
        $key = static::accountKey($accountId);

        $settings = static::findForAccount($accountId);
        if ($settings) {
            if ($settings->id !== $key && ! static::query()->where('id', $key)->exists()) {
                $settings->id = $key;
                $settings->user_id = $accountId;
                $settings->save();
            }

            return $settings->fresh();
        }

        return static::query()->firstOrNew(
            ['id' => $key],
            [
                'user_id' => $accountId,
                'company' => [],
                'payment' => [],
                'email' => [],
                'defaults' => [],
            ],
        );
    }

    /**
     * Load or create settings for a specific user (per-user settings overrides).
     */
    public static function forUser(int $userId): self
    {
        $key = static::userKey($userId);

        $settings = static::findForUser($userId);
        if ($settings) {
            if ($settings->id !== $key && ! static::query()->where('id', $key)->exists()) {
                $settings->id = $key;
                $settings->user_id = $userId;
                $settings->save();
            }

            return $settings->fresh();
        }

        return static::query()->firstOrNew(
            ['id' => $key],
            [
                'user_id' => $userId,
                'company' => [],
                'payment' => [],
                'email' => [],
                'defaults' => [],
            ],
        );
    }

    public function publicId(): string
    {
        return 'default';
    }

    protected function casts(): array
    {
        return [
            'company' => 'array',
            'payment' => 'array',
            'email' => 'array',
            'defaults' => 'array',
        ];
    }
}

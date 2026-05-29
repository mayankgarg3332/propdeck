<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

#[Fillable(['name', 'email', 'password', 'api_token', 'parent_user_id'])]
#[Hidden(['password', 'remember_token', 'api_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    public function subUsers(): HasMany
    {
        return $this->hasMany(User::class, 'parent_user_id');
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(UserPermission::class);
    }

    public function isAccountOwner(): bool
    {
        return $this->parent_user_id === null;
    }

    public function accountUserId(): int
    {
        return $this->parent_user_id ?? $this->id;
    }

    public function canRead(string $section): bool
    {
        if ($this->isAccountOwner()) {
            return true;
        }

        $permission = $this->relationLoaded('permissions')
            ? $this->permissions->firstWhere('section', $section)
            : $this->permissions()->where('section', $section)->first();

        return (bool) ($permission?->can_read);
    }

    public function canWrite(string $section): bool
    {
        if ($this->isAccountOwner()) {
            return true;
        }

        $permission = $this->relationLoaded('permissions')
            ? $this->permissions->firstWhere('section', $section)
            : $this->permissions()->where('section', $section)->first();

        return (bool) ($permission?->can_write);
    }

    public function permissionsPayload(): array
    {
        if ($this->isAccountOwner()) {
            return collect(UserPermission::sections())->mapWithKeys(fn ($section) => [
                $section => ['read' => true, 'write' => true],
            ])->all();
        }

        $map = collect(UserPermission::sections())->mapWithKeys(fn ($section) => [
            $section => ['read' => false, 'write' => false],
        ])->all();

        foreach ($this->permissions as $permission) {
            $map[$permission->section] = [
                'read' => $permission->can_read,
                'write' => $permission->can_write,
            ];
        }

        return $map;
    }

    public function issueApiToken(): string
    {
        $token = Str::random(60);

        $this->forceFill(['api_token' => hash('sha256', $token)])->save();

        return $token;
    }

    public function clearApiToken(): void
    {
        $this->forceFill(['api_token' => null])->save();
    }

    public static function findByApiToken(string $plainToken): ?self
    {
        return static::with('permissions')
            ->where('api_token', hash('sha256', $plainToken))
            ->first();
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}

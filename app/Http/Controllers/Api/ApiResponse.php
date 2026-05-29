<?php

namespace App\Http\Controllers\Api;

use App\Models\AppSetting;
use App\Models\Client;
use App\Models\Product;
use App\Models\Proposal;
use App\Models\Rep;
use App\Models\User;
use App\Models\UserPermission;
use App\Services\AccountMailer;
use Illuminate\Support\Collection;

trait ApiResponse
{
    protected function clientPayload(Client $client): array
    {
        return $client->only([
            'id', 'agency', 'contact', 'email', 'phone', 'city', 'state', 'gst', 'notes',
        ]);
    }

    protected function productPayload(Product $product): array
    {
        return $product->only(['id', 'name', 'category', 'color', 'description', 'plans']);
    }

    protected function proposalPayload(Proposal $proposal): array
    {
        return [
            'id' => $proposal->id,
            'clientId' => $proposal->client_id,
            'products' => $proposal->products,
            'amount' => $proposal->amount,
            'subtotal' => $proposal->subtotal,
            'gst' => $proposal->gst,
            'status' => $proposal->status,
            'date' => $proposal->date?->format('Y-m-d'),
            'repId' => $proposal->rep_id,
            'frequency' => $proposal->frequency,
            'extrasHeading' => $proposal->extras_heading,
            'extrasText' => $proposal->extras_text,
            'lineItemsSnapshot' => $proposal->line_items_snapshot,
            'statusUpdatedAt' => $proposal->status_updated_at?->toIso8601String(),
            'createdAt' => $proposal->created_at_custom?->toIso8601String()
                ?? $proposal->created_at?->toIso8601String(),
            'updatedAt' => $proposal->updated_at?->toIso8601String(),
        ];
    }

    protected function settingsPayload(?AppSetting $settings): ?array
    {
        if (! $settings) {
            return null;
        }

        return [
            'id' => $settings->publicId(),
            'company' => $settings->company,
            'payment' => $settings->payment,
            'email' => $this->emailSettingsPayload($settings->email),
            'defaults' => $settings->defaults,
        ];
    }

    protected function filteredSettingsPayload(?AppSetting $settings, User $user): ?array
    {
        if (! $settings) {
            return null;
        }

        $full = $this->settingsPayload($settings);

        if ($user->isAccountOwner()) {
            return $full;
        }

        $result = ['id' => $full['id']];
        $sectionMap = [
            'company' => UserPermission::SECTION_SETTINGS_COMPANY,
            'payment' => UserPermission::SECTION_SETTINGS_PAYMENT,
            'email' => UserPermission::SECTION_SETTINGS_EMAIL,
            'defaults' => UserPermission::SECTION_SETTINGS_DEFAULTS,
        ];

        foreach ($sectionMap as $key => $section) {
            if ($user->canRead($section) && array_key_exists($key, $full)) {
                $result[$key] = $full[$key];
            }
        }

        if ($user->canRead('proposals')) {
            foreach (['company', 'payment', 'defaults'] as $key) {
                if (! isset($result[$key]) && array_key_exists($key, $full)) {
                    $result[$key] = $full[$key];
                }
            }
            if ($user->canWrite('proposals') && ! isset($result['email']) && array_key_exists('email', $full)) {
                $result['email'] = $full['email'];
            }
        }

        return $result;
    }

    protected function emailSettingsPayload(?array $email): ?array
    {
        if (! is_array($email)) {
            return null;
        }

        $payload = $email;
        unset($payload['smtpPassword']);

        $payload['smtpConfigured'] = AccountMailer::isConfigured($email);

        return $payload;
    }

    protected function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'isAccountOwner' => $user->isAccountOwner(),
            'permissions' => $user->permissionsPayload(),
        ];
    }

    protected function subUserPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'permissions' => $user->permissionsPayload(),
            'createdAt' => $user->created_at?->toIso8601String(),
        ];
    }

    protected function appState(User $user): array
    {
        $accountId = $user->accountUserId();

        $clients = $user->canRead('clients')
            ? Client::where('user_id', $accountId)->orderBy('agency')->get()
            : collect();

        $products = $user->canRead('products')
            ? Product::where('user_id', $accountId)->orderBy('name')->get()
            : collect();

        $proposals = $user->canRead('proposals')
            ? Proposal::where('user_id', $accountId)->orderByDesc('date')->get()
            : collect();

        $settings = AppSetting::findForAccount($accountId);
        $rep = Rep::where('user_id', $accountId)->first();

        return [
            'clients' => $clients->map(fn ($c) => $this->clientPayload($c))->values(),
            'products' => $products->map(fn ($p) => $this->productPayload($p))->values(),
            'proposals' => $proposals->map(fn ($p) => $this->proposalPayload($p))->values(),
            'settings' => $this->filteredSettingsPayload($settings, $user),
            'rep' => $rep?->only(['id', 'name', 'email', 'phone', 'role']),
            'nextProposalId' => $this->nextProposalId($accountId, $settings),
            'permissions' => $user->permissionsPayload(),
            'isAccountOwner' => $user->isAccountOwner(),
        ];
    }

    protected function nextProposalId(int $accountId, ?AppSetting $settings): string
    {
        $defaults = $settings?->defaults ?? [];
        $prefix = trim((string) ($defaults['proposalPrefix'] ?? '')) ?: 'TC';
        $startNumber = max(1, (int) ($defaults['proposalStartNumber'] ?? 1));
        $year = (int) date('Y');

        // Proposal `id` is a global primary key — reserve the next number across all accounts.
        $existingIds = Proposal::query()
            ->where('id', 'like', "{$prefix}-{$year}-%")
            ->pluck('id')
            ->all();

        $candidate = $startNumber;
        while (in_array("{$prefix}-{$year}-{$candidate}", $existingIds, true)) {
            $candidate++;
        }

        return "{$prefix}-{$year}-{$candidate}";
    }
}

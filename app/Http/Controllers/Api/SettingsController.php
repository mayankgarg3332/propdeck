<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesAccount;
use App\Models\AppSetting;
use App\Models\UserPermission;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    use ApiResponse;
    use AuthorizesAccount;

    public function update(Request $request)
    {
        $user = $this->currentUser($request);

        $data = $request->validate([
            'id' => 'sometimes|string|max:64',
            'company' => 'sometimes|array',
            'payment' => 'sometimes|array',
            'email' => 'sometimes|array',
            'defaults' => 'sometimes|array',
        ]);

        if ($request->has('company')) {
            $this->authorizeSection($request, UserPermission::SECTION_SETTINGS_COMPANY, 'write');
        }
        if ($request->has('payment')) {
            $this->authorizeSection($request, UserPermission::SECTION_SETTINGS_PAYMENT, 'write');
        }
        if ($request->has('email')) {
            $this->authorizeSection($request, UserPermission::SECTION_SETTINGS_EMAIL, 'write');
        }
        if ($request->has('defaults')) {
            $this->authorizeSection($request, UserPermission::SECTION_SETTINGS_DEFAULTS, 'write');
        }

        if (! $request->hasAny(['company', 'payment', 'email', 'defaults'])) {
            abort(422, 'No settings sections to update.');
        }

        $accountId = $this->accountUserId($request);

        $settings = AppSetting::forAccount($accountId);
        $settings->user_id = $accountId;

        if ($request->has('company')) {
            $settings->company = $this->mergeCompanyUpdate(
                is_array($settings->company) ? $settings->company : [],
                $data['company'],
                $user->isAccountOwner(),
            );
        }

        if ($request->has('payment')) {
            $settings->payment = $data['payment'];
        }

        if ($request->has('defaults')) {
            $settings->defaults = $data['defaults'];
        }

        if ($request->has('email')) {
            $incoming = $data['email'];
            $existing = is_array($settings->email) ? $settings->email : [];

            if (empty($incoming['smtpPassword'] ?? '')) {
                unset($incoming['smtpPassword']);
            }

            $settings->email = array_merge($existing, $incoming);
        }

        $settings->save();

        return response()->json(
            $this->filteredSettingsPayload($settings->fresh(), $user),
        );
    }

    protected function mergeCompanyUpdate(array $existing, array $incoming, bool $isOwner): array
    {
        if ($isOwner) {
            return $incoming;
        }

        $merged = $existing;
        foreach (UserPermission::companySubUserWritableFields() as $field) {
            if (array_key_exists($field, $incoming)) {
                $merged[$field] = $incoming[$field];
            }
        }

        return $merged;
    }
}

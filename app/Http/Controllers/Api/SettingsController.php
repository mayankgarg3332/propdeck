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
            if ($user->isAccountOwner()) {
                $this->authorizeAccountOwner($request);
            } else {
                $this->authorizeSection($request, UserPermission::SECTION_SETTINGS_SALES, 'write');
            }
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

        $accountSettings = null;
        $userSettings = null;

        if ($request->has('company')) {
            if ($user->isAccountOwner()) {
                $accountSettings = AppSetting::forAccount($accountId);
                $accountSettings->user_id = $accountId;
                $accountSettings->company = $data['company'];
                $accountSettings->save();
            } else {
                $userSettings = AppSetting::forUser($user->id);
                $userSettings->user_id = $user->id;
                $existing = is_array($userSettings->company) ? $userSettings->company : [];
                $userSettings->company = $this->mergeSalesUpdate($existing, $data['company']);
                $userSettings->save();
            }
        }

        if ($request->has('payment')) {
            $userSettings = $userSettings ?: AppSetting::forUser($user->id);
            $userSettings->user_id = $user->id;
            $userSettings->payment = $data['payment'];
            $userSettings->save();
        }

        if ($request->has('defaults')) {
            $userSettings = $userSettings ?: AppSetting::forUser($user->id);
            $userSettings->user_id = $user->id;
            $userSettings->defaults = $data['defaults'];
            $userSettings->save();
        }

        if ($request->has('email')) {
            $userSettings = $userSettings ?: AppSetting::forUser($user->id);
            $userSettings->user_id = $user->id;

            $incoming = $data['email'];
            $existing = is_array($userSettings->email) ? $userSettings->email : [];

            if (empty($incoming['smtpPassword'] ?? '')) {
                unset($incoming['smtpPassword']);
            }

            $userSettings->email = array_merge($existing, $incoming);
            $userSettings->save();
        }

        // Return merged settings for the current user
        $freshAccount = AppSetting::findForAccount($accountId);
        $freshUser = AppSetting::findForUser($user->id);
        $merged = $this->mergeEffectiveSettings($freshAccount, $freshUser);

        return response()->json($this->filteredSettingsPayload($merged, $user));
    }

    protected function mergeSalesUpdate(array $existing, array $incoming): array
    {
        $merged = $existing;
        foreach (UserPermission::salesUserFields() as $field) {
            if (array_key_exists($field, $incoming)) {
                $merged[$field] = $incoming[$field];
            }
        }

        return $merged;
    }
}

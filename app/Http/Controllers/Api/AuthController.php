<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Rep;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponse;

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:191|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'parent_user_id' => null,
        ]);

        $this->bootstrapAccount($user);

        $user->load('permissions');
        $plainToken = $user->issueApiToken();

        return response()->json([
            'token' => $plainToken,
            'user' => $this->userPayload($user),
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::with('permissions')->where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $plainToken = $user->issueApiToken();

        return response()->json([
            'token' => $plainToken,
            'user' => $this->userPayload($user),
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->load('permissions');

        return response()->json($this->userPayload($user));
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            $user->clearApiToken();
        }

        return response()->json(['message' => 'Logged out']);
    }

    protected function bootstrapAccount(User $user): void
    {
        AppSetting::firstOrCreate(
            ['id' => AppSetting::accountKey($user->id)],
            [
                'user_id' => $user->id,
                'company' => [],
                'payment' => [],
                'email' => [],
                'defaults' => [
                    'gstRate' => 18,
                    'validityDays' => 7,
                    'proposalPrefix' => 'TC',
                    'proposalStartNumber' => 1,
                    'maxRepDiscount' => 30,
                    'kyc' => [],
                    'terms' => [],
                ],
            ],
        );

        Rep::firstOrCreate(
            ['id' => 'rep_'.$user->id, 'user_id' => $user->id],
            [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => '',
                'role' => 'Sales Rep',
            ],
        );
    }
}

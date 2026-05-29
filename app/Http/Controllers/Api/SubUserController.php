<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesAccount;
use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class SubUserController extends Controller
{
    use ApiResponse;
    use AuthorizesAccount;

    public function index(Request $request)
    {
        $this->authorizeAccountOwner($request);

        $subUsers = User::with('permissions')
            ->where('parent_user_id', $this->currentUser($request)->id)
            ->orderBy('name')
            ->get();

        return response()->json(
            $subUsers->map(fn ($u) => $this->subUserPayload($u))->values()
        );
    }

    public function store(Request $request)
    {
        $this->authorizeAccountOwner($request);

        $data = $request->validate(array_merge([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:191|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'permissions' => 'required|array',
        ], $this->permissionValidationRules(required: true)));

        $owner = $this->currentUser($request);

        $subUser = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'parent_user_id' => $owner->id,
        ]);

        $this->syncPermissions($subUser, $data['permissions']);

        $subUser->load('permissions');

        return response()->json($this->subUserPayload($subUser), 201);
    }

    public function update(Request $request, int $id)
    {
        $this->authorizeAccountOwner($request);
        $subUser = $this->findOwnedSubUser($request, $id);

        $data = $request->validate(array_merge([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', 'max:191', Rule::unique('users', 'email')->ignore($subUser->id)],
            'password' => 'nullable|string|min:8|confirmed',
            'permissions' => 'sometimes|array',
        ], $this->permissionValidationRules(required: false)));

        if (isset($data['name'])) {
            $subUser->name = $data['name'];
        }
        if (isset($data['email'])) {
            $subUser->email = $data['email'];
        }
        if (! empty($data['password'])) {
            $subUser->password = $data['password'];
        }
        $subUser->save();

        if (isset($data['permissions'])) {
            $this->syncPermissions($subUser, $data['permissions']);
        }

        $subUser->load('permissions');

        return response()->json($this->subUserPayload($subUser->fresh()));
    }

    public function destroy(Request $request, int $id)
    {
        $this->authorizeAccountOwner($request);
        $this->findOwnedSubUser($request, $id)->delete();

        return response()->json(null, 204);
    }

    protected function findOwnedSubUser(Request $request, int $id): User
    {
        return User::where('parent_user_id', $this->currentUser($request)->id)->findOrFail($id);
    }

    protected function syncPermissions(User $subUser, array $permissions): void
    {
        foreach (UserPermission::sections() as $section) {
            $sectionPerms = $permissions[$section] ?? [];
            $canRead = (bool) ($sectionPerms['read'] ?? false);
            $canWrite = (bool) ($sectionPerms['write'] ?? false);

            if ($canWrite) {
                $canRead = true;
            }

            UserPermission::updateOrCreate(
                ['user_id' => $subUser->id, 'section' => $section],
                ['can_read' => $canRead, 'can_write' => $canWrite],
            );
        }
    }

    protected function permissionValidationRules(bool $required): array
    {
        $rules = [];
        $prefix = $required ? 'required' : 'sometimes';

        foreach (UserPermission::sections() as $section) {
            $rules["permissions.{$section}"] = "{$prefix}|array";
            $rules["permissions.{$section}.read"] = 'boolean';
            $rules["permissions.{$section}.write"] = 'boolean';
        }

        return $rules;
    }
}

<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\Client;
use App\Models\Product;
use App\Models\Proposal;
use App\Models\User;
use Illuminate\Http\Request;

trait AuthorizesAccount
{
    protected function currentUser(Request $request): User
    {
        return $request->user();
    }

    protected function accountUserId(Request $request): int
    {
        return $this->currentUser($request)->accountUserId();
    }

    protected function authorizeSection(Request $request, string $section, string $ability = 'read'): void
    {
        $user = $this->currentUser($request);
        $allowed = $ability === 'write'
            ? $user->canWrite($section)
            : $user->canRead($section);

        if (! $allowed) {
            abort(403, 'You do not have permission for this action.');
        }
    }

    protected function authorizeAccountOwner(Request $request): void
    {
        if (! $this->currentUser($request)->isAccountOwner()) {
            abort(403, 'Only the account owner can manage team members.');
        }
    }

    protected function findAccountClient(Request $request, string $id): Client
    {
        return Client::where('user_id', $this->accountUserId($request))->findOrFail($id);
    }

    protected function findAccountProduct(Request $request, string $id): Product
    {
        return Product::where('user_id', $this->accountUserId($request))->findOrFail($id);
    }

    protected function findAccountProposal(Request $request, string $id): Proposal
    {
        return Proposal::where('user_id', $this->accountUserId($request))->findOrFail($id);
    }
}
